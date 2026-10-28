/**
 * Brand tokens for prose that cannot interpolate where it is written.
 *
 * ── Why a token at all ────────────────────────────────────────────────────
 *
 * Most brand mentions sit inside a component and can just call
 * `getBrandName()` at render time. A few cannot: they live in module-level
 * `const` data (`SCAM_TYPES` alone is 19 mentions across ~600 lines of advice),
 * and a template literal there is evaluated at IMPORT time — before the
 * consumer's `configureBrand()` has run. It would capture appkit's neutral
 * `"Site"` permanently and look like it worked.
 *
 * Turning those arrays into functions was the alternative, and it is a
 * BREAKING change for a consumer pinning appkit from the registry: six modules
 * import `SCAM_TYPES` directly, one of them a consumer API route. So the data
 * keeps its shape and carries `{{siteName}}`.
 *
 * ── 🛑 THIS IS A WRAPPER, NOT A SECOND TOKEN SYSTEM ───────────────────────
 *
 * The substitution is `resolvePublishedCopy` — the engine that already renders
 * every disclaimer, FAQ answer and refund-policy sentence, with five live
 * consumers and `audit-disclaimer-coverage` behind it. `siteName` was ALREADY
 * one of its keys.
 *
 * The first draft of this file shipped its own `{brand}` token and its own
 * `split/join` substitution, which was two mistakes at once:
 *
 *  - a second resolver for the same job — precisely the duplication Tier AK
 *    exists to remove, and it was caught only because the guarding audit
 *    flagged `disclaimers.ts`, which had been doing this correctly all along;
 *    and
 *  - a COLLIDING spelling. `{brand}` is an ordinary JSX expression in seven
 *    detail views, and `{{brand}}` was already taken — it means the PRODUCT's
 *    manufacturer (6 live uses) against 21 of `{{siteName}}` for the site. So
 *    a token reading `{brand}` in platform prose would have said "Takara-Tomy"
 *    to anyone who knew the other system.
 *
 * What survives is the ergonomics: `withBrandAll` over an array of advice
 * strings, and one import instead of two at every call site.
 *
 * 🛑 An UNKNOWN token is left VERBATIM by the engine, deliberately — see its
 * own note: a blanked token reads as clumsy copy nobody reports, while a
 * visible `{{siteNam}}` on a live page is reported within minutes. Do not add
 * a "safe" fallback here that defeats that.
 *
 * @tag domain:core
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import {
  resolvePublishedCopy,
  resolvePublishedValues,
} from "../_internal/shared/content/published-values";

/** The site-name token, in the vocabulary this codebase already uses. */
export const BRAND_TOKEN = "{{siteName}}";
/** The bare-host token, e.g. `support@{{siteDomain}}`. */
export const BRAND_DOMAIN_TOKEN = "{{siteDomain}}";

/**
 * Substitute every published token in one string, brand included.
 *
 * Resolved per call rather than from a module-level snapshot: the values are
 * read from the injected brand, and a hoisted `const` would capture appkit's
 * neutral default before `configureBrand()` ran. The resolver is a string
 * replace over a small map — cheap enough per render.
 */
export function withBrand(text: string): string {
  if (!text.includes("{{")) return text;
  return resolvePublishedCopy(text, resolvePublishedValues());
}

/** `withBrand` over an array — the common shape for advice and rule lists. */
export function withBrandAll(texts: readonly string[]): string[] {
  const values = resolvePublishedValues();
  return texts.map((t) =>
    t.includes("{{") ? resolvePublishedCopy(t, values) : t,
  );
}
