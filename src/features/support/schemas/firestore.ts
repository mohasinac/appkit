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
export const ELIGIBLE_ORDER_STATUSES_FOR_TICKET = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "RETURN_REQUESTED",
] as const;

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

export interface SupportTicketDocument extends BaseDocument {
  userId: string;
  /** Denormalized — for admin table display. */
  userEmail: string;
  /** Denormalized — for admin table display. */
  userDisplayName: string;

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
  assignedToName?: string;

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
  closedAt?: Date;

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

export type SupportTicketCreateInput = Pick<
  SupportTicketDocument,
  | "userId"
  | "userEmail"
  | "userDisplayName"
  | "category"
  | "subject"
  | "description"
  | "orderId"
  | "storeId"
>;

export type SupportTicketUpdateInput = Partial<
  Pick<
    SupportTicketDocument,
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
