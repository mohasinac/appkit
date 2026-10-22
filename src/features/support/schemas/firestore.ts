/**
 * Support Ticket Firestore Document Types & Constants
 *
 * Canonical types for the supportTickets collection. Tickets are the primary
 * channel through which users contest bans and report order/billing issues.
 *
 * Collection: supportTickets
 * Document ID prefix: ticket- (semantic, no auto-ID)
 *
 * Ticket creation rules (enforced server-side, never client-trusted):
 *  - Max 2 active general tickets per user
 *  - Max 1 ticket per active (non-completed) order
 *  - No guest creation — authentication required
 *  - No creation if user has create_support_tickets soft ban
 *  - No new ticket in the same category while existing one is waiting_on_user
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

// ============================================================================
// ENUMS
// ============================================================================

export const TicketCategoryValues = {
  ORDER_ISSUE: "order_issue",
  BILLING_PAYMENT: "billing_payment",
  ACCOUNT: "account",
  LISTING_DISPUTE: "listing_dispute",
  SCAM_REPORT: "scam_report",
  REFUND_REQUEST: "refund_request",
  AUCTION_DISPUTE: "auction_dispute",
  GENERAL: "general",
  // ST-4 — sellers request admin-only field changes on their store
  // (status / capabilities / isVerified) through this category.
  STORE_CHANGE_REQUEST: "store_change_request",
  // ST-3 — buyers/sellers request mutation of order line items
  // (wrong item shipped, partial fulfilment, bundle correction).
  ORDER_MODIFICATION_REQUEST: "order_modification_request",
  /*
   * Phase 10 — a formal grievance, with a statutory clock.
   *
   * 🛑 Its own category rather than `general` with a flag, because the
   * category is what the admin queue filters by and what decides whether
   * `dueAt` is set. A grievance filed as `general` is a grievance nobody can
   * find, and the clock would be invisible — which is the whole failure this
   * closes (D18: no form, no route, no record, only a `mailto:`).
   */
  GRIEVANCE: "grievance",
  // ST-5 — users appeal a soft-ban or hard-ban via this category.
  // Server bypasses the create_support_tickets soft-ban guard and the
  // active-ticket limit so the user always has an appeal channel.
  UNBAN_REQUEST: "unban_request",
} as const;

export type TicketCategory =
  (typeof TicketCategoryValues)[keyof typeof TicketCategoryValues];

export const TicketStatusValues = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING_ON_USER: "waiting_on_user",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type TicketStatus =
  (typeof TicketStatusValues)[keyof typeof TicketStatusValues];

export const TicketPriorityValues = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TicketPriority =
  (typeof TicketPriorityValues)[keyof typeof TicketPriorityValues];

/** Statuses considered "active" for limit-enforcement purposes. */
export const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_on_user",
];

/** Order statuses that are eligible for a support ticket. */
/**
 * 🛑 THIS CONSTANT IS DEAD — it has no consumer, and that CORRECTS D22.
 *
 * The plan records: *"`DELIVERED` is absent from
 * `ELIGIBLE_ORDER_STATUSES_FOR_TICKET` — the status most money complaints arise
 * in — as is `REFUNDED`"*, and concludes a buyer whose delivered order is wrong
 * *"may be unable to attach a ticket to it"*.
 *
 * Measured: the only references anywhere are this declaration and its
 * re-export from `appkit/src/index.ts`. **`createTicket` applies no order-status
 * gate at all**, so nothing is excluded and no buyer is blocked. The list is
 * also in UPPERCASE while `OrderStatus` is lowercase, so had anything compared
 * against it directly it would have matched *nothing* and blocked EVERY order —
 * the Root Cause #33 shape, latent.
 *
 * Left in place rather than deleted: it is exported from the public barrel, so
 * removing it is a breaking change for a consumer, and `DELIVERED`/`REFUNDED`
 * are added so that if anything ever does consume it, it is correct on the day
 * it becomes live rather than wrong in the direction the plan feared.
 *
 * The plan's other D22 claims are also stale and worth recording:
 * `resolvedAt`/`closedAt` DO have a writer (`support.repository.ts` stamps them
 * on the transition into RESOLVED, fixed 2026-08-26), and no per-order ticket
 * limit is enforced anywhere. What was genuinely missing is the CLOCK —
 * `acknowledgedAt`, `dueAt`, `firstResponseAt`, `disputedAmount` — which Phase
 * 10 adds above.
 */
