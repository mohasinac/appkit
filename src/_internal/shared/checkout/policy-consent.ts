/**
 * Buyer policy agreement at checkout — the CLAUSE MODEL (item 1.39).
 *
 * ## Why this exists
 *
 * The platform ships a no-cancel-after-reveal and no-refund-after-ship
 * mechanic. Those terms remove rights the buyer would otherwise have, so they
 * have to be accepted **knowingly, per purchase**, and the acceptance has to be
 * provable afterwards. A boolean `termsAccepted: true` on an order is not a
 * consent record — it says somebody ticked something, not WHAT they were
 * shown. This module owns the "what".
 *
 * ## 🛑 Capability-driven, never type-driven
 *
 * Which clauses apply to a cart is decided by reading the listing-type
 * CAPABILITY REGISTRY, never by `if (listingType === "clearance")`. A clause
 * declares the capability it is a consequence of:
 *
 *   `supportsSurpriseReveal`    → "no cancellation once you reveal"
 *   `supportsShipping`          → "no refund once it ships"
 *   `hasInstantFulfillment`     → "delivered instantly, not returnable"
 *   `requiresJurisdictionCheck` → "you confirm it is legal where you are"
 *
 * So the day the owner enables the reveal mechanic on stickers, the reveal
 * clause starts appearing on sticker checkouts with **no code change** — one
 * row in `LISTING_TYPE_CAPABILITIES` flips and this resolver follows it. That
 * is the governing principle of the rework applied to the consent step.
 *
 * ## The clause set is DATA
 *
 * `siteSettings.checkoutPolicies.clauses` is the editable copy, so an admin
 * rewords a consequence without a deploy and a different client in a different
 * vertical writes their own. `DEFAULT_CHECKOUT_POLICY_CLAUSES` below is the
 * FAIL-CLOSED fallback used when settings carry nothing: an install that has
 * never configured policies still blocks checkout behind a consent step rather
 * than silently waiving it.
 *
 * ## What is NOT here
 *
 * Hashing and persistence are server-only and live in
 * `_internal/server/payments/policy-consent.ts`. This module is isomorphic on
 * purpose — the checkout UI renders the same clause objects the gate judges, so
 * the text the buyer reads and the text that gets hashed cannot drift.
 */

import { capabilityFor, type ListingTypeCapability } from "../listing-types/capabilities";
import type { ListingType } from "../../../features/products/types/index";

/**
 * What a clause is a consequence OF.
 *
 * `"always"` is the unconditional clause every order carries (the baseline
 * terms acknowledgement). Everything else names a capability key, which is
 * typed against the registry — so deleting a capability is a compile error
 * here rather than a clause that silently stops applying.
 */
export type CheckoutPolicyPredicate = "always" | keyof ListingTypeCapability;

export interface CheckoutPolicyClause {
  /**
   * Stable identity. Recorded on the order, so renaming an id breaks the
   * ability to say "this buyer accepted that clause" — change the `text` and
   * bump `version` instead.
   */
  id: string;
  /**
   * The consequence, in plain language, as the buyer reads it INLINE at the
   * point of agreement. 🛑 Not a link to a policy page: the whole point of the
   * blocking step is that the consequence is in front of them when they tick.
   */
  text: string;
  /**
   * When this clause applies. See `CheckoutPolicyPredicate` — a capability
   * name, resolved through the registry, or `"always"`.
   */
  appliesWhen: CheckoutPolicyPredicate;
  /**
   * Invert the predicate: the clause applies when the capability is FALSE.
   * Needed for the honest shape of some consequences — "nothing in this order
   * ships, so there is no delivery window" is the absence of a capability, not
   * the presence of one.
   */
  negate?: boolean;
}

/**
 * The stored shape in `siteSettings.checkoutPolicies`.
 *
 * `version` is admin-bumped and travels onto the order beside the hash. The
 * hash proves WHAT was accepted; the version is the human-readable handle for
 * it in a dispute ("policy v3"), and is why both are stored rather than one.
 */
export interface CheckoutPolicySettings {
  version: number;
  clauses: CheckoutPolicyClause[];
}

/**
 * FAIL-CLOSED defaults. Used whenever settings carry no clause list.
 *
 * 🛑 Every entry's `appliesWhen` is a capability, not a listing type. Grep for
 * `listingType ===` in this file: zero, and that is the acceptance test for the
 * whole rework.
 */
