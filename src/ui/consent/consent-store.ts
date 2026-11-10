/**
 * Cookie-consent store — the MECHANISM. No React, no brand, no hostname.
 *
 * ## What this is for
 *
 * Two separate jobs that are easy to conflate:
 *
 *   1. Remember the visitor's choice, on ONE cookie, scoped so the choice
 *      survives a hop to a sibling subdomain. A consent record that is
 *      host-only means the banner reappears on every deployment and the
 *      visitor is asked five times.
 *   2. Let non-essential code ASK whether it may run, and be told again when
 *      the answer changes — without a page reload.
 *
 * ## 🛑 Strictly necessary cookies are NOT gated by this
 *
 * The session cookie (`__session`) is what makes sign-in work across every
 * host. Withholding it until consent would mean "decline cookies" logs you
 * out — so it is categorised `essential` and this module never governs it.
 * Only `analytics` and `marketing` are gated. See `COOKIE_REGISTRY` below:
 * the policy page is generated from it, so the document and the code cannot
 * drift apart.
 *
 * ## 🛑 The value vocabulary is deliberately small, and `accepted` is load-bearing
 *
 * `accepted` means "every category". That exact spelling is not arbitrary: a
 * consumer of this library already ships a consent READER that matches
 * `cookie_consent=accepted` to decide whether consent-gated ad slots may
 * render (`features/homepage/ad-registry`'s `requiresConsent`). It had no
 * writer anywhere — a gate with nothing to open it. Emitting `accepted` for
 * accept-all wires that existing reader up for free, with no change on its
 * side.
 *
 * Granular choices use dot-separated tokens (`essential.analytics`). The same
 * reader sees a value it does not recognise and reports "no stored choice",
 * which falls through to its own default — the safe direction.
 *
 * ## 🛑 Unknown tokens DEGRADE, they never throw
 *
 * A newer deploy may write a category this build has never heard of. Parsing
 * must not take a public page down, so unrecognised tokens are dropped and
 * the rest of the value is honoured.
 *
 * ## 🛑 `SameSite=Lax`, not `Strict`
 *
 * `Strict` withholds the cookie even on a top-level cross-site navigation, so
 * a visitor arriving from a search result or a shared link would be shown the
 * banner again despite having already answered. `Lax` is sent on top-level
 * GETs and withheld from cross-site subresources, which is exactly the
 * behaviour a consent record wants. (The session cookie can afford `Strict`
 * because it has a redirect flow to re-establish itself; a banner has none.)
 */

/**
 * The one cookie this store writes.
 *
 * Underscored spelling, not `cookieConsent`, because that is the spelling the
 * existing ad-slot consent reader matches. One name, not two.
 */
export const CONSENT_COOKIE_NAME = "cookie_consent";

/**
 * How long a recorded choice stands before the visitor is asked again.
 *
 * 180 days is the common supervisory-authority guidance for consent
 * expiry. The cookie's own `Max-Age` IS the record of recency — there is
 * deliberately no second "consentedAt" value anywhere, because two things
 * that must agree where only one is ever written is how these drift.
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** Value written when every category is granted. See the header. */
const ACCEPT_ALL_VALUE = "accepted";

/**
 * Cookie categories.
 *
 * `essential` is present in the type on purpose rather than being implicit:
 * the policy page lists cookies BY category, and a category that exists only
 * as "everything not in the other two" cannot be described to a visitor.
 */
export type ConsentCategory = "essential" | "analytics" | "marketing";

/** The categories a visitor can actually decide about. `essential` is not one. */
export const OPTIONAL_CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  "analytics",
  "marketing",
];

const ALL_OPTIONAL = new Set<string>(OPTIONAL_CONSENT_CATEGORIES);

export interface ConsentState {
  /**
   * `false` until the visitor has actually answered. 🛑 Undecided is NOT the
   * same as declined for the purposes of showing the banner, but it IS the
   * same for the purposes of running a tracker: no decision means no consent.
   */
  decided: boolean;
  /** Granted optional categories. `essential` is always allowed and is not listed. */
  granted: readonly ConsentCategory[];
}

/** Nothing recorded yet: show the banner, run nothing optional. */
export const UNDECIDED: ConsentState = { decided: false, granted: [] };

/**
 * Parse a raw cookie value into a state.
 *
 * Exported for the same reason the domain resolver below is: it is the part
 * worth testing, and it has no browser dependency.
 */
export function parseConsentValue(raw: string | undefined | null): ConsentState {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return UNDECIDED;

  if (value === ACCEPT_ALL_VALUE) {
    return { decided: true, granted: [...OPTIONAL_CONSENT_CATEGORIES] };
  }

  const tokens = value.split(".").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return UNDECIDED;

  /*
   * A recorded choice always carries `essential` as its first token, which is
   * what distinguishes "the visitor answered, and chose only the necessary
   * ones" from a cookie some other system happened to set under this name
   * with a value we cannot interpret. Without this marker, `essential` and
   * garbage are indistinguishable and a stray value would silently suppress
   * the banner forever.
   */
  if (!tokens.includes("essential")) return UNDECIDED;

  const granted = tokens.filter((t): t is ConsentCategory => ALL_OPTIONAL.has(t));
  return { decided: true, granted };
}