export const ELIGIBLE_ORDER_STATUSES_FOR_TICKET = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "RETURN_REQUESTED",
  // Added for correctness-if-ever-used: these are the statuses most money
  // complaints arise in, and their absence is what D22 flagged.
  "DELIVERED",
  "REFUNDED",
] as const;

/**
 * Statutory grievance periods, in hours. **Defaults, pending the owner.**
 *
 * 🛑 I am not asserting the real statutory numbers from memory. These are
 * placeholders chosen to be *shorter* than any plausible statutory period, so
 * the internal clock fires EARLY rather than late — a deadline we beat is
 * harmless, one we miss is the thing the regime exists to punish.
 *
 * Nothing published reads these. The public `/grievance` page is untouched
 * until the owner supplies a named officer and the actual periods (D17), at
 * which point these become the `settingPath`-backed values.
 */
export const GRIEVANCE_PERIODS = {
  /** Acknowledge receipt within this. */
  acknowledgeHours: 48,
  /** Resolve within this. */
  resolveHours: 30 * 24,
} as const;

// ============================================================================
// TICKET MESSAGE
// ============================================================================

export type TicketMessage = {
  id: string;
  authorId: string;
  authorRole: "user" | "support" | "admin";
  /** Plain text or safe HTML body. */
  body: string;
  /** Media URLs (screenshots, attachments — /media/ proxy URLs, never raw Storage). */
  attachments?: string[];
  createdAt: Date;
}

// ============================================================================
// LINKED PARTIES (ST-6)
// ============================================================================

/**
 * Subject entities a ticket concerns. Assigned by admin/support agents so a
 * single ticket can reference the buyer, store, order, product, or bid in
 * dispute. Used to render clickable chips in the ticket detail view that link
 * to the relevant admin detail page.
 */
export interface TicketRelatedParties {
  userId?: string;
  storeId?: string;
  orderId?: string;
  productId?: string;
  bidId?: string;
}

// ============================================================================
// SUPPORT TICKET DOCUMENT
// ============================================================================

