// [SCHEMA] Central schema registry.
//
// SCHEMAS is the single source of truth for every Zod schema used at a
// system boundary. Per-feature schema files (`features/<f>/schemas/index.ts`)
// register into the relevant bucket here; nothing else forks the tree.
//
// Reading SCHEMAS:
//   - SCHEMAS.firestore[collection] — Firestore document schema, used by
//     `withConverter()` in the matching repository so `.data()` returns the
//     parsed shape (not `DocumentData`).
//   - SCHEMAS.api["POST /api/wishlist"] — { body?, query?, params?, response? }
//     bundle, used by `createRouteHandler({ schema: { body: "POST /api/wishlist" } })`.
//   - SCHEMAS.forms[formId] — used by FormShell / QuickFormDrawer.
//   - SCHEMAS.sieve[collection] — filter-grammar schema per repository.
//   - SCHEMAS.webhook[provider][event] — discriminated-union envelopes per provider.
//   - SCHEMAS.rtdb[pathPattern] — Realtime Database channel payload.
//   - SCHEMAS.storage[op] — signed-upload metadata.
//
// To register a new schema:
//   1. Author the Zod schema in the relevant `features/<f>/schemas/index.ts`.
//   2. Import it here (alphabetically inside its bucket) and add an entry.
//   3. The completeness audit (`appkit/scripts/audit-schema-registry-completeness.mjs`)
//      asserts every feature export appears in SCHEMAS, every API route in
//      `src/app/api/**` has an entry, and every Firestore collection in the
//      CLAUDE.md seed table has a `firestore.<collection>` entry.

import type { SchemaRegistry } from "./types";

// ── W2 — Firestore document schemas ──────────────────────────────────────────
import { addressFirestoreSchema } from "../features/addresses/schemas";
import { blogPostFirestoreSchema } from "../features/blog/schemas";
import { categoryFirestoreSchema } from "../features/categories/schemas";
import { conversationFirestoreSchema } from "../features/messages/schemas";
import {
  carouselFirestoreSchema,
  carouselSlideFirestoreSchema,
  homepageSectionFirestoreSchema,
} from "../features/homepage/schemas";
import { faqFirestoreSchema } from "../features/faq/schemas";
import { groupedListingFirestoreSchema } from "../features/grouped/schemas";
import { orderFirestoreSchema } from "../features/orders/schemas";
import { payoutFirestoreSchema } from "../features/payments/schemas";
import {
  claimedCouponFirestoreSchema,
  couponFirestoreSchema,
  couponUsageFirestoreSchema,
} from "../features/promotions/schemas";
import { reviewFirestoreSchema } from "../features/reviews/schemas";
import {
  scammerCommentFirestoreSchema,
  scammerContestFirestoreSchema,
  scammerFirestoreSchema,
  scammerIncidentFirestoreSchema,
} from "../features/scams/schemas";
import { serverErrorFirestoreSchema } from "../features/server-errors/schemas";
import { storeFirestoreSchema } from "../features/stores/schemas";
import { supportTicketFirestoreSchema } from "../features/support/schemas";

// ---------------------------------------------------------------------------
// Firestore document schemas — populated by W2.
//
// Coverage of the CLAUDE.md § Seed Data Reference table. Collections marked
// (W2) were authored as part of the W2 workstream; others rely on schemas
// already shipped in pre-existing per-feature files. The
// `audit-firestore-schema-coverage` audit will surface any drift between this
// map and the live seed table.
// ---------------------------------------------------------------------------
const firestore = {
  addresses: addressFirestoreSchema,                         // W2
  blogPosts: blogPostFirestoreSchema,                        // W2
  carousels: carouselFirestoreSchema,                        // W2
  carouselSlides: carouselSlideFirestoreSchema,              // W2
  categories: categoryFirestoreSchema,                       // W2
  claimedCoupons: claimedCouponFirestoreSchema,              // W2
  conversations: conversationFirestoreSchema,                // W2
  coupons: couponFirestoreSchema,                            // W2
  couponUsage: couponUsageFirestoreSchema,                   // W2
  faqs: faqFirestoreSchema,                                  // W2
  groupedListings: groupedListingFirestoreSchema,            // W2
  homepageSections: homepageSectionFirestoreSchema,          // W2
  orders: orderFirestoreSchema,                              // W2
  payouts: payoutFirestoreSchema,                            // W2
  reviews: reviewFirestoreSchema,                            // W2
  scammerProfiles: scammerFirestoreSchema,                   // W2
  scammerIncidents: scammerIncidentFirestoreSchema,          // W2 (subcollection)
  scammerComments: scammerCommentFirestoreSchema,            // W2 (subcollection)
  scammerContests: scammerContestFirestoreSchema,            // W2 (subcollection)
  serverErrors: serverErrorFirestoreSchema,                  // W2
  stores: storeFirestoreSchema,                              // W2
  supportTickets: supportTicketFirestoreSchema,              // W2
  // Remaining CLAUDE.md collections (users, brands, products, bids, carts,
  // wishlists, history, events, eventEntries, notifications, sessions,
  // siteSettings) wire in via their pre-existing Zod schemas — registered as
  // those are touched in W5/W7.
} as const;