/** Serialise a state back to the cookie value. Inverse of `parseConsentValue`. */
export function serializeConsentValue(granted: readonly ConsentCategory[]): string {
  const kept = OPTIONAL_CONSENT_CATEGORIES.filter((c) => granted.includes(c));
  if (kept.length === OPTIONAL_CONSENT_CATEGORIES.length) return ACCEPT_ALL_VALUE;
  return ["essential", ...kept].join(".");
}

/**
 * Decide the `Domain` attribute for the consent cookie.
 *
 * 🛑 `configuredDomain` empty → returns `undefined` → the cookie is HOST-ONLY.
 * That is the required behaviour, not a fallback worth improving: appkit is a
 * domain-independent product and it must never GUESS a registrable domain. A
 * guessed domain is either wrong (the cookie is rejected and the banner
 * reappears forever) or too wide (the choice is broadcast to hosts nobody
 * configured). Host-only is the honest failure: consent works on this origin
 * alone and simply does not span siblings.
 *
 * 🛑 An exact-match-or-dot-suffix test, never `endsWith(domain)` on its own —
 * `"notexample.com".endsWith("example.com")` is `true`. The session cookie's
 * own options module makes the same point about the same mistake, and the
 * reason is sharper there (it hands the session to a lookalike host), but
 * being loose here would still write a visitor's choice onto a domain we do
 * not control.
 *
 * This mirrors `auth`'s `sessionCookieOptions` by design: the choice must span
 * exactly the set of hosts the session already spans, or the two disagree
 * about what "this site" means.
 */
export function resolveConsentCookieDomain(
  configuredDomain: string | undefined,
  host: string | undefined,
): string | undefined {
  const domain = (configuredDomain ?? "").trim().toLowerCase().replace(/^\./, "");
  if (!domain) return undefined;

  const hostname = (host ?? "").trim().toLowerCase();
  if (!hostname) return undefined;

  const onConfiguredDomain = hostname === domain || hostname.endsWith(`.${domain}`);
  return onConfiguredDomain ? `.${domain}` : undefined;
}

/* ───────────────────────── browser surface ───────────────────────── */

function readRawCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  /*
   * Match the NAME, anchored. 🛑 `document.cookie.includes(name)` is a false
   * positive — it is what made `includes("__session")` match `__session_id`
   * on this project. Anchoring on `^` or `; ` and requiring `=` is the only
   * correct read.
   */
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Read the recorded choice. Returns `UNDECIDED` on the server. */
export function readConsent(): ConsentState {
  return parseConsentValue(readRawCookie(CONSENT_COOKIE_NAME));
}

export interface WriteConsentOptions {
  /**
   * The configured registrable domain, e.g. `example.com`. Omit (or pass
   * empty) for a host-only cookie — see `resolveConsentCookieDomain`.
   *
   * 🛑 A plain STRING, because the only component that supplies it is a
   * CLIENT component whose parent is a server layout. Anything
   * non-serializable crossing that boundary is React error #441 territory —
   * the page server-renders a complete 200 and then dies at hydration, which
   * curl cannot see.
   */
  cookieDomain?: string;
}

/**
 * Record a choice and notify every subscriber.
 *
 * `Secure` is derived from the live protocol rather than from `NODE_ENV`: a
 * `Secure` cookie is silently dropped on plain `http`, which is what local
 * development and the Docker harness serve, and a dropped consent cookie
 * means a banner that can never be dismissed.
 */
export function writeConsent(
  granted: readonly ConsentCategory[],
  options: WriteConsentOptions = {},
): ConsentState {
  const state: ConsentState = {
    decided: true,
    granted: OPTIONAL_CONSENT_CATEGORIES.filter((c) => granted.includes(c)),
  };

  if (typeof document !== "undefined") {
    const domain = resolveConsentCookieDomain(
      options.cookieDomain,
      typeof location !== "undefined" ? location.hostname : undefined,
    );
    const parts = [
      `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serializeConsentValue(state.granted))}`,
      "path=/",
      `max-age=${CONSENT_MAX_AGE_SECONDS}`,
      "samesite=lax",
    ];
    if (domain) parts.push(`domain=${domain}`);
    if (typeof location !== "undefined" && location.protocol === "https:") {
      parts.push("secure");
    }
    document.cookie = parts.join("; ");
  }

  notify(state);
  return state;
}

/* ───────────────────────── change notification ───────────────────────── */

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

