import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TARGET_USER_ID = "5285440e-a3dd-4f29-9b09-29715f0a04fc";
const APP_BASE_URL = "https://custom-hybrid-training.vercel.app";

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      out[trimmed] = "";
    } else {
      out[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
    }
  }
  return out;
}

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
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_token_exchange_failed`);
    }

    const expiresAt = Number(tokens.expires_at || 0);
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("connected_wearables")
      .eq("user_id", TARGET_USER_ID)
      .single();
    const existingWearables = existingProfile?.connected_wearables || {};
    const connected = {
      ...existingWearables,
      strava: true,
      strava_connected_at: new Date().toISOString(),
      strava_athlete_id: tokens?.athlete?.id || null,
    };

    const { error: upsertErr } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: TARGET_USER_ID,
          connected_wearables: connected,
          strava_access_token: tokens.access_token,
          strava_refresh_token: tokens.refresh_token || null,
          strava_token_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      return res.redirect(302, `${APP_BASE_URL}/?error=strava_profile_write_failed`);
    }

    const cookieOpts = "Path=/; HttpOnly; Secure; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `strava_access=${tokens.access_token}; ${cookieOpts}; Max-Age=21600`,
      `strava_refresh=${tokens.refresh_token || ""}; ${cookieOpts}; Max-Age=2592000`,
      "strava_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    ]);

    return res.redirect(302, `${APP_BASE_URL}/?strava_connected=true`);
  } catch {
    return res.redirect(302, `${APP_BASE_URL}/?error=strava_exception`);
  }
}
