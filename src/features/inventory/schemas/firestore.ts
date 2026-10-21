/*
 * WHY: Stock lives in physical AC60 and AC30 boxes with a label maker, and
 *      "where is this" is a question the catalogue could not answer. The
 *      previous attempt — `ProductDocument.physicalLocation`, a free-text
 *      zone/shelf/bin triple — carried 0 of 1,039 products and had no write
 *      path at all, because a location typed once and never moved is not an
 *      inventory system. A box registry plus an append-only move ledger is.
 *
 * WHAT: Three TOP-LEVEL collections.
 *
 *   storageBoxes/{storagebox-slug}        one physical box
 *   inventoryPlacements/{boxId__prodId}   how many of X are in Y, right now
 *   inventoryMovements/{auto}             every move, immutable
 *
 * ── 🛑 TOP-LEVEL, NOT SUBCOLLECTIONS, and the reason is structural ─────────
 *
 * `BaseRepository.getCollection()` returns a `CollectionReference` and every
 * write method depends on it, while `collectionGroup()` returns a `Query`.
 * Measured: the repo has 685 `COLLECTION` indexes, 3 `COLLECTION_GROUP`
 * indexes, and **zero `collectionGroup(` call sites** — all three of those
 * indexes are dead. A subcollection here would mean hand-rolling the
 * repository base and losing PII encryption, `searchTxt` and `mapDoc` with it.
 *
 * ── 🛑 A ZERO-QUANTITY PLACEMENT IS DELETED, NEVER STORED AT ZERO ──────────
 *
 * Keeping zeros forces every "what is in this box" read to pair
 * `quantity > 0` with an `orderBy`, and Firestore appends an inequality's
 * field to the sort implicitly — so it demands a composite index in an order
 * nobody declares, fails with FAILED_PRECONDITION, and every caller in this
 * codebase wraps such a read in `.catch(() => null)`. That renders as an
 * EMPTY BOX rather than an error (Root Cause #59). Absence means zero.
 *
 * ── 🛑 NO STOCK RECONCILIATION. `stockQuantity` STAYS AUTHORITATIVE ───────
 *
 * This system never writes it. Deriving it would write the left side of
 * `resolveStockResync`'s invariant (`reserved = prevStock − prevAvailable`)
 * from a measurement blind to reservations, handing reserved units back to
 * the shelf. And a nightly reconciler would be Root Cause #102 verbatim: a
 * three-way state (authored / reserved / located) against one number cannot
 * distinguish "3 are lost" from "3 are on the photography table". Variance is
 * a REPORT a human resolves with an `adjust` movement.
 *
 * EXPORTS: STORAGE_BOXES_COLLECTION, INVENTORY_PLACEMENTS_COLLECTION,
 *   INVENTORY_MOVEMENTS_COLLECTION, BoxTypeValues, BoxType, BoxStatusValues,
 *   BoxStatus, MovementKindValues, MovementKind, StorageBoxDocument,
 *   InventoryPlacementDocument, InventoryMovementDocument, placementId,
 *   STORAGE_BOX_FIELDS, INVENTORY_PLACEMENT_FIELDS, INVENTORY_MOVEMENT_FIELDS
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag pattern:firestore-schema
 * @tag access:server
 * @tag sideEffects:none
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const STORAGE_BOXES_COLLECTION = "storageBoxes";
export const INVENTORY_PLACEMENTS_COLLECTION = "inventoryPlacements";
export const INVENTORY_MOVEMENTS_COLLECTION = "inventoryMovements";

/**
 * The two box sizes actually owned.
 *
 * 🛑 A TS UNION, not a seeded reference list, and this was one of the plan's
 * open questions. The deciding argument is that the LABEL GEOMETRY depends on
 * it: a box label's dimensions are chosen per type, so a third type is a code
 * change in the label profiles whatever the data model says. A seeded list
 * would let an admin create an `AC90` that no label profile can print, and
 * discover it at the printer.
 *
 * Adding a type is therefore deliberately a two-line code change plus a
 * profile, not a form submission.
 */
export const BoxTypeValues = ["AC60", "AC30"] as const;
export type BoxType = (typeof BoxTypeValues)[number];

/**
 * `retired` rather than deleting: a box's movements are permanent, and a
 * ledger row pointing at a box that no longer exists cannot be read back.
 */
export const BoxStatusValues = ["active", "full", "retired"] as const;
export type BoxStatus = (typeof BoxStatusValues)[number];

/**
 * Why stock moved. Every movement has one.
 *
 * `receive`  inbound from a procurement shipment
 * `move`     box → box
 * `pick`     out of a box, for an order
 * `adjust`   a human reconciling a variance they investigated
 * `audit`    a count that AGREED — recorded so "last verified" is answerable
 *
 * 🛑 `pick` is MANUAL and does not auto-fire from checkout — the other open
 * question in the plan. An automatic decrement would have the ledger assert a
 * movement nobody performed: the stock is sold, but it is still in the box
 * until someone walks over and takes it out. A ledger that records intentions
 * rather than actions cannot be used to find a missing item, which is its
 * only real job.
 */
export const MovementKindValues = [
  "receive",
  "move",
  "pick",
  "adjust",
  "audit",
] as const;
export type MovementKind = (typeof MovementKindValues)[number];

