/**
 * Which HOST serves a given page-path section, and at what base.
 *
 * ## The problem this solves, measured
 *
 * appkit's components build links from `ROUTES`, which is the SHOP's map:
 * `/events/<slug>`, `/blog/<slug>`, `/auth/login`. That is correct on www and
 * wrong everywhere else, and it fails SILENTLY — a 404 on a link nobody
 * clicked during review.
 *
 * It was found the only way these get found: the owner clicked a card on
 * `events.letitrip.in` and got `events.letitrip.in/events/diwali-photo-contest`
 * → **404**. The contest was unreachable from its own card.
 *
 * Fixing that one component led to the real question — *"won't the same happen
 * for all?"* — and the measurement says yes: **152 components** across appkit
 * build links from `ROUTES`, using **189 distinct** builders. Threading a prop
 * into each is not a fix, it is 152 chances to miss one.
 *
 * ## The rule
 *
 * A section has exactly one owner. Every host either:
 *
 *   - **owns it** and serves it at its own root       → base `""`
 *   - **does not own it** and must link to the owner  → base `"https://host"`
 *   - **has no registration**                          → unchanged (the shop)
 *
 * ```ts
 * // on events.<domain>
 * configureSectionRoutes({
 *   "/events": "",                        // mine, served at /
 *   "/blog":   "https://blogs.<domain>",  // someone else's
 *   "/auth":   "https://auth.<domain>",
 * });
 * ```
 *
 * `/events/diwali` → `/diwali`, and `/auth/login` →
 * `https://auth.<domain>/login`. Registering nothing leaves every path exactly
 * as `ROUTES` built it, so the shop is unaffected and adoption is per-host.
 *
 * ## 🛑 Why this is NOT a change to `ROUTES`
 *
 * www still serves `/events/*` and `/blog/*` and still 301s them to the
 * subdomains. The shop's map is correct for the shop. A guest host rewriting
 * the owner's constants to suit itself breaks the owner.
 *
 * ## 🛑 Longest prefix wins, with a boundary check
 *
 * `/blog` must not match `/blogger`. A bare `startsWith` would rewrite an
 * unrelated path to a host that has never heard of it — and the failure is a
 * 404 on the WRONG server, which reads as "the content is gone" rather than
 * "the routing is wrong". Same rule, and the same reason, as
 * `http/service-origins.ts`.
 */

/** `{ "/events": "", "/auth": "https://auth.example.com" }` */
export type SectionRouteMap = Readonly<Record<string, string>>;

let basesByPrefix: SectionRouteMap = {};
let prefixesByLength: string[] = [];

/**
 * Register the section → base map. Idempotent; last call wins.
 *
 * 🛑 An empty-string value is MEANINGFUL ("I own this, serve it at my root")
 * and must survive, unlike `configureServiceOrigins` where blank means
 * "unset". Only entries whose KEY is not a path are dropped. Getting this
 * backwards would silently disable every strip.
 */
export function configureSectionRoutes(map: SectionRouteMap): void {
  const cleaned: Record<string, string> = {};
  for (const [prefix, base] of Object.entries(map)) {
    const p = prefix.trim();
    if (!p.startsWith("/")) continue;
    cleaned[p.replace(/\/+$/, "")] = (base ?? "").trim().replace(/\/+$/, "");
  }
  basesByPrefix = cleaned;
  prefixesByLength = Object.keys(cleaned).sort((a, b) => b.length - a.length);
}

/** Current map, for diagnostics. */
export function getSectionRoutes(): SectionRouteMap {
  return basesByPrefix;
}

/**
 * Rewrite one shop-shaped path for this host. Returns it unchanged when no
 * registration matches, which is every path on an unconfigured install.
 *
 * Absolute URLs, anchors and non-paths pass through untouched — a component
 * that already built a full URL has made its own decision.
 */
export function resolveSectionHref(href: string): string {
  if (!prefixesByLength.length) return href;
  if (!href.startsWith("/")) return href;

  // Split once so a query string or hash cannot affect prefix matching, and
  // is preserved on the way out.
  const cut = href.search(/[?#]/);
  const pathname = cut === -1 ? href : href.slice(0, cut);
  const suffix = cut === -1 ? "" : href.slice(cut);

  for (const prefix of prefixesByLength) {
    if (!pathname.startsWith(prefix)) continue;
    const next = pathname.charAt(prefix.length);
    if (next !== "" && next !== "/") continue; // boundary — see the header
    const base = basesByPrefix[prefix] ?? "";
    const rest = pathname.slice(prefix.length);
    /*
     * `rest` is "" for the section root itself (`/blog` → `/`). Without the
     * fallback that produces a bare origin with no path, or an empty href on
     * an owning host — both of which render as a link that goes nowhere.
     */
    return `${base}${rest || "/"}${suffix}`;
  }
  return href;
}

/** Drop all registrations. Tests only. */
export function _resetSectionRoutes(): void {
  basesByPrefix = {};
  prefixesByLength = [];
}
