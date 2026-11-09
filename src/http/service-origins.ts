/**
 * Which ORIGIN serves a given API path prefix.
 *
 * ## Why this exists
 *
 * `/api/blog/*` and `/api/events/*` are no longer served by the shop — they
 * moved to their own deployments, and the owner's rule for the split is
 * (2026-11-09):
 *
 * > *"let the events or subdomains give APIs for the CRUD operations so
 * > anywhere can use them, while keeping the carousel slide logic in the
 * > main."*
 *
 * So a consumer keeps its own presentation and changes only where the DATA
 * comes from. That is a one-line change at the data source — **if** the client
 * knows which host owns which prefix. This registry is that knowledge.
 *
 * ## 🛑 It is CONFIG, not code
 *
 * There is no hostname in this file and there must never be one. A deployment
 * registers its own map at boot from env; an install that registers nothing
 * keeps today's behaviour exactly — every path resolves against the current
 * origin, which is what every consumer did before this existed.
 *
 * That "registers nothing" default is the whole safety story. Adopting the
 * seam is opt-in per deployment and per prefix, so the shop can move `/api/blog`
 * to the subdomain while `/api/events` still resolves locally, verify, and then
 * move the second one. Three small commits instead of one risky switch.
 *
 * ## 🛑 Longest prefix wins, and the trailing-boundary check is not optional
 *
 * `/api/blog` must not match `/api/blogger`. Matching on a bare
 * `startsWith(prefix)` would route an unrelated endpoint to a host that has
 * never heard of it, and the failure is a 404 from the WRONG server — which
 * reads as "the data is gone" rather than "the routing is wrong". So a match
 * requires the next character to be `/` or `?` or end-of-string.
 *
 * ## What this deliberately does NOT do
 *
 * It does not make the request cross-origin-safe. Pointing a browser at
 * another origin needs CORS on that origin and credentials handling for the
 * session cookie. Both subdomains sit under one registrable domain and the
 * session cookie is widened to it, so a `credentials: "include"` call works —
 * but the CORS headers are the receiving app's job, not this file's.
 */

/** `{ "/api/blog": "https://blogs.example.com" }` — prefix → absolute origin. */
export type ServiceOriginMap = Readonly<Record<string, string>>;

/**
 * Module state, like appkit's brand and baseline resolvers. Server and browser
 * are two module graphs, so each registers its own copy at boot — see the note
 * in any consumer's `providers.config.ts` about why both injection points are
 * required and neither is redundant.
 */
let originsByPrefix: ServiceOriginMap = {};
/** Longest-first, so `/api/blog/admin` beats `/api/blog` when both are set. */
let prefixesByLength: string[] = [];

/**
 * Register the prefix → origin map. Idempotent; last call wins.
 *
 * Entries with a blank value are DROPPED rather than registered, because the
 * value normally comes straight from an env var and an unset var must mean
 * "same origin" — not "resolve against the empty string". A deployment that
 * has not configured the seam yet must behave exactly as it did before.
 */
export function configureServiceOrigins(map: ServiceOriginMap): void {
  const cleaned: Record<string, string> = {};
  for (const [prefix, origin] of Object.entries(map)) {
    const p = prefix.trim();
    const o = origin?.trim();
    if (!p.startsWith("/") || !o) continue;
    cleaned[p.replace(/\/+$/, "")] = o.replace(/\/+$/, "");
  }
  originsByPrefix = cleaned;
  prefixesByLength = Object.keys(cleaned).sort((a, b) => b.length - a.length);
}

/** Current map, for diagnostics and admin screens. */
export function getServiceOrigins(): ServiceOriginMap {
  return originsByPrefix;
}

/**
 * The origin that serves `path`, or `undefined` for "this origin".
 *
 * `undefined` rather than a default is deliberate: the caller already has a
 * correct same-origin fallback, and returning one from here would hide an
 * unconfigured prefix behind a plausible value.
 */
export function serviceOriginFor(path: string): string | undefined {
  if (!prefixesByLength.length) return undefined;
  // Compare on the pathname only — a query string must not affect routing.
  const pathname = path.split(/[?#]/)[0] ?? path;
  for (const prefix of prefixesByLength) {
    if (!pathname.startsWith(prefix)) continue;
    // 🛑 Boundary check — see the header. `/api/blog` must not claim
    // `/api/blogger`.
    const next = pathname.charAt(prefix.length);
    if (next === "" || next === "/") return originsByPrefix[prefix];
  }
  return undefined;
}

/** Drop all registrations. Tests only. */
export function _resetServiceOrigins(): void {
  originsByPrefix = {};
  prefixesByLength = [];
}