export interface StorageBoxDocument extends BaseDocument {
  /**
   * `AC60-03` — what is written on the physical label.
   *
   * 🛑 The id is `storagebox-{code}` and this is a PURE SLUG: a second
   * `AC60-03` *is* the same box. A generated id would let two registry rows
   * describe one physical object, and then "where is this" has two answers
   * with no way to tell which shelf was meant.
   */
  code: string;
  boxType: BoxType;
  /** The number in the code, denormalised so a list can sort numerically. */
  ordinal: number;
  status: BoxStatus;
  /** Free text — "shelf B, second from top". Deliberately not a taxonomy. */
  location?: string;
  /** "fits ~40 Burst tops" — a human's note, never a computed capacity. */
  capacityNote?: string;
  /**
   * Rollups, for a list that does not fan out one read per box.
   *
   * 🛑 Maintained by a SCHEDULED REPAIR JOB, never a Firestore trigger. A
   * trigger on a collection it also writes back to is Root Cause #92's exact
   * shape — the one that cost 12M invocations against a 2M/month quota,
   * because its no-op guard used `JSON.stringify` on a map whose key order
   * Firestore does not preserve. A scheduled recompute cannot recurse.
   *
   * Treat as ADVISORY. `inventoryPlacements` is the truth; this is a cache.
   */
  rollup?: {
    distinctProducts: number;
    totalUnits: number;
    computedAt: Date;
  };
  /** Word-prefix search tokens. Derived on write. */
  searchTxt?: string[];
}

/**
 * How many of one product are in one box, right now.
 *
 * 🛑 The id is DETERMINISTIC — `${boxId}__${productId}` — which makes "is X
 * in Y" an O(1) document read and makes the write an idempotent upsert. With
 * a generated id, the same question is a two-field query needing its own
 * composite index, and a double-submit creates a second row for the same
 * pair that silently doubles the count.
 *
 * `__` as the separator because both ids contain `-` (`storagebox-ac60-03`,
 * `product-beyblade-x-dran-sword`), so a single hyphen could not be split
 * back apart.
 */
export interface InventoryPlacementDocument extends BaseDocument {
  boxId: string;
  productId: string;
  /** Always ≥ 1. A zero placement is deleted — see the header. */
  quantity: number;
  /** "slot 4", "front left" — optional, free text, for a big box. */
  slot?: string;
  /*
   * Denormalised for display, so a box page renders without one read per
   * placement.
   *
   * 🛑 These are a CACHE of two fields that can be renamed, and nothing
   * repairs them automatically — a product retitled after being placed keeps
   * the old title here until it is moved. The box rollup job refreshes them;
   * a reader that needs the live title must resolve `productId`. Stated
   * because a denormalised mirror with no guard is Root Cause #42, and the
   * honest answer here is "advisory, refreshed on a schedule".
   */
  boxCode: string;
  productTitle: string;
  /** The human stock key at the time of placement — what is on the label. */
  productSku?: string;
}

/**
 * One movement. Append-only.
 *
 * 🛑 `quantity` IS ALWAYS POSITIVE. Direction is carried by `from`/`to`, not
 * by the sign — a signed quantity means every reader has to agree on what a
 * negative means, and the first one that disagrees double-counts. A `receive`
 * has no `from`; a `pick` has no `to`; a `move` has both.
 *
 * Immutability is enforced by the repository overriding `update` and `delete`
 * to throw, and by `audit-inventory-ledger-append-only`. A ledger that can be
 * edited is a ledger nobody can use as evidence.
 */
export interface InventoryMovementDocument extends BaseDocument {
  kind: MovementKind;
  productId: string;
  /** Always positive. See the header. */
  quantity: number;
  /** Absent on `receive` — stock came from outside the system. */
  fromBoxId?: string;
  /** Absent on `pick` — stock left the system. */
  toBoxId?: string;
  /** When it physically happened, which is not always when it was recorded. */
  occurredAt: Date;
  /** Who did it. A uid, never a name — this collection is not PII-encrypted. */
  actorUid: string;
  /** Required on `adjust`: a variance nobody explained is not reconciled. */
  reason?: string;
  /** The procurement shipment a `receive` came from, when there was one. */
  shipmentId?: string;
  /** Denormalised for a readable ledger. Advisory, like the placement's. */
  productTitle?: string;
  fromBoxCode?: string;
  toBoxCode?: string;
}

/**
 * The deterministic placement id.
 *
 * One definition, used by the repository, the receive station and the seed —
 * a second copy of this string concatenation is a second answer to "is X in
 * Y", and the two would disagree the first time one of them changed.
 */
export function placementId(boxId: string, productId: string): string {
  return `${boxId}__${productId}`;
}

/** Field-name constants, so a query never spells a path by hand. */
export const STORAGE_BOX_FIELDS = {
  CODE: "code",
  BOX_TYPE: "boxType",
  ORDINAL: "ordinal",
  STATUS: "status",
  LOCATION: "location",
  SEARCH_TXT: "searchTxt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const INVENTORY_PLACEMENT_FIELDS = {
  BOX_ID: "boxId",
  PRODUCT_ID: "productId",
  QUANTITY: "quantity",
  SLOT: "slot",
  BOX_CODE: "boxCode",
  PRODUCT_TITLE: "productTitle",
  PRODUCT_SKU: "productSku",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const INVENTORY_MOVEMENT_FIELDS = {
  KIND: "kind",
  PRODUCT_ID: "productId",
  QUANTITY: "quantity",
  FROM_BOX_ID: "fromBoxId",
  TO_BOX_ID: "toBoxId",
  OCCURRED_AT: "occurredAt",
  ACTOR_UID: "actorUid",
  SHIPMENT_ID: "shipmentId",
  CREATED_AT: "createdAt",
} as const;