export const DEFAULT_CHECKOUT_POLICY_CLAUSES: readonly CheckoutPolicyClause[] = [
  {
    id: "baseline-terms",
    appliesWhen: "always",
    text:
      "I have read and accept the Terms of Service, the Refund Policy and the Cancellation Policy that apply to the items in this order.",
  },
  {
    id: "no-cancel-after-reveal",
    appliesWhen: "supportsSurpriseReveal",
    text:
      "This order contains a concealed item. Once its contents are revealed to me — including a reveal that happens automatically when the seller ships it — the order can no longer be cancelled, and the allocation I received is final.",
  },
  /*
   * ── These two replaced a single `no-refund-after-ship` clause ────────────
   *
   * 🛑 That clause was WRONG IN BOTH DIRECTIONS, which is the worst outcome
   * available for a document whose only purpose is to be relied on in a
   * dispute. It read "once dispatched it can no longer be refunded on request",
   * and the code says otherwise on both halves (verified 2026-11-07, by reading
   * the rules rather than assuming them):
   *
   *   · TOO GENEROUS about cancellation. `TERMINAL_OR_IN_FLIGHT` in the order
   *     workflow registry includes `processing`, so buyer cancellation closes
   *     when the SELLER STARTS PREPARING the order — one status BEFORE
   *     dispatch. A buyer who read the old clause would have believed they
   *     could cancel right up to dispatch, and the consent record would have
   *     proved they agreed to a weaker restriction than the one actually
   *     applied to them.
   *
   *   · TOO RESTRICTIVE about returns. `requestReturnAction` →
   *     `assertReturnWindowOpen` gives the buyer a self-service return request
   *     once the order is `delivered`, inside `siteSettings.returns.windowDays`.
   *     So "no refund on request after dispatch" asserted a waiver of a right
   *     the buyer does in fact keep — and a consent record over-claiming a
   *     waiver is exactly the kind of clause that gets struck and takes the
   *     rest of the document's credibility with it. (A10 already flags that
   *     consent does not override statutory consumer rights regardless.)
   *
   * Split in two because they are two different facts about two different
   * windows, and one sentence covering both is how the original got both wrong.
   */
  {
    id: "cancel-window-closes-at-processing",
    appliesWhen: "supportsShipping",
    text:
      "I can cancel this order myself only until the seller starts preparing it. Once it moves to processing — which can happen quickly, and before anything is dispatched — self-service cancellation is no longer available to me.",
  },
  {
    id: "returns-after-delivery",
    appliesWhen: "supportsShipping",
    /*
     * The window is deliberately described rather than numbered.
     * `siteSettings.returns.windowDays` is config (7 today), and baking "7
     * days" into a clause would make the stored consent text disagree with the
     * live rule the day an admin changes it — the same two-owners defect, in a
     * legal document. An admin who wants the number stated edits this clause in
     * Site Settings, where both values are in front of them.
     */
    text:
      "After delivery I may request a return within the published returns window, and a refund is issued after review rather than automatically. Between dispatch and delivery I have no self-service cancellation or refund — my route then is to raise a dispute.",
  },
  {
    id: "instant-fulfilment-final",
    appliesWhen: "hasInstantFulfillment",
    text:
      "This order is fulfilled the moment payment succeeds. Because it is delivered to me immediately and cannot be returned, it is not refundable once delivered.",
  },
  {
    id: "jurisdiction-self-declaration",
    appliesWhen: "requiresJurisdictionCheck",
    text:
      "This order contains a restricted item. I confirm I am legally permitted to receive it at my delivery address, and I accept that the order will be cancelled if that turns out not to be the case.",
  },
];

/**
 * 2, not 1 — bumped when `no-refund-after-ship` was split into the
 * cancellation-window and returns-window clauses above.
 *
 * 🛑 Bumping is not cosmetic and is not optional on a wording change. The hash
 * proves WHAT was accepted; the version is the handle a human uses to talk
 * about it ("they accepted policy v1, which said the wrong thing about
 * cancellation"). Leaving it at 1 across a material rewrite would make two
 * genuinely different documents indistinguishable by name, and the only way to
 * tell them apart would be to re-derive a hash from an old settings snapshot
 * nobody kept.
 */
export const DEFAULT_CHECKOUT_POLICY_VERSION = 2;

/**
 * Does any listing type present in this checkout carry the capability the
 * clause hangs off?
 *
 * ANY, not ALL — deliberately. A cart with one concealed item and three
 * ordinary ones still forfeits cancellation on the concealed one, so the buyer
 * must be told. Requiring every line to carry the capability would silently
 * drop the clause from exactly the mixed carts that need it most.
 */
function clauseApplies(
  clause: CheckoutPolicyClause,
  listingTypes: readonly ListingType[],
): boolean {
  if (clause.appliesWhen === "always") return true;
  const key = clause.appliesWhen;
  const present = listingTypes.some((type) => {
    const capability = capabilityFor(type);
    /*
     * An unknown type — data written before a type was removed from the union
     * — resolves to `undefined` here rather than throwing. Treated as NOT
     * carrying the capability, which is the only reading that cannot
     * accidentally assert a consequence about an item we do not understand.
     */
    return capability ? capability[key] === true : false;
  });
  return clause.negate ? !present : present;
}

