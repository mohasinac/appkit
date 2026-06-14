// [SCHEMA] Centrally-registered API route schemas (W4).
//
// Each entry maps an HTTP-verb-and-path key to its `{ body?, query?, params?,
// response? }` Zod bundle. Consumed by `createRouteHandler` when the route
// is bound via a key string instead of a direct schema:
//
//   export const POST = createRouteHandler({
//     schema: "POST /api/wishlist",
//     handler: async ({ body }) => { ... },
//   });
//
// The audit `audit-route-schema-registry` cross-checks this map against
// `src/app/api/**/route.ts` filesystem and blocks drift (W8).
//
// W4 ships a small seed cohort (the routes flagged by the boundary inventory
// as the highest unknown-leakage offenders). W5–W7 will register the rest.

import { z } from "zod";
import type { ApiRouteSchema } from "./types";

// ── POST /api/wishlist ────────────────────────────────────────────────────────
export const postApiWishlist: ApiRouteSchema = {
  body: z.object({
    productId: z.string().min(1),
  }),
};

// ── POST /api/auth/session ───────────────────────────────────────────────────
export const postApiAuthSession: ApiRouteSchema = {
  body: z.object({
    idToken: z.string().min(1),
  }),
};

// ── POST /api/admin/products/[id]/group ──────────────────────────────────────
export const postApiAdminProductsIdGroup: ApiRouteSchema = {
  body: z.object({
    groupTitle: z.string().min(1).max(120),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
};

// ── POST /api/media/sign ──────────────────────────────────────────────────────
export const postApiMediaSign: ApiRouteSchema = {
  body: z.object({
    contentType: z.string().min(1),
    filename: z.string().min(1),
    slug: z.string().min(1),
    size: z.number().int().positive(),
  }),
  response: z.object({
    uploadUrl: z.string().url(),
    publicUrl: z.string(),
  }),
};

// ── POST /api/media/finalize ──────────────────────────────────────────────────
export const postApiMediaFinalize: ApiRouteSchema = {
  body: z.object({
    slug: z.string().min(1),
    size: z.number().int().positive(),
  }),
};

// ── GET /api/search/suggestions ──────────────────────────────────────────────
export const getApiSearchSuggestions: ApiRouteSchema = {
  query: z.object({
    q: z.string().min(1).max(200),
    type: z.enum(["products", "stores", "categories", "brands"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};
