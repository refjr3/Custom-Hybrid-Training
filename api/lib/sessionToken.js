/**
 * Parse Cookie header into name → raw value (per segment, no blanket decodeURIComponent).
 * Values may still be URL-encoded; callers decode when assembling multi-cookie payloads.
 */
export function parseCookieHeaderRaw(header) {
  const cookies = {};
  if (!header || typeof header !== "string") return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    let v = part.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    cookies[k] = v;
  }
  return cookies;
}

/** Supabase SSR / cookie storage: sb-<project-ref>-auth-token[.N] → session JSON → access_token */
export function accessTokenFromSupabaseAuthCookies(rawCookies) {
  if (!rawCookies || typeof rawCookies !== "object") return "";

  /** @type {Map<string, { chunks: Map<number, string>, whole?: string }>} */
  const byBase = new Map();

  for (const [name, value] of Object.entries(rawCookies)) {
    if (!name.startsWith("sb-") || !name.includes("-auth-token")) continue;
    const m = name.match(/^(sb-.+-auth-token)\.(\d+)$/);
    if (m) {
      const base = m[1];
      const i = Number(m[2]);
      if (!Number.isFinite(i)) continue;
      if (!byBase.has(base)) byBase.set(base, { chunks: new Map() });
      byBase.get(base).chunks.set(i, value);
    } else if (/^sb-.+-auth-token$/.test(name)) {
      if (!byBase.has(name)) byBase.set(name, { chunks: new Map() });
      byBase.get(name).whole = value;
    }
  }

  const tryParseSession = (joined) => {
    if (!joined) return "";
    const attempts = [
      () => JSON.parse(decodeURIComponent(joined)),
      () => JSON.parse(joined),
    ];
    for (const run of attempts) {
      try {
        const session = run();
        const t = session?.access_token;
        return typeof t === "string" && t.length > 0 ? t : "";
      } catch {
        /* next */
      }
    }
    return "";
  };

  for (const { chunks, whole } of byBase.values()) {
    if (chunks.size > 0) {
      const indices = [...chunks.keys()].sort((a, b) => a - b);
      const joined = indices.map((i) => chunks.get(i) ?? "").join("");
      const t = tryParseSession(joined);
      if (t) return t;
    } else if (whole != null && whole !== "") {
      const t = tryParseSession(whole);
      if (t) return t;
    }
  }

  return "";
}

/**
 * JWT / opaque bearer from Authorization, triad_session, or Supabase sb-*-auth-token cookies.
 */
export function getAccessTokenFromRequest(req) {
  const raw = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (raw) return raw;

  const rawCookies = parseCookieHeaderRaw(req.headers?.cookie || "");

  const triad = rawCookies.triad_session;
  if (triad) {
    try {
      const decoded = decodeURIComponent(triad);
      if (decoded) return decoded;
    } catch {
      /* ignore */
    }
    return triad;
  }

  return accessTokenFromSupabaseAuthCookies(rawCookies);
}
