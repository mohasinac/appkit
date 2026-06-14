// [SCHEMA] messages / conversations feature — Firestore document schema.
//
// Mirrors ConversationDocument + ConversationMessage in ./firestore.ts.
// Registered into SCHEMAS.firestore.conversations.

import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema } from "../../../schemas/firestore-helpers";

export * from "./firestore";

export const conversationMessageSenderRoleSchema = z.enum(["buyer", "seller"]);
export const conversationStatusSchema = z.enum(["active", "archived", "blocked"]);

export const conversationMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderRole: conversationMessageSenderRoleSchema,
  body: z.string(),
  isRead: z.boolean(),
  sentAt: firestoreDateSchema,
  attachments: z.array(z.string()).optional(),
});

export const conversationFirestoreSchema = z.object({
  id: z.string(),
  buyerId: z.string(),
  buyerDisplayName: z.string(),
  storeId: z.string(),
  storeName: z.string(),
  sellerDisplayName: z.string(),
  productId: z.string().optional(),
  productTitle: z.string().optional(),
  messages: z.array(conversationMessageSchema),
  lastMessage: z.string(),
  lastMessageAt: firestoreDateSchema,
  unreadBuyer: z.number().int().nonnegative(),
  unreadSeller: z.number().int().nonnegative(),
  status: conversationStatusSchema,
  ...auditTimestampsShape,
});

export type ConversationFromSchema = z.infer<typeof conversationFirestoreSchema>;
export type ConversationMessageFromSchema = z.infer<typeof conversationMessageSchema>;
