/**
 * ORDER FLOWS — one state machine, per-mechanism transition rules as data.
 *
 * Owner, 2026-11-08: the config-over-code rule *"applies to roles as well as
 * other flows as well, and must."*
 *
 * So there is ONE machine. A listing type never gets its own states; it gets
 * different VALUES on the shared transitions, and those values key off
 * mechanisms rather than off the type name. Adding an eighth listing type adds
 * no state, no branch and no row here — it inherits the mechanism rules its
 * flags already select.
 *
 * Mocks: `mocks/08-orders.qm` (*Order card*, *Order flows*),
 *        `mocks/11-flows.qm` (*Sale flows*, *Grouped and support*).
 */

export type OrderState =
  | "placed"
  | "paid"
  | "awaiting_reveal"
  | "packed"
  | "shipped"
  | "delivered"
  | "closed"
  | "cancelled"
  | "return_requested"
  | "return_in_transit"
  | "return_received"
  | "refunded"
  | "disputed"
  | "under_review";

export interface TransitionRule {
  from: OrderState;
  to: OrderState;
  /** Who may perform it. `system` is an actor too — never a blank. */
  actor: "buyer" | "seller" | "support" | "admin" | "system";
  /** Permission required, when a human performs it. */
  permission?: string;
  /**
   * Only available when these mechanisms are ON for the listing. This is the
   * ONLY type-awareness in the machine, and it is indirect: mechanisms, not types.
   */
  requiresMechanism?: string[];
  /** Blocked when any of these mechanisms are ON. */
  blockedByMechanism?: string[];
  /** A reason string is stored with the transition. */
  reasonRequired?: boolean;
  /** Hours before the wait state auto-advances to `escalatesTo`. */
  timeoutHours?: number;
  escalatesTo?: OrderState;
  /** Gates that must all clear first — see `refundGates`. */
  gates?: string[];
  /** Writes a ledger entry. True for anything touching money. */
  ledger?: boolean;
  note?: string;
}

export const orderTransitionsSeedData: TransitionRule[] = [
  { from: "placed", to: "paid", actor: "system", ledger: true, note: "Webhook signature verified before the state changes." },

  // Reveal types hold between paid and packed; everything else packs directly.
  { from: "paid", to: "awaiting_reveal", actor: "system", requiresMechanism: ["reveal"] },
  { from: "awaiting_reveal", to: "packed", actor: "seller", permission: "order.fulfil", note: "Allocation has run." },
  { from: "paid", to: "packed", actor: "seller", permission: "order.fulfil", blockedByMechanism: ["reveal", "instantFulfilment"], timeoutHours: 24, escalatesTo: "disputed" },

  { from: "packed", to: "shipped", actor: "system", requiresMechanism: ["physicalShipping"], note: "Carrier pickup scan." },
  { from: "shipped", to: "delivered", actor: "system", requiresMechanism: ["physicalShipping"] },
  { from: "paid", to: "delivered", actor: "system", requiresMechanism: ["instantFulfilment"], note: "Codes are delivered at capture." },
  { from: "delivered", to: "closed", actor: "system", timeoutHours: 168, note: "The 7-day return window elapses." },

  // Cancellation — the window differs by mechanism, not by type name.
  { from: "paid", to: "cancelled", actor: "buyer", blockedByMechanism: ["reveal", "instantFulfilment"], reasonRequired: true, ledger: true },
  { from: "awaiting_reveal", to: "cancelled", actor: "buyer", requiresMechanism: ["cancelLockedByReveal"], reasonRequired: true, ledger: true, note: "Allowed until the REVEAL, not until the confirmation." },
  { from: "packed", to: "cancelled", actor: "seller", permission: "order.cancel", reasonRequired: true, ledger: true },
  { from: "cancelled", to: "refunded", actor: "system", ledger: true, note: "Full and automatic — nothing was allocated or shipped." },

  // Returns.
  { from: "delivered", to: "return_requested", actor: "buyer", requiresMechanism: ["returnsAllowed"], reasonRequired: true },
  { from: "return_requested", to: "return_in_transit", actor: "seller", permission: "order.fulfil", timeoutHours: 48, escalatesTo: "under_review" },
  { from: "return_in_transit", to: "return_received", actor: "seller", permission: "order.fulfil" },
  { from: "return_received", to: "refunded", actor: "support", permission: "order.refund", gates: ["reasonRecorded", "amountWithinCapture", "itemStateChecked", "aboveThresholdApproval", "ledgerWritten"], ledger: true },

  // Disputes.
  { from: "delivered", to: "disputed", actor: "buyer", reasonRequired: true, note: "Photos are a required element of the dispute form." },
  { from: "disputed", to: "under_review", actor: "support", permission: "order.support" },
  { from: "under_review", to: "refunded", actor: "support", permission: "order.refund", gates: ["reasonRecorded", "amountWithinCapture", "aboveThresholdApproval", "ledgerWritten"], timeoutHours: 48, escalatesTo: "under_review", ledger: true },
  { from: "under_review", to: "closed", actor: "support", permission: "order.support", reasonRequired: true },
];

