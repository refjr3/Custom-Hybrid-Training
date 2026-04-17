/**
 * Strava OAuth redirect — must match exactly what is registered for the app at
 * https://www.strava.com/settings/api (callback URL) and the “Authorization Callback Domain”
 * (hostname only: custom-hybrid-training.vercel.app).
 *
 * Override with STRAVA_REDIRECT_URI in Vercel for preview/staging if needed.
 */
export const STRAVA_OAUTH_REDIRECT_URI =
  (typeof process.env.STRAVA_REDIRECT_URI === "string" && process.env.STRAVA_REDIRECT_URI.trim()) ||
  "https://custom-hybrid-training.vercel.app/api/strava/callback";

export const STRAVA_APP_BASE_URL = "https://custom-hybrid-training.vercel.app";
