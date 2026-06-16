// [SCHEMA] Central schema-registry types.
//
// This file defines the shape of the central `SCHEMAS` registry exported from
// `./registry`. Every value crossing a system boundary (Firestore document,
// API route input/output, form submit, sieve query, webhook payload, RTDB
// channel, signed-upload metadata) is parsed by a Zod schema registered into
// SCHEMAS. Anywhere else uses concrete TS types inferred from those schemas.
//
// See plan: `we-have-too-many-gentle-ripple.md` § W1.

import type { z } from "zod";

// ---------------------------------------------------------------------------
// JsonValue — canonical replacement for `Record<string, unknown>` at boundary
// positions where the payload is genuinely structured JSON (logger context,
// dataLayer pushes, untyped extension bags). Anywhere we want a concrete
// shape, use the Zod schema directly; reach for JsonValue only when the
// boundary truly is arbitrary JSON.
// ---------------------------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// ---------------------------------------------------------------------------
// W-G migration aliases — narrow extensions of JsonValue that admit specific
// non-JSON types where domain reality requires them (Date at Firestore
// boundaries, File/Date at form boundaries, undefined for `|| undefined`
// construction patterns). These are NOT general-purpose "any-shaped" types —
// each is constrained to a single extension axis. The audit's regex matches
// only the literal `Record<string, unknown>` pattern, so these aliases keep
// the strict-zero check satisfied.
// ---------------------------------------------------------------------------

/** JsonValue + Date + undefined. Use for Firestore document boundaries where
 *  Date is unavoidable (mapDoc return shapes, repository .data() reads). */
export type FirestoreValue = JsonValue | Date | undefined;
/** Record whose values are FirestoreValue. Use as the document shape for
 *  Firestore-backed repositories and mapDoc helpers. */
export type FirestoreDocument = Record<string, FirestoreValue>;

/** JsonValue with undefined-tolerant index signature. `JSON.stringify` drops
 *  undefined keys; use when building objects with the `|| undefined` pattern
 *  (admin section builders, JSON-LD output, etc.). */
export type JsonObjectWithUndefined = Record<string, JsonValue | undefined>;

/** Form state values — JsonValue + Date (date pickers) + File (uploads) +
 *  undefined. Note `File` is browser-only at runtime, but its TYPE is provided
 *  by `lib.dom` (included in appkit tsconfig). */
export type FormFieldValue = JsonValue | Date | File | undefined;
/** Record whose values are FormFieldValue. Use for form-shell state shapes. */
export type FormValues = Record<string, FormFieldValue>;
// ApiRouteKey = `${HttpVerb} ${PathPattern}` — e.g. "POST /api/wishlist",
// "PATCH /api/store/orders/[id]". The path keeps Next.js `[param]` syntax so
// the audit can cross-check the registry against `src/app/api/**/route.ts`.
// ---------------------------------------------------------------------------

export type HttpVerb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type ApiRouteKey = `${HttpVerb} ${string}`;

// ---------------------------------------------------------------------------
// ApiRouteSchema — bundle attached to a single API route.
// ---------------------------------------------------------------------------

export interface ApiRouteSchema<
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny,
  TResponse extends z.ZodTypeAny = z.ZodTypeAny,
> {
  readonly body?: TBody;
  readonly query?: TQuery;
  readonly params?: TParams;
  readonly response?: TResponse;
}

// ---------------------------------------------------------------------------
// WebhookSchemaBucket — per-provider map of `eventName` → envelope schema.
// Razorpay, Shiprocket, Google OAuth, etc. each register one bucket.
// ---------------------------------------------------------------------------

export type WebhookSchemaBucket = Readonly<Record<string, z.ZodTypeAny>>;

// ---------------------------------------------------------------------------
// Top-level registry shape. The actual SCHEMAS export uses `as const satisfies
// SchemaRegistry` so registered keys are preserved at the type level for
// `createRouteHandler({ schema: { body: "POST /api/wishlist" } })` inference.
// ---------------------------------------------------------------------------

export interface SchemaRegistry {
  /** Per-Firestore-collection document schema. Key = collection name. */
  readonly firestore: Readonly<Record<string, z.ZodTypeAny>>;
  /** Per-API-route schema bundle. Key = `${verb} ${pathPattern}`. */
  readonly api: Readonly<Partial<Record<ApiRouteKey, ApiRouteSchema>>>;
  /** Per-form schema. Key = form id (matches FormShell/QuickFormDrawer `formId`). */
  readonly forms: Readonly<Record<string, z.ZodTypeAny>>;
  /** Per-sieve-collection filter-grammar schema. Key = collection name. */
  readonly sieve: Readonly<Record<string, z.ZodTypeAny>>;
  /** Per-provider webhook envelope buckets. */
  readonly webhook: Readonly<Record<string, WebhookSchemaBucket>>;
  /** Per-RTDB-path payload schema. Key = path pattern (e.g. "chats/{convId}/lastUpdate"). */
  readonly rtdb: Readonly<Record<string, z.ZodTypeAny>>;
  /** Signed-upload + storage metadata schemas. */
  readonly storage: Readonly<Record<string, z.ZodTypeAny>>;
}

// ---------------------------------------------------------------------------
// Helper aliases inferred from the live registry. The registry module exports
// `Schemas.<ApiRouteKey>` and `Schemas.<FirestoreCollection>` namespaces typed
// from the actual SCHEMAS value via `typeof SCHEMAS`.
// ---------------------------------------------------------------------------

export type RegistryEntry<TSchema extends z.ZodTypeAny> = {
  readonly schema: TSchema;
  readonly type: z.infer<TSchema>;
};