/**
 * `SupportTicketDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type SupportTicketPlain = Plaintext<SupportTicketDocument>;

export interface SupportTicketDocument extends BaseDocument {
  userId: string;
  /** Denormalized — for admin table display. */
  userEmail: Encrypted<string>;
  /** Denormalized — for admin table display. */
  userDisplayName: Encrypted<string>;

  category: TicketCategory;
  subject: string;
  /** Initial description written by the user when opening the ticket. */
  description: string;

  /** Linked order ID — required when category === "order_issue". */
  orderId?: string;

  /**
   * The store this ticket is ABOUT, when it is about one.
   *
   * 🛑 Top-level and indexed, unlike `relatedParties.storeId`. That field
   * exists and cannot serve a query: it is not in
   * `SUPPORT_TICKET_INDEXED_FIELDS`, not in the repository's `SIEVE_FIELDS`,
   * and has no composite index — so "every ticket about my store" was
   * unanswerable, which is why no seller support surface existed.
   *
   * `relatedParties.storeId` stays as what it always was: the admin's
   * after-the-fact linkage, set through the ST-6 panel. This one is set at
   * creation, by the seller-facing route, and is what the seller's own list
   * queries on.
   */
  storeId?: string;

  /**
   * ST-6 — subjects of the ticket. Admin/support assignable. `orderId` is
   * mirrored here for consistency when set via the linked-parties panel.
   */
  relatedParties?: TicketRelatedParties;

  status: TicketStatus;
  priority: TicketPriority;

  /** UID of the assigned employee. */
  assignedTo?: string;
  /** Denormalized display name of the assignee. */
  assignedToName?: Encrypted<string>;

  /**
   * Internal-only notes visible only to admins/employees, never shown to the ticket author.
   * Append-only — never overwrite, always append with timestamp.
   */
  internalNotes?: string;

  /** Threaded conversation. Ordered by createdAt asc. */
  messages: TicketMessage[];

  /**
   * Word-prefix search tokens. Derived on write by `buildSearchTxtFor`.
   *
   * 🛑 Built from `subject` ONLY — not `description`, and not the message
   * bodies. Those are PII-encrypted at rest (`SUPPORT_TICKET_PII_FIELDS`), and
   * a plaintext token index over an encrypted field hands back exactly what
   * the encryption was there to withhold. The subject is what an admin scans a
   * list by, and it is not encrypted.
   */
  searchTxt?: string[];

  /**
   * Stamped by the repository the first time `status` becomes `resolved` /
   * `closed`. Both were declared, given `SUPPORT_TICKET_FIELDS` constants and
   * listed in `SupportTicketUpdateInput` — and **nothing ever wrote either**
   * (verified 2026-08-26), so no resolved ticket in the collection carries a
   * resolution time and "how long do tickets take" has never been answerable.
   *
   * Server-stamped, never client-sent: the same discipline the reports route
   * adopted after a client-sent `resolvedAt` arrived as a JSON string into a
   * `Date` field and split the collection into two shapes.
   */
  resolvedAt?: Date;
  /**
   * The uid of whoever moved the ticket to `resolved`.
   *
   * 🛑 **Not `assignedTo`.** That is the CURRENT assignee and moves on
   * reassignment, so paying from it credits whoever holds the ticket at period
   * end rather than whoever did the work. Employee pay is computed from this
   * field; see `resolvedTicketsForPeriod`.
   *
   * Server-stamped, never client-sent, and **cleared on reopen** — pay counts
   * tickets still resolved at period end, so a reopened ticket must stop
   * counting or closing it twice pays twice.
   *
   * Absent on a system transition and on a buyer-driven one: both are real
   * resolutions that earn nobody wages, and a fallback to the assignee would
   * be a wage attributed to someone who did nothing.
   */
  resolvedBy?: string;
  closedAt?: Date;

  /*
   * ── THE STATUTORY CLOCK (Phase 10) ───────────────────────────────────────
   *
   * Only meaningful on `category: "grievance"`. Optional on every other
   * category rather than split into a second collection, because a grievance
   * IS a support ticket with a deadline — and a separate collection would mean
   * two inboxes, two list views, and the one you forget being the one with the
   * legal clock on it.
   *
   * 🛑 Built against CONFIGURABLE periods and publishing nothing. The
   * Consumer Protection (E-Commerce) Rules 2020 require a named grievance
   * officer and statutory acknowledgement/resolution periods, and this project
   * currently publishes neither — `BUSINESS_GRIEVANCE_NAME` is the business
   * name, the designation is "Support", and the contact is the same generic
   * support address, so there is no escalation tier at all (D17).
   *
   * I am deliberately NOT asserting the statutory numbers from memory. A
   * published timeline we then miss is worse than the present silence, so the
   * intake measures against `GRIEVANCE_PERIODS` (defaults below) and the
   * public page stays untouched until the owner supplies the officer and the
   * real periods.
   */

  /** When we acknowledged receipt. Server-stamped at intake. */
  acknowledgedAt?: Date;
  /**
   * The resolution deadline.
   *
   * 🛑 A hard date, like a chargeback's `respond_by` — not an SLA we invented
   * for comfort. It is what makes "how long do tickets take" answerable for
   * the first time, which is the evidence a grievance regime actually requires.
   */
  dueAt?: Date;
  /**
   * When a human first replied — distinct from `acknowledgedAt`, which is
   * automatic. An acknowledgement is a receipt; a first response is a person.
   * Conflating them would let an auto-reply satisfy a human obligation.
   */
  firstResponseAt?: Date;
  /**
   * The amount in dispute, in decimal rupees.
   *
   * Structured rather than left in the prose, because a money complaint whose
   * amount an admin has to read out of a paragraph cannot be sorted, totalled
   * or prioritised — and "which open grievances are worth the most" is the
   * first question anyone asks of this queue.
   */
  disputedAmount?: number;

  /**
   * Who changed what, when, and why. See § "Status History" in CLAUDE.md.
   * Append-only, capped at STATUS_HISTORY_MAX, oldest evicted first.
   */
  statusHistory?: StatusChangeEntry[];
  /** How many entries fell off the front. Never imply "this is all of it". */
  statusHistoryTruncated?: number;
}

