import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCoachingEngine } from "./coachingEngine.js";

export type TodaysVerdict = {
  verdict: string;
  state: "green" | "yellow" | "red";
  confidence: string;
  rationale: string;
  signals: Array<{ name: string; value: unknown; status: string }>;
  asOfDate: string;
};

export async function getTodaysVerdict(
  supabase: SupabaseClient,
  userId: string
): Promise<TodaysVerdict> {
  const today = new Date().toISOString().slice(0, 10);
  const coaching = await loadCoachingEngine();

  const snapshot = await coaching.buildAthleteStateSnapshot(supabase, userId, today);
  const states = coaching.interpretPhysiologicalStates(snapshot);
  const decision = coaching.evaluateTrainingCompatibility(states, snapshot);

  return {
    verdict: decision.label,
    state: decision.state,
    confidence: decision.confidence.label,
    rationale: decision.rationale,
    signals: decision.signalsConsidered,
    asOfDate: today,
  };
}
