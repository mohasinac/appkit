/**
 * Portal hosts — THE one definition of the `role.<domain>` convention.
 *
 * `src/proxy.ts` used to carry three hardcoded hostname literals
 * (`admin.letitrip.in`, `seller.letitrip.in`, `auth.letitrip.in`) and
 * `appkit.config.js` carried a hand-synced second copy of the same three.
 * Three times in one day a new subdomain went live with no entry in either
 * list and silently fell through to the public homepage. This module replaces
 * both lists with a DERIVATION, so a new portal is one row of data and a new
 * *domain* is zero rows.
 *
 * ── Why the base domain is not configured here ───────────────────────────────
 *
 * A portal is identified by its FIRST HOSTNAME LABEL, not by a full hostname.
 * `admin.letitrip.in`, `admin.someotherclient.com` and `admin.localhost` all
 * resolve to the same portal with no configuration at all. That is what makes
 * this domain-independent in the sense the plan requires: a different client on
 * a different domain gets correct portal routing without editing Edge code or
 * setting an env var, and the same code is testable against a local dev server
 * with nothing but a `Host:` header.
 *
 * The canonical host IS configured (`seo.siteUrl` / `NEXT_PUBLIC_SITE_URL`),
 * because "where do I send a visitor who is on the wrong host" genuinely needs
 * an answer this module cannot derive. See `canonicalHostFromSiteUrl`.
 *
 * ── Constraints this file must keep ──────────────────────────────────────────
 *
 * 1. **Zero imports.** It is consumed by `src/proxy.ts`, which runs on the Edge
 *    runtime and deliberately imports no config module (see that file's own
 *    header). A pure, dependency-free module is safe there, in RSC, and in the
 *    browser alike — which is also what lets the proxy and the `ROUTES` layer
 *    share ONE definition instead of drifting apart as the old pair did.
 * 2. **Locale-agnostic.** `routing.locales` lives in the host app, so every
 *    function here takes an already-locale-stripped path. The caller owns the
 *    locale split; see `src/proxy.ts`.
 * 3. **No role equality in a consumer.** The role -> portal mapping is the DATA
 *    in `PORTAL_DEFINITIONS` below. A consumer asks
 *    `portalSectionForRoles(roles)`; it never compares a role string itself.
 */

/** One portal: a subdomain label, the route section it serves, who lands there. */
export interface PortalDefinition {
  /**
   * The first hostname label. `<label>.<anything>` resolves to this portal.
   */
  label: string;
  /**
   * The route section this portal serves, with a leading slash and no
   * trailing one. `admin.<domain>/` renders exactly what `/admin` renders.
   */
  section: string;
  /**
   * Roles that land on this portal. Empty means the portal is not role-backed
   * (`auth` is a flow, not a dashboard).
   *
   * 🛑 The role value is `seller`, never `vendor` — "vendor" is the
   * external-facing word only, and introducing it as a second literal is a
   * standing project prohibition.
   */
  roles: readonly string[];
  /**
   * The catch-all portal: every role not claimed by an earlier definition
   * lands here. Exactly one definition may set it.
   *
   * Owner, 2026-11-07: "3 main and rest go to employee". So `employee.` is an
   * ENTRY POINT, not a fixed page — `moderator`, `tester`, and the future
   * auditor / bookkeeping / management roles all arrive there.
   */
  roleCatchAll?: boolean;
  /**
   * Where a bare `/` on this portal's host LANDS, when that is not the section
   * root. Defaults to `section`.
   *
   * 🛑 Exists because `auth.<domain>/` measured a hard 404: `/auth` is a
   * directory of flows (`login`, `register`, `reset-password`) with no index
   * page, so resolving the host root to the section root sent every visitor to
   * the auth portal's front door to "404 — Page not found". A portal host that
   * 404s at its root is indistinguishable from a broken domain.
   *
   * Kept as DATA on the definition rather than a special case in the resolver,
   * so the next portal whose section has no index page is one field, not
   * another branch.
   */
  home?: string;
}

/**
 * 🛑 ORDER IS SIGNIFICANT — it is the resolution priority for a user holding
 * several roles, and `maxRolesPerUser` is 3 today and configured to grow.
 * `admin` first encodes "admin sees everything everywhere": an admin who also
 * holds `employee` gets the admin dashboard at `employee.<domain>`, not the
 * employee one. Reordering this list changes that behaviour, which is the
 * point — it is data, editable without touching a mechanism.
 */
