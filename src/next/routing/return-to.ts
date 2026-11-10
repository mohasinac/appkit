/**
 * `?next=` — returning a visitor to the page they were on after sign-in.
 *
 * ## The problem this solves, measured
 *
 * Sign-in lives on its own host. `section-routes.ts` already turns the shop's
 * `/auth/login` into `https://auth.<domain>/login` on every guest host, so the
 * LINK works. What it does not carry is where the visitor came from, and
 * measured 2026-11-10 in a browser every sign-in link on every subdomain was
 * bare:
 *
 * ```
 * events /<id>/entries      -> https://auth.<domain>/login     (no ?next=)
 * events /<id>/participate  -> https://auth.<domain>/login     (no ?next=)
 * blogs  /                  -> https://auth.<domain>/login     (no ?next=)
 * ```
 *
 * So "Sign in to vote" signed you in and dropped you on the identity
 * provider's configured default — never back at the entry you wanted to vote
 * on.
 *
 * ## 🛑 THE `next` VALUE MUST BE ABSOLUTE
 *
 * The identity provider validates `?next=` against a relying-party allowlist,
 * and that check REJECTS A RELATIVE PATH on purpose: a relative `next` means
 * "somewhere on the identity provider", which is never a legitimate
 * destination for a relying party and is how an attacker probes for an
 * internal redirect.
 *
 * A rejected `next` **does not error**. It silently falls back to the
 * provider's canonical origin, so the visitor lands on a homepage and the
 * login looks like it worked. That silent degrade is the entire reason this
 * module exists rather than a `?next=${pathname}` template at each call site:
 * there is one place that can get it wrong, and it refuses to emit a `next` it
 * knows will be discarded.
 *
 * ## 🛑 Why a STRING and not a callback
 *
 * The obvious shape for "let the page tell the component where it is" is a
 * `() => string` prop. appkit shipped that once (`buildHref`) and it took two
 * content hosts down for a week: a function cannot be serialized into the RSC
 * flight payload, React writes an error row at that prop position, the server
 * render still returns 200 with complete HTML, and the browser dies
 * deserializing it at hydration as minified error #441 — above every
 * `<Suspense>` boundary, so no fallback can catch it. See the long note in
 * `section-routes.ts`.
 *
 * Everything here takes and returns **strings**. The current URL is read in a
 * client component (`react/hooks/useReturnTo`) or composed by the server page
 * that already knows its own path. Nothing crosses the boundary as a function.
 *
 * ## Domain independence
 *
 * No host literal appears below and none may be added. The current URL is
 * whatever the browser is actually on, and the sign-in href is whatever the
 * section registry resolved — both are inputs.
 */

/**
 * The query parameter the identity provider reads.
 *
 * One constant, because the sender and the receiver disagreeing about its name
 * is a failure with no symptom: the link is built, the redirect happens, and
 * the parameter is ignored. ⚠ `features/scams` historically used `?redirect=`
 * for the same job — a second spelling nothing reads.
 */
export const RETURN_TO_PARAM = "next";

/**
 * A base used only so a RELATIVE `signInHref` can be parsed by `URL`. It never
 * appears in any output: a relative href is re-serialised relative again.
 *
 * `http://` and a reserved TLD rather than anything resolvable, so a bug that
 * let it escape would be obvious rather than quietly pointing somewhere real.
 */
const PARSE_BASE = "http://relative.invalid";

/** Is `url` an absolute `http(s)` URL? Anything else is not a destination. */
function parseAbsolute(url: string | null | undefined): URL | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // `javascript:` and `data:` parse fine and are not destinations.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed;
}

/**
 * Attach `?next=<currentUrl>` to a sign-in or register href.
 *
 * @param signInHref The sign-in destination, already resolved for this host by
 *   `resolveSectionHref`. May be absolute (a cross-host identity provider) or
 *   relative (a host that serves its own sign-in screen). `""` is returned
 *   unchanged — the empty-slot convention for "this deployment has no sign-in
 *   screen", which callers render as prose instead of a dead link.
 * @param currentUrl The ABSOLUTE URL of the page the visitor is on.
 *   `null`/`undefined`/relative all yield `signInHref` unchanged.
 *
 * @returns `signInHref` with exactly one `next` parameter, or `signInHref`
 *   untouched when there is nothing legitimate to put in it.
 */
