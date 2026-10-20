import type { SeedPurpose } from "../../../constants/seed-meta";

// Every primary Firestore collection document has these three fields.
// All document interfaces must extend this — prevents field-list drift across 23 schema files.
export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Why this row exists, when it was written by `appkit-seed`. **Absent on
   * every organically created document** — a real buyer's order, a real
   * seller's listing — and that absence is load-bearing: the purge queries this
   * field, so a row without one is structurally unreachable by it.
   *
   * 🛑 Declared HERE rather than per schema, which is the point. It covers all
   * 47 seeded collections with one declaration, so nothing is written-but-
   * undeclared — the state that let five `siteSettings` fields, including
   * `adSettings.providerCredentials`, reach anonymous callers because a
   * deny-list projection keyed on the interface was structurally blind to
   * fields the interface never named (Root Cause #70).
   *
   * See `appkit/src/seed/seed-purpose.ts` for the three values, why
   * `isTestData` is derived from this rather than authored beside it, and why
   * the previous scheme expressed "permanent" as an ABSENCE.
   */
  seedPurpose?: SeedPurpose;
}

// Documents addressable by a human-readable slug.
export interface WithSlug {
  slug?: string;
}

// Documents owned by a store — prevents ownerId vs storeId ambiguity.
export interface WithStoreOwnership {
  storeId: string;
  ownerId?: string;
}

// Generic typed status — avoids a local "X"|"Y" inline union per document.
export interface WithStatus<S extends string> {
  status: S;
}
