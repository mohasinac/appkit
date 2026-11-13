/**
 * PUBLISHING the checkout purchase-terms clauses on a policy page.
 *
 * ## Why this exists
 *
 * The checkout's consent step used to render every applicable clause inline as
 * a bullet list above the tick-box. That list was removed from the checkout
 * screen by owner decision, leaving a checkbox and a pair of links — so the
 * text a buyer is agreeing to had nowhere left to be read.
 *
 * 🛑 That text is not decoration. `_internal/server/payments/policy-consent.ts`
 * hashes it (`hashPolicyClauses`), stamps the hash and the verbatim clauses
 * onto every order, and refuses a checkout whose echoed hash does not match. It
 * is the consent ARTEFACT — the thing a dispute is settled against. A consent
 * record is only worth something if the person who gave it could read what they
 * were giving, so the clause text has to be published somewhere stable and
 * public. That is the Terms & Conditions page.
 *
 * ## 🛑 DERIVED, NEVER COPIED
 *
 * Every string on the page comes back out of `resolveCheckoutPolicyClauses` —
 * the exact function the checkout UI calls to build the offer and the exact
 * function the server gate calls to re-resolve and hash. There is no second
 * copy of any clause here, and there is nothing to keep in step: an admin who
 * rewords a clause in Site Settings changes the hashed text and the published
 * text in the same write, because they are the same string.
 *
 * ## The cart problem, and how the superset is built
 *
 * The resolver answers "which clauses apply to THIS cart, paid THIS way". A
 * legal page has no cart and no chosen tender, so it publishes the SUPERSET:
 * every clause this install could ever ask anyone to accept. The superset is
 * assembled by PROBING the real resolver rather than by reimplementing its
 * predicate logic — see `probeListingTypes` / `probePaymentMethods` below.
 *
 * ## What this module must never do
 *
 * It does not hash, does not read or write a consent record, and is not on the
 * checkout path. It is a read-only publisher. If a change here would alter what
 * `hashPolicyClauses` sees, the change is in the wrong file.
 */

import { normalizeError } from "../../errors/normalize";
import { serverLogger } from "../../monitoring/server-logger";
import {
  DEFAULT_CHECKOUT_POLICY_CLAUSES,
  resolveCheckoutPolicyClauses,
  resolveCheckoutPolicyVersion,
  type CheckoutPolicyClause,
  type CheckoutPolicySettings,
} from "../../_internal/shared/checkout/policy-consent";
import {
  ALL_LISTING_TYPES,
  enabledListingTypes,
  type FeatureFlagSnapshot,
} from "../../_internal/shared/listing-types/feature-flags";
import type { ListingType } from "../products/types/index";

/**
 * What this module needs off the site-settings singleton.
 *
 * Declared STRUCTURALLY rather than importing `SiteSettingsDocument`, for the
 * same reason `FeatureFlagSnapshot` is: the two fields read here are the whole
 * dependency, and naming the document type would drag the admin schema into a
 * module that only publishes prose.
 */
export interface PurchaseTermsSnapshot extends FeatureFlagSnapshot {
  checkoutPolicies?: CheckoutPolicySettings;
}

/** One published clause — the id it is recorded under, and its verbatim text. */
export interface PublishedPurchaseClause {
  id: string;
  text: string;
}

export interface PublishedPurchaseTerms {
  /** `siteSettings.checkoutPolicies.version` in force right now. */
  version: number;
  /** Superset of every clause this install can ask a buyer to accept. */
  clauses: PublishedPurchaseClause[];
}

/**
 * The heading the clause block renders under.
 *
 * English and hard-coded, matching the payment-disclosure headings in
 * `PolicyPageView` that this section is modelled on. Brand-free and
 * vertical-free, so it stays correct for any install.
 */
export const PURCHASE_TERMS_HEADING = "Purchase terms for your order";

/**
 * The clause list AS CONFIGURED, before any predicate runs.
 *
 * ⚠ This repeats the resolver's own source selection, and the repetition is
 * deliberately bounded: it is used ONLY to decide which inputs to probe the
 * resolver with, and to order the result. **No text is ever taken from here** —
 * every string published comes back out of `resolveCheckoutPolicyClauses`. So
 * the worst a drift between this and the resolver's selection can cost is a
 * probe that was not worth making or an ordering that falls back to insertion
 * order. It cannot make the published text disagree with the hashed text, which
 * is the only property that matters.
 *
 * Stricter than the resolver on purpose (`Array.isArray`): a malformed stored
 * value must not reach the `for…of` below.
 */
