// [SCHEMA] server-errors feature — Firestore document schema.
//
// Mirrors ServerErrorDocument in ./firestore.ts. Registered into
// SCHEMAS.firestore.serverErrors via appkit/src/schemas/registry.ts.

import { z } from "zod";

export * from "./firestore";

export const serverErrorSourceSchema = z.enum(["vercel", "client", "function"]);

export const serverErrorFirestoreSchema = z.object({
  id: z.string(),
  occurredAt: z.number(),
  source: serverErrorSourceSchema,
  route: z.string(),
  method: z.string().optional(),
  userId: z.string().optional(),
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  requestId: z.string(),
  userAgent: z.string().optional(),
  bodyDigest: z.string().optional(),
});

export type ServerErrorFromSchema = z.infer<typeof serverErrorFirestoreSchema>;