export const PORTAL_DEFINITIONS: readonly PortalDefinition[] = [
  { label: "admin", section: "/admin", roles: ["admin"] },
  /*
   * `/store` is the internal section name and stays that way; `seller` is the
   * role value and `seller.` is the hostname. Three different words for one
   * concept is pre-existing and deliberate — the standing rule is never to
   * introduce a SECOND literal for an existing role, not to unify the three.
   */
  { label: "seller", section: "/store", roles: ["seller", "tester"] },
  { label: "user", section: "/user", roles: ["user"] },
  { label: "employee", section: "/employee", roles: ["employee"], roleCatchAll: true },
  /*
   * Not role-backed: `auth.<domain>` is where anyone signs in, including a
   * visitor with no roles at all. It is listed here anyway because the
   * host->section rewrite and the "is this path already a portal section"
   * test both need it, and a second list of portals is exactly the drift
   * this module exists to end.
   */
  { label: "auth", section: "/auth", roles: [], home: "/auth/login" },
];

/** Every route section a portal serves. Derived; never hand-maintained. */
export const PORTAL_SECTIONS: readonly string[] = PORTAL_DEFINITIONS.map((p) => p.section);

/**
 * Hosts that must NEVER be treated as "the wrong host" by a canonical-host
 * guard, because they are development and preview origins rather than public
 * ones.
 *
 * `*.vercel.app` is here on purpose and it is a real trade: it keeps every
 * preview deployment reachable (301-ing them to production would make preview
 * review impossible), at the cost that `letitrip-in.vercel.app` keeps serving
 * the same catalogue as the canonical host. That half of the duplicate-content
 * problem is a `noindex` job, not a redirect job — a redirect would break the
 * previews the team reviews on.
 */
const NON_PUBLIC_HOST_SUFFIXES: readonly string[] = [".vercel.app", ".localhost"];
const NON_PUBLIC_HOSTS: readonly string[] = ["localhost", "127.0.0.1", "::1", "[::1]"];

/** Strip a `:port`, lowercase, and drop a trailing dot (a fully-qualified FQDN). */
function normalizeHostname(hostname: string): string {
  const noPort = hostname.replace(/:\d+$/, "");
  const noTrailingDot = noPort.endsWith(".") ? noPort.slice(0, -1) : noPort;
  return noTrailingDot.toLowerCase();
}