function clauseSource(
  settings: PurchaseTermsSnapshot | null | undefined,
): readonly CheckoutPolicyClause[] {
  const configured = settings?.checkoutPolicies?.clauses;
  return Array.isArray(configured) && configured.length > 0
    ? configured
    : DEFAULT_CHECKOUT_POLICY_CLAUSES;
}

/**
 * The listing-type inputs to probe the resolver with.
 *
 * 🛑 N+1 probes, not one, and the "+1" is the part that is easy to drop.
 *
 *   · **all types at once** — `clauseApplies` uses ANY semantics, so one pass
 *     over the whole enabled set surfaces every clause whose capability is
 *     present anywhere in the catalogue.
 *   · **each type alone** — surfaces `negate: true` clauses, which apply when a
 *     capability is ABSENT ("nothing in this order ships, so there is no
 *     delivery window"). Those are invisible to the combined pass the moment a
 *     single shippable type exists, which is always. No shipped default uses
 *     `negate` today; the clause list is admin-editable config, so a probe set
 *     that only works for today's rows is a trap rather than an optimisation.
 *
 * Reads `enabledListingTypes`, so a type the admin has switched off does not
 * get its clause published — the page describes what this store can actually
 * sell.
 *
 * ⚠ An EMPTY enabled set falls back to every type. That state means either a
 * store that sells nothing (so nobody reaches the clause anyway) or a settings
 * document we could not read properly — and for a DISCLOSURE the safe direction
 * is to publish more, the same asymmetry `isOnlinePaymentEnabled` is built on.
 */
function probeListingTypes(
  settings: PurchaseTermsSnapshot | null | undefined,
): ListingType[][] {
  const enabled = enabledListingTypes(settings);
  const base = enabled.length > 0 ? enabled : [...ALL_LISTING_TYPES];
  return [base, ...base.map((type) => [type])];
}

/**
 * The payment-method inputs to probe the resolver with.
 *
 * Derived from the clause list's own `appliesWhenPaymentMethod` entries, which
 * is exactly — and only — the set of tenders that can change the answer: the
 * resolver drops a restricted clause for any method not named on it, and for
 * `undefined`. So probing `undefined` plus every slug any clause names covers
 * the whole space, with nothing hard-coded.
 *
 * 🛑 NOT derived from `settings.payment.paymentMethodRules`. That map is
 * absent on a fresh install (deliberately — see its note in the admin schema),
 * which would silently publish zero method-restricted clauses and quietly drop
 * the cash-on-delivery terms from the page.
 */
function probePaymentMethods(
  settings: PurchaseTermsSnapshot | null | undefined,
): (string | undefined)[] {
  const slugs = new Set<string>();
  for (const clause of clauseSource(settings)) {
    const restricted = clause?.appliesWhenPaymentMethod;
    if (!Array.isArray(restricted)) continue;
    for (const method of restricted) {
      if (typeof method === "string" && method.length > 0) slugs.add(method);
    }
  }
  return [undefined, ...slugs];
}

/**
 * Build the superset by probing the real resolver.
 *
 * The resolver is the authority on BOTH halves — whether a clause is published
 * at all, and what its text is. `clauseSource` contributes declaration order
 * and nothing else.
 */
function derivePurchaseTerms(
  settings: PurchaseTermsSnapshot | null | undefined,
): PublishedPurchaseTerms {
  const policies = settings?.checkoutPolicies;
  const found = new Map<string, CheckoutPolicyClause>();

  for (const method of probePaymentMethods(settings)) {
    for (const types of probeListingTypes(settings)) {
      for (const clause of resolveCheckoutPolicyClauses(policies, types, method)) {
        if (clause && typeof clause.id === "string" && !found.has(clause.id)) {
          found.set(clause.id, clause);
        }
      }
    }
  }

  /*
   * Emit in DECLARATION order. The checkout showed the clauses in the order the
   * admin wrote them and the canonical hash is taken in that order too, so a
   * reader comparing the page against their own order record should not have to
   * re-sort it in their head.
   */
  const emitted = new Set<string>();
  const clauses: PublishedPurchaseClause[] = [];
  const push = (clause: CheckoutPolicyClause | undefined): void => {
    if (!clause || emitted.has(clause.id)) return;
    if (typeof clause.text !== "string" || clause.text.trim().length === 0) return;
    emitted.add(clause.id);
    clauses.push({ id: clause.id, text: clause.text });
  };

  for (const declared of clauseSource(settings)) {
    if (declared && typeof declared.id === "string") push(found.get(declared.id));
  }
  // Anything the resolver produced that declaration order did not reach. Not
  // expected — the resolver only ever returns members of that list — but a
  // published clause must never be dropped by an ordering pass.
  for (const clause of found.values()) push(clause);

  return { version: resolveCheckoutPolicyVersion(policies), clauses };
}