/**
 * The fields whose changes earn a timeline entry.
 *
 * Explicit, not a whole-document diff: a diff would record the `updatedAt`
 * bump on every write and exhaust the 50-entry cap within days. `messages` is
 * excluded on purpose — the thread is already the conversation, and mirroring
 * every reply into history would bury the handful of transitions anyone reads.
 */
export const SUPPORT_TICKET_TRACKED_FIELDS = [
  "status",
  "priority",
  "assignedTo",
  "resolvedAt",
  "closedAt",
] as const;

/**
 * PII on this document, for `withHistory`'s scrub.
 *
 * `assignedToName` is a staff display name denormalised for the admin table —
 * not the ticket author's identity — but it is still a person's name reaching
 * an array `encryptPiiFields` cannot descend into, so history carries the UID
 * (`assignedTo`) and never the name.
 */
export const SUPPORT_TICKET_PII_FIELDS = [
  "userEmail",
  "userDisplayName",
  "assignedToName",
] as const;

// ============================================================================
// INPUT TYPES
// ============================================================================

/*
 * 🛑 Derived from the PLAIN shape — a caller supplies a real email/name and
 * `BaseRepository`'s write hook encrypts the `piiFields` on the way down.
 */
export type SupportTicketCreateInput = Pick<
  SupportTicketPlain,
  | "userId"
  | "userEmail"
  | "userDisplayName"
  | "category"
  | "subject"
  | "description"
  | "orderId"
  | "storeId"
  /*
   * Phase 10 — the grievance clock, settable AT INTAKE.
   *
   * 🛑 Added to the Pick rather than cast past it at the call site. A
   * `as Parameters<typeof createTicket>[0]` would have compiled and the fields
   * would still have persisted (`createTicket` spreads `...input`), which is
   * exactly the shape of Root Cause #98: a cast at a boundary silences the one
   * type-level signal that the write and the contract disagree.
   *
   * Only the grievance path sets them; every other category leaves them
   * absent, which is why they are optional on the document.
   */
  | "acknowledgedAt"
  | "dueAt"
  | "disputedAmount"
>;

/*
 * 🛑 Derived from the PLAIN shape — a caller supplies a real email/name and
 * `BaseRepository`'s write hook encrypts the `piiFields` on the way down.
 */
export type SupportTicketUpdateInput = Partial<
  Pick<
    SupportTicketPlain,
    | "status"
    | "priority"
    | "assignedTo"
    | "assignedToName"
    | "internalNotes"
    | "relatedParties"
  >
>;

/*
 * `resolvedAt` / `closedAt` are deliberately NOT in the update input. They are
 * events, and the server is the only thing that knows when one happened —
 * letting a client send them is how the reports collection ended up holding
 * both Timestamps and ISO strings in one field.
 */

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

export const SUPPORT_TICKET_COLLECTION = "supportTickets" as const;

export const SUPPORT_TICKET_ID_PREFIX = "ticket-" as const;

export const SUPPORT_TICKET_INDEXED_FIELDS = [
  "userId",
  "storeId",
  "searchTxt",
  "status",
  "category",
  "priority",
  "assignedTo",
  "orderId",
  "createdAt",
  "updatedAt",
] as const;

export const DEFAULT_SUPPORT_TICKET_DATA: Partial<SupportTicketDocument> = {
  status: "open",
  priority: "normal",
  messages: [],
};

export const SUPPORT_TICKET_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  USER_EMAIL: "userEmail",
  USER_DISPLAY_NAME: "userDisplayName",
  CATEGORY: "category",
  SUBJECT: "subject",
  DESCRIPTION: "description",
  ORDER_ID: "orderId",
  STATUS: "status",
  PRIORITY: "priority",
  ASSIGNED_TO: "assignedTo",
  ASSIGNED_TO_NAME: "assignedToName",
  INTERNAL_NOTES: "internalNotes",
  MESSAGES: "messages",
  RESOLVED_AT: "resolvedAt",
  CLOSED_AT: "closedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
