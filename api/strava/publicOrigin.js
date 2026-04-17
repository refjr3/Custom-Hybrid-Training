/** Canonical browser origin for redirects + Strava redirect_uri (must match Strava app config). */

const DEFAULT_ORIGIN = "https://custom-hybrid-training.vercel.app";

function normalizeOrigin(raw) {
  const s = String(raw || "").trim().replace(/\/$/, "");
  if (!s || s === "https://" || s === "http://") return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

export function resolvePublicOrigin(req) {
  const xfHost = req.headers["x-forwarded-host"];
  const hostRaw = typeof xfHost === "string" ? xfHost.split(",")[0] : req.headers?.host || "";
  const host = String(hostRaw).trim();
  const xfProto = req.headers["x-forwarded-proto"];
  const protoRaw = typeof xfProto === "string" ? xfProto.split(",")[0] : "https";
  const proto = String(protoRaw).trim() || "https";
  if (host && !/^localhost(:\d+)?$/i.test(host) && host !== "127.0.0.1") {
    return `${proto}://${host}`;
  }

  const fromEnv = normalizeOrigin(
    process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  );
  if (fromEnv) return fromEnv;

  const vercel = normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (vercel) return vercel;

  return DEFAULT_ORIGIN;
}