export function withReturnTo(
  signInHref: string,
  currentUrl: string | null | undefined,
  param: string = RETURN_TO_PARAM,
): string {
  if (!signInHref) return "";

  const returnTo = parseAbsolute(currentUrl);
  /*
   * 🛑 No `next` rather than a relative one. A relative value is REJECTED by
   * the provider's allowlist and silently replaced by its canonical origin, so
   * emitting one is strictly worse than emitting none: both land the visitor on
   * a default page, but one of them looks like it was handled.
   */
  if (!returnTo) return signInHref;

  const relative = !signInHref.includes("://");
  let target: URL;
  try {
    target = new URL(signInHref, PARSE_BASE);
  } catch {
    return signInHref;
  }

  /*
   * 🛑 Never point `next` at the sign-in screen itself. It happens naturally —
   * a "Sign in" link rendered by shared chrome that is also mounted ON the
   * sign-in page — and the result is a visitor who authenticates and is sent
   * back to the login form, which reads as a login that silently failed.
   *
   * Compared on origin+pathname, so a different query string on the same login
   * screen still counts as the same screen.
   */
  if (
    returnTo.origin === target.origin &&
    returnTo.pathname.replace(/\/+$/, "") === target.pathname.replace(/\/+$/, "")
  ) {
    return signInHref;
  }

  // `set`, not `append`: an href that already carries a `next` (chrome rendered
  // inside a page reached through one) must not accumulate a second.
  target.searchParams.set(param, returnTo.toString());

  return relative
    ? `${target.pathname}${target.search}${target.hash}`
    : target.toString();
}

/**
 * The absolute URL of the page the browser is on, or `null` on the server.
 *
 * Deliberately not a React hook so a non-React caller (an event handler, a
 * `router.push` site) can use the same source of truth. React callers should
 * prefer `useReturnTo`, which avoids a hydration mismatch by reading this
 * AFTER mount.
 */
export function browserPageUrl(): string | null {
  if (typeof window === "undefined") return null;
  const href = window.location?.href;
  return parseAbsolute(href) ? href : null;
}

/**
 * The route section the identity provider owns, as `ROUTES.AUTH.*` spells it.
 *
 * Named here rather than inferred from a label, because "is this link a sign-in
 * link?" has to be answerable from the PATH: by the time a nav table has been
 * resolved for a guest host the href is an absolute URL on another origin and
 * says nothing about which section it came from.
 */
export const AUTH_SECTION = "/auth";

/**
 * Is `path` a shop-shaped path inside the identity provider's section?
 *
 * Boundary-checked on `/`, for the same reason `resolveSectionHref` is: a bare
 * `startsWith("/auth")` would also claim `/authors`, and stamping a `next` onto
 * an unrelated link is a silent change to a URL nobody is watching.
 */
export function isSignInPath(path: string): boolean {
  return path === AUTH_SECTION || path.startsWith(`${AUTH_SECTION}/`);
}

/**
 * Resolve one shop-shaped nav/footer href for this host, stamping `?next=` when
 * it is a sign-in href.
 *
 * ## Why this pairing exists as one function
 *
 * A nav table is written in shop-shaped paths (`/auth/login`) and every host
 * maps it through `resolveSectionHref`. A sign-in entry needs a SECOND thing
 * done to it, and doing that at the call site means remembering it in each of
 * the nav mapper, the footer mapper and the single-destination props of every
 * consuming app — measured 2026-11-10: nine places across three apps, and the
 * footer "Sign in" link was already a different shape from the title bar's.
 *
 * 🛑 It takes the path BEFORE resolution, because that is the only form that
 * still says which section it belongs to.
 *
 * @param currentUrl The absolute URL of the current page, from
 *   `browserPageUrl()` or `useCurrentPageUrl()`. `null` (the SSR pass) yields a
 *   plain resolved href — never a relative `next`, which the provider discards.
 */
export function resolveNavHref(
  path: string,
  currentUrl: string | null | undefined,
  resolve: (href: string) => string,
): string {
  const resolved = resolve(path);
  return isSignInPath(path) ? withReturnTo(resolved, currentUrl) : resolved;
}
