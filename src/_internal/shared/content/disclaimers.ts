/**
 * Disclaimers — one registry, rendered by `<Disclaimer id>` (Phase 12).
 *
 * ## 🛑 Why a registry and not a sentence per surface
 *
 * Same failure mode as the published numbers in Phase 9: if each surface
 * writes its own, they drift, and **the legally material ones end up
 * weakest** — because the surface that most needs a careful disclaimer is
 * usually the one whose author was busiest. The scam registry is the example:
 * naming a person a scammer is defamation exposure, and it had no disclaimer
 * at all.
 *
 * ## The three rules every entry obeys
 *
 * 1. **Visible BEFORE the decision it qualifies**, not only on a policy page
 *    reachable from the footer. The protection disclaimer belongs beside the
 *    checkbox, not in `/refund-policy`.
 * 2. **It names a LIMIT or an EXCLUSION.** A disclaimer that only says "we
 *    try our best" qualifies nothing and is worse than none — it reads as
 *    cover while providing none.
 * 3. **It AGREES with the code.** Limits render from the constants that
 *    enforce them (`SALE_PROTECTION_MAX_VALUE`, the claim windows), through
 *    the same `{{token}}` mechanism as Phase 9, so a constant change updates
 *    the published terms rather than contradicting them.
 *
 * ## 🛑 NOT a cookie-banner blanket
 *
 * A disclaimer that appears everywhere is read nowhere. Each entry names the
 * specific surfaces that need it, and `audit-disclaimer-coverage` checks those
 * surfaces render one — not that every page does.
 */

export type DisclaimerId =
  /** Naming a person a scammer. The highest-exposure entry in this file. */
  | "scam-registry"
  /** Prize draws and the lottery — state-specific gaming law. */
  | "prize-draw"
  /** Collectibles shown with historical prices. */
  | "not-investment-advice"
  /** The realised-price index. */
  | "price-index"
  /** Authenticity and grading. */
  | "authenticity"
  /** Buyer protection cover — OUR cover, not insurance. */
  | "protection-cover"
  /** P&L, trial balance, GSTR-1 draft. */
  | "accounting-output"
  /** Live animals and plants. */
  | "live-items"
  /** Pre-orders. */
  | "pre-order"
  /** Auctions. */
  | "auction-binding"
  /** EMI. */
  | "emi"
  /** Delivery estimates. */
  | "delivery-estimate"
  /** Reviews, catalogue entries, blog comments. */
  | "user-content"
  /** GST shown on an invoice. */
  | "tax-computation"
  /** An automated decision — a timer cancelled, approved or completed something. */
  | "automated-decision";

export interface DisclaimerEntry {
  /** Short heading, when the surface renders one. Omit for inline notes. */
  heading?: string;
  /**
   * The text. May contain `{{token}}`s resolved by `resolvePublishedCopy`.
   *
   * 🛑 Must name a limit or an exclusion — see rule 2 in the header. An entry
   * that does not is not a disclaimer, and `audit-disclaimer-coverage` checks
   * for it rather than trusting the author.
   */
  body: string;
  /**
   * Tone, which decides the rendered variant.
   *
   * `legal` is the quiet grey note; `warning` is the one a user must not scroll
   * past. 🛑 Reserved for the entries where ignoring it has a consequence the
   * user cannot undo — not used to make a disclaimer feel important.
   */
  tone: "legal" | "warning";
  /**
   * Where this must appear, as a free-text note for the reviewer and the
   * audit's own registry.
   */
  surfaces: readonly string[];
}

