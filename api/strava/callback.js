import { createClient } from "@supabase/supabase-js";
import { parseCookies, applyStravaTokenCookies } from "./stravaClient.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const APP_BASE_URL = "https://custom-hybrid-training.vercel.app";

export default async function handler(req, res) {
  const { code, state } = req.query;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;

  if (!code) return res.redirect(302, `${APP_BASE_URL}/?error=strava_no_code`);
  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(302, `${APP_BASE_URL}/?error=strava_missing_env`);
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const expectedState = cookies.strava_state;
  const targetUserId = cookies.strava_uid || TARGET_USER_ID;
  if (!expectedState || !state || expectedState !== state) {
    return res.redirect(302, `${APP_BASE_URL}/?error=strava_bad_state`);
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens?.access_token) {
      console.error("[strava/callback] token exchange failed", {
        status: tokenRes.status,
        body: tokens,
      });
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_token_exchange_failed`);
    }

    const expiresAt = Number(tokens.expires_at || 0);
    const { data: existingProfile, error: existingProfileErr } = await supabase
      .from("user_profiles")
      .select("user_id,connected_wearables")
      .eq("user_id", targetUserId)
      .single();
    console.log("[strava/callback] profile lookup", {
      userId: targetUserId,
      found: !!existingProfile,
      error: existingProfileErr?.message || null,
    });

    if (existingProfileErr && existingProfileErr.code !== "PGRST116") {
      console.error("[strava/callback] profile lookup failed", existingProfileErr);
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_profile_read_failed`);
    }
    if (!existingProfile) {
      console.error("[strava/callback] profile row missing", { userId: targetUserId });
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_profile_missing`);
    }

    const existingWearables = existingProfile?.connected_wearables || {};
    const connected = {
      ...existingWearables,
      strava: true,
      strava_connected_at: new Date().toISOString(),
      strava_athlete_id: tokens?.athlete?.id || null,
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token || null,
      strava_token_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
    };

    const { data: connectedUpdate, error: connectedErr } = await supabase
      .from("user_profiles")
      .update({ connected_wearables: connected })
      .eq("user_id", targetUserId)
      .select("user_id");

    console.log("[strava/callback] connected_wearables update response", {
      updatedRows: connectedUpdate?.length || 0,
      error: connectedErr?.message || null,
    });

    if (connectedErr || !connectedUpdate?.length) {
      console.error("[strava/callback] connected_wearables update failed", connectedErr || { userId: targetUserId });
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_profile_write_failed`);
    }

    // Best-effort mirror to dedicated columns if they exist.
    const { error: tokenColumnsErr } = await supabase
      .from("user_profiles")
      .update({
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token || null,
        strava_token_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      })
      .eq("user_id", targetUserId);
    if (tokenColumnsErr) {
      console.warn("[strava/callback] token column mirror skipped", tokenColumnsErr.message);
    }

    const { data: verifyRow, error: verifyErr } = await supabase
      .from("user_profiles")
      .select("user_id,connected_wearables")
      .eq("user_id", targetUserId)
      .single();
    console.log("[strava/callback] verification", {
      userId: targetUserId,
      hasStravaFlag: !!verifyRow?.connected_wearables?.strava,
      hasAccessTokenInWearables: !!verifyRow?.connected_wearables?.strava_access_token,
      error: verifyErr?.message || null,
    });

    applyStravaTokenCookies(res, tokens);
    res.appendHeader("Set-Cookie", "strava_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    res.appendHeader("Set-Cookie", "strava_uid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");

    return res.redirect(302, `${APP_BASE_URL}/?strava_connected=true`);
  } catch (err) {
    console.error("[strava/callback] exception", err);
    return res.redirect(302, `${APP_BASE_URL}/?error=strava_exception`);
  }
}
