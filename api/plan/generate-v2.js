import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { getAccessTokenFromRequest } from "../lib/sessionToken.js";
import { generateSkeleton, PLAN_GENERATION_MODEL } from "./lib/generateSkeleton.js";
import { generateWeeklyScaffolding } from "./lib/generateWeeklyScaffolding.js";
import { persistWeeklyStructure } from "./lib/persistWeeklyStructure.js";
import { generateWeek1Details } from "./lib/generateWeek1Details.js";

function serviceSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const requestId = req.body?.requestId;
  const supabase = serviceSupabase();

  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) return res.status(401).json({ error: "no_auth" });

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "missing_anthropic_api_key" });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: "invalid_token" });

    if (!requestId) return res.status(400).json({ error: "missing_request_id" });

    const { data: request, error: reqErr } = await supabase
      .from("plan_generation_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .single();

    if (reqErr || !request) return res.status(400).json({ error: "request_not_found" });
    if (request.status !== "intake_complete") {
      return res.status(400).json({ error: "invalid_request_state" });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const ctx = request.generation_context || {};

    await supabase
      .from("plan_generation_requests")
      .update({ status: "generating", stage: "generating_skeleton" })
      .eq("id", requestId);

    const skeleton = await generateSkeleton(anthropic, ctx, request);
    const blockWeeks = Math.max(1, Math.min(52, Number(skeleton.block_length_weeks) || 8));
    console.log("[generate-v2] skeleton complete:", blockWeeks, "weeks,", (skeleton.phases || []).length, "phases");

    const { data: variant, error: variantErr } = await supabase
      .from("plan_variants")
      .insert({
        user_id: user.id,
        variant_name: skeleton.variant_name || "AI training plan",
        variant_source: "ai_generated",
        block_length_weeks: blockWeeks,
        phases: skeleton.phases || [],
        weekly_pattern: skeleton.weekly_pattern || {},
        training_priorities: skeleton.training_priorities || [],
        generation_context: ctx,
        generation_reasoning: skeleton.reasoning || {},
        generation_model: PLAN_GENERATION_MODEL,
        is_active: false,
        current_week: 1,
      })
      .select()
      .single();

    if (variantErr) throw new Error(`variant_insert_failed: ${variantErr.message}`);

    await supabase
      .from("plan_generation_requests")
      .update({ stage: "generating_weeks", variant_id: variant.id })
      .eq("id", requestId);

    const weeks = await generateWeeklyScaffolding(anthropic, ctx, skeleton);
    if (!Array.isArray(weeks) || weeks.length === 0) {
      throw new Error("weeks_empty");
    }

    const trimmedWeeks =
      weeks.length > blockWeeks ? weeks.slice(0, blockWeeks) : weeks;
    if (trimmedWeeks.length < blockWeeks) {
      throw new Error(`weeks_incomplete: got ${trimmedWeeks.length}, need ${blockWeeks}`);
    }

    console.log("[generate-v2] weeks complete:", trimmedWeeks.length, "weeks scaffolded");

    const { week1WeekId } = await persistWeeklyStructure(supabase, user.id, variant.id, skeleton, trimmedWeeks);

    await supabase.from("plan_generation_requests").update({ stage: "generating_week1" }).eq("id", requestId);

    const sortedWeeks = [...trimmedWeeks].sort(
      (a, b) => (Number(a.week_number) || 0) - (Number(b.week_number) || 0),
    );
    const week1 = sortedWeeks.find((w) => Number(w.week_number) === 1) || sortedWeeks[0];
    if (!week1) throw new Error("week1_missing");

    await generateWeek1Details(anthropic, ctx, skeleton, week1, supabase, user.id, variant.id, week1WeekId);

    await supabase
      .from("plan_generation_requests")
      .update({ status: "complete", stage: "complete", error: null })
      .eq("id", requestId);

    return res.status(200).json({
      ok: true,
      variant_id: variant.id,
      variant_name: variant.variant_name,
      block_length_weeks: blockWeeks,
      phases_count: (skeleton.phases || []).length,
      reasoning_summary: skeleton.reasoning?.summary || null,
    });
  } catch (err) {
    console.error("[plan/generate-v2] error:", err?.message || err);
    if (requestId) {
      try {
        await supabase
          .from("plan_generation_requests")
          .update({
            status: "failed",
            stage: "failed",
            error: String(err?.message || err).slice(0, 2000),
          })
          .eq("id", requestId);
      } catch (e) {
        console.error("[plan/generate-v2] failed to persist error state:", e?.message);
      }
    }
    return res.status(500).json({ error: err?.message || "generation_failed" });
  }
}