/**
 * The clause set for THIS checkout, in declaration order.
 *
 * Caller supplies the listing types actually in the cart. Resolution is pure,
 * so the UI and the server gate run the identical function over the identical
 * settings and cannot disagree about what was required.
 */
export function resolveCheckoutPolicyClauses(
  settings: CheckoutPolicySettings | undefined,
  listingTypes: readonly ListingType[],
): CheckoutPolicyClause[] {
  const configured =
    settings?.clauses && settings.clauses.length > 0
      ? settings.clauses
      : DEFAULT_CHECKOUT_POLICY_CLAUSES;
  return configured.filter((clause) => clauseApplies(clause, listingTypes));
}

export function resolveCheckoutPolicyVersion(
  settings: CheckoutPolicySettings | undefined,
): number {
  return typeof settings?.version === "number" && settings.version > 0
    ? settings.version
    : DEFAULT_CHECKOUT_POLICY_VERSION;
}

/*
 * U+001F (unit separator) joins the fields of one clause; U+001E (record
 * separator) joins clauses. Written as escapes rather than literal control
 * bytes so the delimiters survive any editor or copy-paste.
 *
 * 🛑 Why not `|`: a single-character printable delimiter lets one clause
 * reading "A|B" hash identically to two clauses "A" and "B". Neither
 * separator below can appear in admin-authored policy text, so no clause can
 * forge a boundary.
 */
const FIELD_SEP = "\u001f";
const CLAUSE_SEP = "\u001e";

/**
 * The exact bytes the hash is taken over.
 *
 * 🛑 Canonical and explicit, never `JSON.stringify(clauses)`. Key order in a
 * stringified object is an implementation detail, and a hash that changed
 * because a field moved would invalidate every buyer's acceptance on a no-op
 * edit. Only `id` and `text` participate: those are what the buyer actually
 * read. The predicate is how we DECIDED to show it, which is our business and
 * not part of what they agreed to.
 */
export function canonicalisePolicyClauses(
  /*
   * Only `id` and `text` are required, not a whole `CheckoutPolicyClause` —
   * so the STORED snapshot on an order (which keeps those two fields and
   * drops the predicate) re-hashes to the identical digest as the live
   * resolution it came from. Demanding the full shape here would mean the
   * hash could only ever be verified against settings, i.e. against
   * whatever the policy says today, which is precisely what the stored
   * snapshot exists to avoid.
   */
  clauses: readonly { id: string; text: string }[],
): string {
  return clauses
    .map((clause) => `${clause.id}${FIELD_SEP}${clause.text}`)
    .join(CLAUSE_SEP);
}

/**
 * What the buyer is shown, and what they must echo back.
 *
 * The client never computes the hash — it receives this object and returns the
 * `version`/`hash` it was given. The server re-resolves both from the cart and
 * compares. So a tampered hash cannot widen anything: it can only fail the
 * comparison, which is a refusal.
 */
export interface CheckoutPolicyOffer {
  version: number;
  hash: string;
  clauses: CheckoutPolicyClause[];
}

/**
 * THE CONSENT RECORD, as stamped onto every order the consent covers.
 *
 * 🛑 `clauses` carries the VERBATIM TEXT, not a pointer to the current
 * settings. A pointer to "whatever the policy says today" is worthless in a
 * dispute — the whole question is what the buyer was shown at the time, and an
 * admin editing a clause afterwards would rewrite history. The hash lets
 * anyone confirm the stored text is the text that was hashed; the stored text
 * is what makes the hash mean anything.
 */
export interface OrderPolicyConsent {
  /** The `buyerPolicyConsents` document this order's consent was recorded as. */
  consentId: string;
  /** Who agreed. Duplicated from the order's `userId` so the record stands alone. */
  buyerId: string;
  /** `siteSettings.checkoutPolicies.version` in force when they agreed. */
  version: number;
  /** `sha256(canonicalisePolicyClauses(clauses))`, hex. */
  hash: string;
  acceptedAt: Date;
  /** Verbatim — see the 🛑 above. */
  clauses: { id: string; text: string }[];
  /**
   * Which checkout path captured it. A dispute asks "where did this consent
   * come from", and on the gateway path the answer is "the create-order
   * request, before the money moved" — the fact that makes the pre-capture
   * enforcement provable rather than asserted.
   */
  capturedOn: "checkout" | "gateway-create-order" | "admin-bypass";
}