// ---------------------------------------------------------------------------
// API route schemas — W4 seed cohort. Each entry maps an HTTP-verb-and-path
// key to its `{ body?, query?, params?, response? }` schema bundle. The
// `createRouteHandler` helper accepts either a direct Zod schema or one of
// these keys.
// ---------------------------------------------------------------------------
import {
  postApiWishlist,
  postApiAuthSession,
  postApiAdminProductsIdGroup,
  postApiMediaSign,
  postApiMediaFinalize,
  getApiSearchSuggestions,
} from "./api-routes";

const api = {
  "POST /api/wishlist": postApiWishlist,
  "POST /api/auth/session": postApiAuthSession,
  "POST /api/admin/products/[id]/group": postApiAdminProductsIdGroup,
  "POST /api/media/sign": postApiMediaSign,
  "POST /api/media/finalize": postApiMediaFinalize,
  "GET /api/search/suggestions": getApiSearchSuggestions,
} as const;

// ---------------------------------------------------------------------------
// Form schemas — keyed by form id (matches FormShell/QuickFormDrawer `formId`).
// `audit-form-schema` already enforces presence at FormShell sites; this
// registry centralizes the schemas for cross-route reuse.
// ---------------------------------------------------------------------------
const forms = {
  // Populated in W5 as section builders + admin forms are tightened.
} as const;

// ---------------------------------------------------------------------------
// Sieve filter-grammar schemas — populated by W6. Each collection registers
// a Zod schema for its filter clauses so `listingProcessor` and per-repo
// `parseSieveFilters` return typed clauses (not `Record<string, unknown>`).
// ---------------------------------------------------------------------------
const sieve = {
  // Populated in W6.
} as const;

// ---------------------------------------------------------------------------
// Webhook envelope schemas — W7 cohort. Each provider registers a bucket
// of `eventName` → schema. The Razorpay envelope is a discriminated union
// keyed on the `event` discriminator.
// ---------------------------------------------------------------------------
import { razorpayWebhookEnvelopeSchema } from "./webhooks/razorpay";
import { shiprocketTrackingUpdateSchema } from "./webhooks/shiprocket";
import {
  googleSignInWithIdpResponseSchema,
  googleTokenInfoSchema,
} from "./webhooks/google-oauth";

const webhook = {
  razorpay: {
    envelope: razorpayWebhookEnvelopeSchema,
  },
  shiprocket: {
    trackingUpdate: shiprocketTrackingUpdateSchema,
  },
  googleOauth: {
    signInWithIdp: googleSignInWithIdpResponseSchema,
    tokenInfo: googleTokenInfoSchema,
  },
} as const;

// ---------------------------------------------------------------------------
// RTDB channel schemas — populated by W5/W6. Path keys mirror the live RTDB
// tree (e.g. "chats/{convId}/lastUpdate", "auth/google/{uid}").
// ---------------------------------------------------------------------------
const rtdb = {
  // Populated in W5/W6.
} as const;

// ---------------------------------------------------------------------------
// Storage metadata schemas — populated by W4 (mediaSign, mediaFinalize).
// ---------------------------------------------------------------------------
const storage = {
  // Populated in W4.
} as const;

// ---------------------------------------------------------------------------
// Composed registry. `as const satisfies SchemaRegistry` preserves the literal
// keys at the type level so consumers get autocomplete on registered routes,
// collections, forms, etc.
// ---------------------------------------------------------------------------

export const SCHEMAS = {
  firestore,
  api,
  forms,
  sieve,
  webhook,
  rtdb,
  storage,
} as const satisfies SchemaRegistry;

export type SchemasShape = typeof SCHEMAS;

// Derived literal-key types — useful for `createRouteHandler` schema binding
// and for the audits.
export type RegisteredApiRouteKey = keyof SchemasShape["api"];
export type RegisteredFirestoreCollection = keyof SchemasShape["firestore"];
export type RegisteredFormId = keyof SchemasShape["forms"];
export type RegisteredSieveCollection = keyof SchemasShape["sieve"];
export type RegisteredWebhookProvider = keyof SchemasShape["webhook"];
export type RegisteredRtdbChannel = keyof SchemasShape["rtdb"];
export type RegisteredStorageOp = keyof SchemasShape["storage"];

// ---------------------------------------------------------------------------
// Lookup helpers — preferred over reaching into SCHEMAS directly so call sites
// surface a typed error when the key isn't registered.
// ---------------------------------------------------------------------------

export function lookupApiSchema<K extends RegisteredApiRouteKey>(
  key: K,
): SchemasShape["api"][K] {
  const entry = SCHEMAS.api[key];
  if (!entry) {
    throw new Error(`[schemas] No API schema registered for route "${String(key)}".`);
  }
  return entry;
}

export function lookupFirestoreSchema<K extends RegisteredFirestoreCollection>(
  collection: K,
): SchemasShape["firestore"][K] {
  const entry = SCHEMAS.firestore[collection];
  if (!entry) {
    throw new Error(`[schemas] No Firestore schema registered for "${String(collection)}".`);
  }
  return entry;
}