/** True for a dev/preview origin that no public-host rule should police. */
export function isNonPublicHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return (
    NON_PUBLIC_HOSTS.includes(host) ||
    NON_PUBLIC_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

/**
 * The portal a hostname resolves to, by its first label — or null when the
 * host is not a portal host.
 *
 * Deliberately does NOT require the rest of the hostname to match a configured
 * base domain: see this module's header. The consequence worth naming is that
 * a client whose real public host begins with one of these labels (a site
 * genuinely living at `user.example.com`) would be read as a portal. That is
 * the cost of the convention itself, and the convention is the owner's.
 */
export function portalForHost(hostname: string): PortalDefinition | null {
  const host = normalizeHostname(hostname);
  const firstLabel = host.split(".")[0];
  if (!firstLabel || firstLabel === host) return null; // single-label host: never a portal
  return PORTAL_DEFINITIONS.find((p) => p.label === firstLabel) ?? null;
}

/** The route section a hostname's portal serves, or null for a non-portal host. */
export function portalSectionForHost(hostname: string): string | null {
  return portalForHost(hostname)?.section ?? null;
}

/** `admin` + `letitrip.in` -> `admin.letitrip.in`. For building outbound links. */
export function portalHostFor(label: string, baseDomain: string): string {
  return `${label}.${normalizeHostname(baseDomain)}`;
}

/**
 * Which dashboard a visitor sees, computed from their ROLE SET.
 *
 * 🛑 Keyed on the UNION of roles, never on a single `primaryRole` scalar: the
 * role -> portal mapping is many-to-one, so a scalar would silently strand
 * anyone holding two roles. Resolution order is `PORTAL_DEFINITIONS`' order,
 * which is why `admin` is first.
 *
 * Returns the catch-all portal's section for a role the table does not name —
 * that is what makes a NEW role (auditor, bookkeeper) land somewhere real
 * without a code change. Returns null only when there is no catch-all, which
 * the data above makes impossible today.
 */
export function portalSectionForRoles(roles: readonly string[]): string | null {
  const held = new Set(roles);
  for (const portal of PORTAL_DEFINITIONS) {
    if (portal.roles.some((role) => held.has(role))) return portal.section;
  }
  if (held.size === 0) return null;
  return PORTAL_DEFINITIONS.find((p) => p.roleCatchAll)?.section ?? null;
}

/** True when `path` is a section itself or sits beneath one. `/`-delimited. */
function isUnderSection(path: string, section: string): boolean {
  return path === section || path.startsWith(`${section}/`);
}

/**
 * True when a locale-stripped path already addresses a portal section
 * explicitly.
 *
 * 🛑 This is what stops the host rewrite from double-prefixing, and the bare
 * `startsWith(portalPrefix)` it replaces was wrong in two directions:
 *
 *   · `admin.<domain>/auth/login` — the RBAC gate's own redirect target — was
 *     rewritten to `/admin/auth/login`, a 404. An admin bounced to the login
 *     page from the admin host could not reach it.
 *   · `admin.<domain>/user/profile` — the sidebar's "My Profile" link —
 *     became `/admin/user/profile`, also a 404.
 *
 * Both were live, and both are fixed by asking "is this ANY portal section"
 * rather than "is this MY portal section".
 */
export function isPortalSectionPath(path: string): boolean {
  return PORTAL_SECTIONS.some((section) => isUnderSection(path, section));
}

/**
 * Paths that are never portal-relative even though they are not portal
 * sections: a visitor on `admin.<domain>` asking for `/unauthorized` means
 * that page, not `/admin/unauthorized` (which does not exist).
 *
 * Kept to the escape hatches the proxy itself redirects to, so it cannot grow
 * into the per-host list this module exists to delete. `/_next`, `/api` and
 * dotted paths never reach the rewrite — the proxy's matcher excludes them.
 */
const PORTAL_PREFIX_BYPASS: readonly string[] = ["/unauthorized", "/error.html"];

/**
 * Resolve a requested (locale-stripped) path to the path the app should
 * render, given the portal section the HOST implies.
 *
 * `/` -> the section itself, so `admin.<domain>/` renders the admin dashboard.
 * Already-portal-addressed and escape-hatch paths pass through untouched.
 *
 * Pure and idempotent: feeding the output back in returns it unchanged.
 */
export function resolvePortalPath(path: string, section: string | null): string {
  if (!section) return path;
  if (path === "/" || path === "") {
    // `home` when the definition declares one — `/auth` has no index page, so
    // its host root must land on `/auth/login` rather than a 404.
    return PORTAL_DEFINITIONS.find((p) => p.section === section)?.home ?? section;
  }
  if (isPortalSectionPath(path)) return path;
  if (PORTAL_PREFIX_BYPASS.some((p) => isUnderSection(path, p))) return path;
  return `${section}${path}`;
}

/**
 * The 1.28 helper: render an internal href the way it should LOOK on the host
 * the page is being served from.
 *
 * `ROUTES.*` bake the portal segment in (`ROUTES.ADMIN.PRODUCTS` is
 * `/admin/products`) because that is the real app path and must stay so on the
 * canonical host. On `admin.<domain>` the segment is already implied by the
 * host, so the URL a visitor should see is `admin.<domain>/products`. This
 * strips exactly the active section and nothing else — a `/user/profile` link
 * rendered on the admin host keeps its prefix, because it genuinely leaves the
 * admin section.
 *
 * Server-safe and pure, so it works unchanged in RSC, in a client component,
 * and in the Edge proxy. `section` is null on the canonical host, where this
 * is the identity function and today's behaviour is preserved byte-for-byte.
 */
export function portalHref(path: string, section: string | null): string {
  if (!section || !path.startsWith(section)) return path;
  const rest = path.slice(section.length);
  if (rest === "") return "/";
  if (!rest.startsWith("/")) return path; // `/administrator` is not under `/admin`
  return rest;
}

/** The canonical hostname a `siteUrl` names, or null when it cannot be parsed. */
export function canonicalHostFromSiteUrl(siteUrl: string): string | null {
  try {
    return normalizeHostname(new URL(siteUrl).hostname);
  } catch {
    // A malformed NEXT_PUBLIC_SITE_URL must not be able to take the site down
    // by making every host look non-canonical. Callers treat null as "no
    // canonical host known" and skip the guard entirely.
    return null;
  }
}

/** What `resolveCanonicalSite` concluded, and where the answer came from. */
export interface ResolvedCanonicalSite {
  /** Absolute origin to redirect to. */
  siteUrl: string;
  /** Its hostname, normalised — what `isOffCanonicalHost` compares against. */
  host: string;
  /**
   * `"declared"` when the configured canonical host answered; `"inferred"`
   * when a platform-provided fallback did. A caller may want to log the
   * difference: running on an inferred host means the configured one is
   * missing, which is a misconfiguration even though the guard still works.
   */
  source: "declared" | "inferred";
}

/** Parse a URL or a bare hostname (platform variables usually omit the scheme). */
function parseSiteCandidate(raw: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

/**
 * Resolve the canonical site — the host an off-canonical request is sent to.
 *
 * ── Why this takes candidates instead of reading the environment ────────────
 *
 * appkit is a domain-independent product: it must not know a particular
 * platform's env var names, and it must NEVER carry a fallback domain literal.
 * The caller supplies the candidates; this function owns which ones are
 * acceptable.
 *
 * ── `declared` vs `inferred`, and why they are not one list ─────────────────
 *
 * `declared` is the project's configured canonical host and is taken at its
 * word, including a localhost origin — that is the correct canonical host on a
 * development machine, and a guard that refused it would be untestable
 * locally, i.e. unverifiable.
 *
 * `inferred` candidates are platform guesses and are held to a stricter rule:
 * 🛑 an inferred candidate resolving to a dev/preview host is REJECTED. On
 * Vercel the natural fallback is the platform's own production-URL variable,
 * and if a project's production domain assignment resolves to
 * `<project>.vercel.app`, accepting it would make the real public host look
 * off-canonical and 301 `www.<domain>` → `<project>.vercel.app`. That is
 * strictly WORSE than no guard: it would hand the canonical signal for the
 * whole site to a preview origin. Rejecting preview hosts is what makes
 * offering a platform fallback safe at all.
 *
 * Returning null means MISCONFIGURED, not "use a default". The caller must say
 * so loudly rather than degrade in silence — see `src/proxy.ts`, where a null
 * here is logged as an error on the first request of each instance.
 */
export function resolveCanonicalSite(
  declared: string | undefined | null,
  inferred: readonly (string | undefined | null)[] = [],
): ResolvedCanonicalSite | null {
  if (declared) {
    const url = parseSiteCandidate(declared);
    const host = url ? normalizeHostname(url.hostname) : "";
    if (url && host) return { siteUrl: url.origin, host, source: "declared" };
  }
  for (const raw of inferred) {
    if (!raw) continue;
    const url = parseSiteCandidate(raw);
    if (!url) continue;
    const host = normalizeHostname(url.hostname);
    if (!host || isNonPublicHost(host)) continue;
    return { siteUrl: url.origin, host, source: "inferred" };
  }
  return null;
}

/**
 * True when this request should be redirected to the canonical host.
 *
 * The GENERAL rule the plan asks for, not a list of offending hostnames: any
 * host that is neither the canonical host nor a mapped portal nor a
 * dev/preview origin is serving a duplicate of the canonical site and gets a
 * 301. `audit.`, `tools.` and every subdomain added later are covered the day
 * they are attached, with no code change.
 */
export function isOffCanonicalHost(hostname: string, canonicalHost: string | null): boolean {
  if (!canonicalHost) return false;
  const host = normalizeHostname(hostname);
  if (host === canonicalHost) return false;
  if (portalForHost(host)) return false;
  if (isNonPublicHost(host)) return false;
  return true;
}

/**
 * An absolute href on the canonical host — the "Back to main site" link.
 *
 * 🛑 Absolute BY NECESSITY. A relative `/` rendered on `admin.<domain>` keeps
 * the visitor on the portal subdomain and, because `/` resolves to the
 * section, lands them straight back on the dashboard they were trying to
 * leave. Leaving a subdomain requires naming the host.
 */
export function canonicalSiteHref(path: string, siteUrl: string): string {
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return path;
  }
}

/**
 * The main site's origin, derived from a PORTAL hostname by dropping the
 * portal label — `https://admin.letitrip.in` -> `https://letitrip.in`, and
 * `http://admin.localhost:3001` -> `http://localhost:3001`. Returns null when
 * the host is not a portal host (there is nothing to go back FROM).
 *
 * ── Why derive instead of reading the configured canonical host ─────────────
 *
 * This is what lets the "Back to main site" link live in SHARED CHROME with no
 * per-layout plumbing and no env var: appkit is a domain-independent product,
 * and a chrome component that needs the host app's `siteUrl` threaded into it
 * would have to be wired separately in every portal layout — four files today
 * and one more per portal added, which is the per-site editing this module
 * exists to remove.
 *
 * ⚠ TWO honest costs, both deliberate:
 *   1. It targets the APEX (`letitrip.in`), not the canonical `www` host, so
 *      in production the link takes one extra 308 hop through the apex->www
 *      redirect Vercel already serves. A nav link can afford one hop; what it
 *      cannot afford is pointing at a host that does not exist on a different
 *      client's domain.
 *   2. A client whose main site genuinely lives on a deeper host would need the
 *      override. `canonicalOrigin` on the consuming component exists for that
 *      and wins whenever it is supplied.
 *
 * The port is preserved, which is what makes this verifiable against a local
 * dev server rather than only in production.
 */
export function mainSiteOriginFromPortalHost(hostOrigin: string): string | null {
  let url: URL;
  try {
    url = new URL(hostOrigin);
  } catch {
    return null;
  }
  if (!portalForHost(url.hostname)) return null;
  const labels = normalizeHostname(url.hostname).split(".");
  if (labels.length < 2) return null;
  url.hostname = labels.slice(1).join(".");
  return url.origin;
}
