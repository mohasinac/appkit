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
//
// W2–W7 incrementally populate the buckets. W1 ships the empty scaffold.

import type { SchemaRegistry } from "./types";

// ---------------------------------------------------------------------------
// Firestore document schemas — populated by W2 as each missing Zod schema is
// authored. Seed-table coverage is enforced by `audit-firestore-schema-coverage`.
// Existing schemas re-export through here without forking.
// ---------------------------------------------------------------------------
const firestore = {
  // Populated in W2. Each entry: <collection>: <feature>FirestoreSchema.
} as const;

// ---------------------------------------------------------------------------
// API route schemas — populated by W4 as each route is bound to schema.
// Key shape: `${verb} ${pathPattern}`, e.g. "POST /api/wishlist".
// ---------------------------------------------------------------------------
const api = {
  // Populated in W4. Each entry: [key]: { body?, query?, params?, response? }.
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
// Webhook envelope schemas — populated by W7. Each provider registers a bucket
// of `eventName` → `z.discriminatedUnion` envelope.
// ---------------------------------------------------------------------------
const webhook = {
  // Populated in W7. Buckets: razorpay, shiprocket, googleOauth, etc.
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