/**
 * The published clause set, with every failure mode turned into less content
 * rather than a broken page.
 *
 * 🛑 A public legal page must not 500 because settings are unreadable. The
 * three states, in order of how much is known:
 *
 *   1. **settings absent** (the repository read failed upstream) — no catch
 *      needed. `resolveCheckoutPolicyClauses(undefined, …)` already falls back
 *      to `DEFAULT_CHECKOUT_POLICY_CLAUSES`, which is the same fallback the
 *      consent GATE would use against the same absent settings. Published text
 *      and hashed text still agree.
 *   2. **settings present but malformed** — e.g. `clauses` stored as something
 *      that is not an array, which makes the resolver's own `.filter` throw.
 *      Retried once against `undefined`, i.e. against the shipped defaults,
 *      with the failure logged for an operator. Checkout is broken in that
 *      state too; the legal page does not have to be.
 *   3. **both failed** — an empty clause list, which the caller renders as NO
 *      SECTION rather than as a heading with nothing under it.
 */
export function resolvePublishedPurchaseTerms(
  settings: PurchaseTermsSnapshot | null | undefined,
): PublishedPurchaseTerms {
  try {
    return derivePurchaseTerms(settings);
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn(
      "about.purchaseTerms: clause derivation failed on live settings — falling back to shipped defaults",
      { error: normalizeError(err).message },
    );
    try {
      return derivePurchaseTerms(undefined);
    } catch (fallbackErr) {
      void normalizeError(fallbackErr);
      serverLogger.error("about.purchaseTerms: clause derivation failed outright", {
        error: normalizeError(fallbackErr).message,
      });
      return { version: resolveCheckoutPolicyVersion(undefined), clauses: [] };
    }
  }
}

/*
 * The framing sentences around the clause list.
 *
 * ⚠ The clauses are written in the FIRST PERSON ("I can cancel this order
 * myself only until…") because they are what a buyer confirms about themselves
 * at the tick-box. Read cold on a policy page that voice is jarring, so the
 * intro says whose voice it is before the list starts. 🛑 It frames the clauses
 * — it must never paraphrase one, because only the clause text is hashed and a
 * summary that disagrees with it is the part a dispute would turn on.
 */
const INTRO = [
  "These purchase terms apply to each order on its own, not to your account as a whole.",
  "Which of them apply to a particular order depends on what is in it and how you pay for it, so the exact set that applies is resolved for your basket and you confirm it at checkout before the order is placed.",
  "They are written in the first person below because that is how you confirm them.",
  "The wording you accepted is recorded against your order and does not change if these terms are edited afterwards, so an older order keeps the terms it was placed under.",
].join(" ");

/**
 * The finished `{ heading, body }` section, or `null` when there is nothing to
 * publish.
 *
 * Shaped to drop straight into `PolicyPageView`'s existing i18n `sections`
 * array — same contract as the config-derived payment disclosure beside it, so
 * this adds a row to an existing mechanism rather than a second one.
 */
export function buildPurchaseTermsSection(
  settings: PurchaseTermsSnapshot | null | undefined,
): { heading: string; body: string } | null {
  const { version, clauses } = resolvePublishedPurchaseTerms(settings);
  if (clauses.length === 0) return null;

  const body = [
    INTRO,
    ...clauses.map((clause) => `• ${clause.text}`),
    `These are version ${version} of the purchase terms. Your order record stores the version and the exact wording you accepted.`,
  ].join("\n\n");

  return { heading: PURCHASE_TERMS_HEADING, body };
}
