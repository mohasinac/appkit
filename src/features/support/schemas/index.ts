// [SCHEMA] support tickets feature — Firestore document schema.
//
// Mirrors SupportTicketDocument + TicketMessage + TicketRelatedParties in
// ./firestore.ts. Registered into SCHEMAS.firestore.supportTickets.

import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema } from "../../../schemas/firestore-helpers";

export * from "./firestore";

export const ticketCategorySchema = z.enum([
  "order_issue",
  "billing_payment",
  "account",
  "listing_dispute",
  "scam_report",
  "refund_request",
  "auction_dispute",
  "general",
  "store_change_request",
  "order_modification_request",
  "unban_request",
]);

export const ticketStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_on_user",
  "resolved",
  "closed",
]);

export const ticketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const ticketMessageAuthorRoleSchema = z.enum(["user", "support", "admin"]);

export const ticketMessageSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorRole: ticketMessageAuthorRoleSchema,
  body: z.string(),
  attachments: z.array(z.string()).optional(),
  createdAt: firestoreDateSchema,
});

export const ticketRelatedPartiesSchema = z.object({
  userId: z.string().optional(),
  storeId: z.string().optional(),
  orderId: z.string().optional(),
  productId: z.string().optional(),
  bidId: z.string().optional(),
});

export const supportTicketFirestoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  userDisplayName: z.string(),
  category: ticketCategorySchema,
  subject: z.string(),
  description: z.string(),
  orderId: z.string().optional(),
  relatedParties: ticketRelatedPartiesSchema.optional(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  internalNotes: z.string().optional(),
  messages: z.array(ticketMessageSchema),
  resolvedAt: firestoreDateSchema.optional(),
  closedAt: firestoreDateSchema.optional(),
  ...auditTimestampsShape,
});

export type SupportTicketFromSchema = z.infer<typeof supportTicketFirestoreSchema>;
