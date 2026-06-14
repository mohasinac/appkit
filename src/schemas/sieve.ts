// [SCHEMA] Sieve filter-grammar schemas (W6).
//
// Sieve filters are passed to repository `list()` methods and to
// `listingProcessor` as opaque strings (e.g. "status==published,price>100").
// This module gives them a Zod schema for the request envelope plus a typed
// shape for a single parsed clause so per-repository `parseSieveFilters`
// helpers stop returning `Record<string, unknown>`.

import { z } from "zod";

// ---------------------------------------------------------------------------
// SieveGrammarSchema — the wire-level request envelope. `filters` and `sorts`
// stay as opaque strings (parsed per-collection); page + pageSize coerce
// from query-string numbers and clamp to sensible bounds.
// ---------------------------------------------------------------------------

export const sieveGrammarSchema = z.object({
  filters: z.string().optional().default(""),
  sorts: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SieveGrammar = z.infer<typeof sieveGrammarSchema>;

// ---------------------------------------------------------------------------
// SieveFilterClause — the parsed shape of a single `field op value` clause.
// The repository's `parseSieveFilters` helper returns an array of these.
// ---------------------------------------------------------------------------

export const sieveWhereOpSchema = z.enum([
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "array-contains",
  "in",
  "not-in",
  "array-contains-any",
]);

export const sieveFilterClauseSchema = z.object({
  field: z.string().min(1),
  op: sieveWhereOpSchema,
  // `value` is a JSON-like primitive or array. Repositories cast per-field
  // type after parsing; the wire shape is constrained but not field-typed.
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
  ]),
});

export type SieveFilterClause = z.infer<typeof sieveFilterClauseSchema>;
export type SieveWhereOp = z.infer<typeof sieveWhereOpSchema>;

// ---------------------------------------------------------------------------
// SieveSortClause — the parsed shape of a single sort directive.
// ---------------------------------------------------------------------------

export const sieveSortClauseSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export type SieveSortClause = z.infer<typeof sieveSortClauseSchema>;