export const DISCLAIMERS: Record<DisclaimerId, DisclaimerEntry> = {
  /*
   * ── 🛑 THE DEFAMATION ONE. Read this before editing it ────────────────────
   *
   * A scam profile names a real person, with their payment handle and their
   * phone number, on a public page. That is defamation exposure, and the
   * registry had NO disclaimer of any kind.
   *
   * Four things this text must do, each for a specific reason:
   *
   *  1. **Distinguish an ALLEGATION from a verified finding.** The status badge
   *     already says `pending_review` vs `verified`, but a visitor reads the
   *     name and the amount, not the badge — so the distinction has to be in
   *     words.
   *  2. **State the evidence standard**, because "we checked" is not a standard
   *     and invites the reader to assume a higher one than we applied.
   *  3. **Name the removal route.** A person named here needs a way to contest
   *     it that does not begin with a lawyer, and publishing one is itself part
   *     of the defence.
   *  4. 🛑 **Refuse the shared-guilt inference.** `relatedScammerIds` means
   *     SAME IDENTITY — the same person under another handle — and never
   *     "similar pattern". A reader who takes it as the latter concludes that
   *     everyone in a cluster is guilty of everyone else's conduct, which is
   *     the single most damaging misreading this page permits.
   */
  "scam-registry": {
    heading: "About these reports",
    body:
      "These are reports submitted by buyers and sellers, not findings of fact or a legal judgment. " +
      "A profile marked **under review** is an unverified allegation. A profile marked **verified** means " +
      "our team has seen supporting evidence — payment records, messages or delivery proof — supplied by the " +
      "person reporting; it is not a court finding and we are not able to investigate beyond the documents " +
      "we are shown. " +
      "Linked profiles indicate the SAME person under another name or handle, and never that separate people " +
      "are connected to each other's conduct. " +
      "If you are named here and believe it is wrong, contact us and we will review the report and remove it " +
      "if it is not supported.",
    tone: "warning",
    surfaces: ["ScamProfileView", "ScamRegistryView", "/report"],
  },

  /*
   * Gaming law in India is STATE-SPECIFIC, and the distinction that matters
   * legally is skill versus chance. The entry names the exclusions rather than
   * claiming a position we cannot defend in every state.
   */
  "prize-draw": {
    heading: "Prize draw terms",
    body:
      "Entry requires a purchase and is void where prohibited by local law. Residents of states that " +
      "restrict prize draws or games of chance are not eligible, and an entry from such a state will be " +
      "refunded rather than drawn. Prizes are as described on the listing, are not transferable and cannot " +
      "be exchanged for cash. The draw is run by {{siteName}} and is not affiliated with any government lottery.",
    tone: "warning",
    surfaces: ["PrizeDrawDetailPageView", "/prize-draws", "/lottery", "PrizeRevealModal"],
  },

  /*
   * 🛑 Shown wherever a historical price appears. Collectibles displayed with
   * past realised prices invite an appreciation inference, and the moment a
   * buyer treats that as a projection we are giving investment advice we are
   * not licensed to give.
   */
  "not-investment-advice": {
    body:
      "Prices shown are past transactions, not a valuation, a projection or a guarantee. Collectibles can " +
      "fall in value as easily as rise, may be difficult to sell at any price, and {{siteName}} does not provide " +
      "investment advice. Nothing here should be relied on as a reason to buy.",
    tone: "legal",
    surfaces: ["PriceIndexView", "RealisedPriceStrip", "/franchise", "ProductDetailPageView"],
  },

  /*
   * 🛑 Names the SAMPLE, because an index built from four sales reads exactly
   * like one built from four hundred — and "asked ≠ sold" is the distinction a
   * seller pricing against it most needs.
   */
  "price-index": {
    body:
      "Each figure is drawn from a limited number of observed sales over the period shown, and a small " +
      "sample can move sharply on one unusual transaction. Asking prices are not sale prices: an item " +
      "listed at a figure may never have sold at it.",
    tone: "legal",
    surfaces: ["PriceIndexView", "PriceBandChart"],
  },

  "authenticity": {
    body:
      "{{siteName}} is not an authentication or grading service. We do not inspect, test or re-grade items, " +
      "and a grade shown on a listing is the one the seller states a third-party grader assigned. " +
      "Guidance on spotting a counterfeit is general information, not a verification of any particular item.",
    tone: "legal",
    surfaces: ["/spot-a-fake", "ProductDetailPageView", "authenticityKnowledge"],
  },

  /*
   * 🛑 **"Not insurance" is the load-bearing phrase.** There is no insurer —
   * this is our own cover, funded by us, and calling it insurance would be a
   * regulatory misstatement as well as a false one.
   *
   * Every limit renders from the constant that enforces it, so a change to
   * `SALE_PROTECTION_MAX_VALUE` or a claim window updates this text rather
   * than contradicting it.
   */
  "protection-cover": {
    heading: "What protection covers",
    body:
      "Buyer protection is cover provided by {{siteName}}. It is **not insurance** and there is no insurer. " +
      "Shipment protection covers loss or damage in transit and must be claimed within " +
      "{{shipmentClaimHours}} hours of delivery. Sale protection covers an item up to " +
      "{{saleProtectionMaxValue}} and must be claimed within {{saleClaimHours}} hours of delivery. " +
      "Neither covers a change of mind, an item sold as final sale, or a claim made after its window has " +
      "closed.",
    tone: "legal",
    surfaces: ["StoreAddonsPicker", "/fees", "/refund-policy", "ProtectionClaimForm"],
  },

  /*
   * 🛑 "Management figures, not audited accounts" — and the GSTR-1 export is
   * the INPUT to a filing, never a filing. Implying a return had been filed
   * when it had not is the most consequential thing this product could say.
   */
  "accounting-output": {
    body:
      "These are management figures produced from this platform's own records. They are not audited " +
      "accounts and have not been reviewed by an accountant. The GSTR-1 export is a draft for your " +
      "accountant to check and use — nothing here is filed with any tax authority, and {{siteName}} has no " +
      "connection to the GST portal.",
    tone: "warning",
    surfaces: ["AdminInvoicingView", "AdminAnalyticsView", "ProfitLossView", "TrialBalanceView"],
  },

  "live-items": {
    heading: "Live item terms",
    body:
      "Live animals and plants ship only where law permits, and some species cannot be sent across state " +
      "or international borders at all — CITES-listed species in particular. The buyer is responsible for " +
      "holding any licence their own jurisdiction requires. No guarantee of health, size, sex or lifespan " +
      "is given beyond what the listing states, and a live item cannot be returned for a change of mind.",
    tone: "warning",
    surfaces: ["LiveItemDetailPageView", "/live"],
  },

  "pre-order": {
    body:
      "A release date on a pre-order is the manufacturer's estimate and can move or be cancelled by them. " +
      "Your deposit is refundable until the item ships; the remaining balance is charged when it is ready " +
      "to dispatch, against the terms shown when you placed the pre-order.",
    tone: "legal",
    surfaces: ["PreOrderDetailPageView", "/pre-orders"],
  },

  "auction-binding": {
    body:
      "A bid is a binding offer to buy at that price and cannot be withdrawn. If the reserve price is not " +
      "met the item does not sell, even if yours was the highest bid. Winning starts a payment window — " +
      "miss it and the win is forfeited.",
    tone: "warning",
    surfaces: ["PlaceBidForm", "AuctionDetailPageView", "/auctions"],
  },

  "emi": {
    body:
      "EMI adds a surcharge to the order total, shown before you pay. The instalment plan is between you " +
      "and {{siteName}} rather than a bank, and a missed instalment may suspend access to the order and is " +
      "recoverable as a debt.",
    tone: "legal",
    surfaces: ["CheckoutRouteClient", "/fees", "EmiScheduleTable"],
  },

  "delivery-estimate": {
    body:
      "Delivery dates are estimates from the courier, not guarantees, and can be affected by weather, " +
      "strikes and customs. A late delivery is not by itself grounds for a refund.",
    tone: "legal",
    surfaces: ["CheckoutRouteClient", "ProductDetailPageView", "OrderTrackView"],
  },

  "user-content": {
    body:
      "Reviews, catalogue entries and comments are the opinions of the people who wrote them, not " +
      "{{siteName}}'s. We remove content that breaks our rules when it is reported, but we do not verify every " +
      "claim made in it.",
    tone: "legal",
    surfaces: ["ReviewsList", "ReviewDetailShell", "PublicProfileView", "BlogPostView"],
  },

  "tax-computation": {
    body:
      "GST shown is computed from the information available to us at the time of supply — the item's tax " +
      "code and the delivery address you gave. Your own tax position, including any input credit, is yours " +
      "to determine with your accountant.",
    tone: "legal",
    surfaces: ["InvoicePageView", "/gst", "OrderSummary"],
  },

  /*
   * 🛑 The Phase 5b obligations act on timers — cancelling orders, approving
   * returns, completing orders. A buyer whose order was cancelled by a sweep
   * must be TOLD it was automatic and how to contest it; otherwise the first
   * they know is a refund they did not request, which reads as us losing their
   * order.
   */
  "automated-decision": {
    body:
      "This was done automatically, by a time limit rather than by a person. If you think it was wrong, " +
      "reply to this notification or open a support ticket and a person will look at it.",
    tone: "legal",
    surfaces: [
      "obligation notifications",
      "OrderStatusTimeline",
      "AdminObligationsView",
    ],
  },
};