function notify(state: ConsentState) {
  for (const listener of [...listeners]) {
    try {
      listener(state);
    } catch (_err) {
      /*
       * Swallowed deliberately, and NOT re-thrown: one bad subscriber must not
       * stop the others from learning that consent changed. A half-applied
       * consent change is worse than a noisy one, because every category that
       * missed the notification keeps behaving as though the visitor never
       * answered — i.e. a failure here would silently ignore a withdrawal.
       *
       * Not routed through `normalizeError` either: this module is imported by
       * the policy page and the banner, both of which must stay free of the
       * server logging stack.
       */
    }
  }
}

/**
 * Subscribe to consent changes. Returns an unsubscribe function.
 *
 * 🛑 This exists because the alternative is a reload. Without it, a visitor
 * who clicks "Accept" sees no change until they navigate — so analytics and
 * ad slots appear to be broken at the exact moment they were switched on, and
 * the obvious "fix" is to force a reload on accept, which throws away
 * whatever the visitor was doing.
 */
export function subscribeToConsent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Does the visitor permit this category right now?
 *
 * 🛑 Fails CLOSED: no decision means no consent. `essential` is always `true`
 * — it is not a decision the visitor gets, and treating it as one is how a
 * "decline" ends up logging someone out.
 */
export function hasConsentFor(category: ConsentCategory, state?: ConsentState): boolean {
  if (category === "essential") return true;
  const current = state ?? readConsent();
  return current.decided && current.granted.includes(category);
}

/* ───────────────────────── the cookie registry ───────────────────────── */

/**
 * Every cookie and browser-storage key this product sets, by category.
 *
 * 🛑 This is the SOURCE the cookie-policy page renders from
 * (`features/legal/cookie-policy-content`). The point is structural: a policy
 * written as prose drifts from the code the moment a cookie is added or
 * renamed, and nothing errors — the document is simply untrue, which is the
 * one failure mode a cookie policy cannot have. Generating the table from a
 * declaration means adding a cookie without documenting it is a visible
 * omission in one place rather than an invisible one in two.
 *
 * ⚠ `purpose` and `duration` are English prose and therefore the one part a
 * consumer may want to localise or reword; that is what `CookiePolicyView`'s
 * `cookies` override prop is for. The NAMES and CATEGORIES are facts about
 * the code and are not props.
 */
export interface CookieRegistryEntry {
  name: string;
  category: ConsentCategory;
  purpose: string;
  duration: string;
  /** `cookie` | `localStorage` — a policy must not call storage a cookie. */
  kind: "cookie" | "localStorage";
  /** True when the value is unreadable to JavaScript (`HttpOnly`). */
  httpOnly?: boolean;
}

export const COOKIE_REGISTRY: readonly CookieRegistryEntry[] = [
  {
    name: "__session",
    category: "essential",
    kind: "cookie",
    httpOnly: true,
    purpose:
      "Keeps you signed in. Set only after you sign in, and never for an anonymous visitor. HttpOnly, so it cannot be read by scripts.",
    duration: "5 days",
  },
  {
    name: "__session_id",
    category: "essential",
    kind: "cookie",
    purpose:
      "A correlation id for the signed-in session, used to revoke it. Carries no credential. Set only after you sign in.",
    duration: "5 days",
  },
  {
    name: CONSENT_COOKIE_NAME,
    category: "essential",
    kind: "cookie",
    purpose:
      "Remembers the choice you made on the cookie banner, so you are not asked again on every page or on every part of the site.",
    duration: "180 days",
  },
  {
    name: "appkit:theme-id",
    category: "essential",
    kind: "localStorage",
    purpose:
      "Remembers your light/dark theme preference. Stored on your device only and never sent to a server.",
    duration: "Until you clear your browser storage",
  },
  {
    name: "appkit:section-state, appkit:last-category, appkit:announcement-dismissed",
    category: "essential",
    kind: "localStorage",
    purpose:
      "Remembers interface state — which panels you collapsed, the last category you browsed, and notices you dismissed. Stored on your device only.",
    duration: "Until you clear your browser storage",
  },
  {
    name: "Page-view measurement",
    category: "analytics",
    kind: "cookie",
    purpose:
      "Counts page views so we can see which pages are used. Not set and not sent until you allow analytics.",
    duration: "Only while you are on the page",
  },
  {
    name: "Advertising and promotion slots",
    category: "marketing",
    kind: "cookie",
    purpose:
      "Used by promotional slots to show relevant offers and to avoid repeating the same one. Nothing loads until you allow marketing.",
    duration: "Varies by provider",
  },
];

/** Registry entries for one category, in declaration order. */
export function cookiesInCategory(
  category: ConsentCategory,
  registry: readonly CookieRegistryEntry[] = COOKIE_REGISTRY,
): readonly CookieRegistryEntry[] {
  return registry.filter((entry) => entry.category === category);
}