export interface RefundGate {
  id: string;
  label: string;
  clearedBy: "system" | "support" | "admin";
  blocks: string;
  why: string;
}

/**
 * Every gate is a permission plus a recorded decision. "We will add approval
 * later" is the sentence that makes this unrecoverable, so all five are Phase 1.
 */
export const refundGatesSeedData: RefundGate[] = [
  { id: "reasonRecorded", label: "Reason recorded", clearedBy: "support", blocks: "any refund", why: "A refund with no reason cannot be audited." },
  { id: "amountWithinCapture", label: "Amount ≤ captured", clearedBy: "system", blocks: "over-refund", why: "The single largest money-loss path." },
  { id: "itemStateChecked", label: "Item state checked", clearedBy: "support", blocks: "refund on an undelivered return", why: "The second largest." },
  { id: "aboveThresholdApproval", label: "Approval above threshold", clearedBy: "admin", blocks: "high-value refunds", why: "One person cannot move large sums alone." },
  { id: "ledgerWritten", label: "Ledger entry written", clearedBy: "system", blocks: "closing the order", why: "The audit trail is the product." },
];

export interface WorkflowDefinition {
  key: string;
  label: string;
  /** Rendered by section.processGuide — the guide writes itself from these. */
  steps: { label: string; detail: string }[];
  requiresMechanism?: string[];
}

/**
 * The buyer-facing explanations. `section.processGuide` renders these, which is
 * why the help copy cannot drift from the machine: there is one source.
 */
export const workflowsSeedData: WorkflowDefinition[] = [
  {
    key: "flow.buying",
    label: "Buying",
    steps: [
      { label: "Find it", detail: "Search, paste a URL, or paste an ID." },
      { label: "Buy", detail: "Add to cart or buy now; the cart groups by seller." },
      { label: "Pay", detail: "One payment, one order per seller group." },
      { label: "Track", detail: "Tracking opens without signing in, with the order number plus email or phone." },
    ],
  },
  {
    key: "flow.offers",
    label: "Making an offer",
    requiresMechanism: ["offers"],
    steps: [
      { label: "Offer", detail: "Any amount. Every offer is public." },
      { label: "Final hour", detail: "Retraction is blocked; the buyout cap still ends it early." },
      { label: "Close", detail: "autoAward ON: highest wins. OFF: the seller picks within 48h." },
      { label: "Order", detail: "The winning offer becomes an ordinary order." },
    ],
  },
  {
    key: "flow.reveal",
    label: "Clearance reveal",
    requiresMechanism: ["reveal"],
    steps: [
      { label: "Reserve", detail: "Consent is recorded with the policy version shown." },
      { label: "Cancel window", detail: "Open until the REVEAL, not until the confirmation." },
      { label: "Reveal", detail: "Allocation runs once; everyone sees results together." },
      { label: "After", detail: "No cancel, no return, no coins — three flags on the type row." },
    ],
  },
  {
    key: "flow.support",
    label: "Getting help",
    steps: [
      { label: "Open", detail: "From an order, the omnibox, a tracking page, or help while signed out." },
      { label: "Classify", detail: "The form composes from the order's mechanisms and state." },
      { label: "Claim", detail: "An employee claims it and the SLA clock starts." },
      { label: "Close", detail: "A reason is recorded, a ledger entry written if money moved." },
    ],
  },
];

export const orderFlowsSeedData = {
  transitions: orderTransitionsSeedData,
  refundGates: refundGatesSeedData,
  workflows: workflowsSeedData,
};
