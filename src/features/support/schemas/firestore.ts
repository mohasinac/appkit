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

export interface TicketMessage {
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
// SUPPORT TICKET DOCUMENT
// ============================================================================

export interface SupportTicketDocument {
  id: string;
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

  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
>;

export type SupportTicketUpdateInput = Partial<
  Pick<
    SupportTicketDocument,
    | "status"
    | "priority"
    | "assignedTo"
    | "assignedToName"
    | "internalNotes"
    | "resolvedAt"
    | "closedAt"
  >
>;

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

export const SUPPORT_TICKET_COLLECTION = "supportTickets" as const;

export const SUPPORT_TICKET_ID_PREFIX = "ticket-" as const;

export const SUPPORT_TICKET_INDEXED_FIELDS = [
  "userId",
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
