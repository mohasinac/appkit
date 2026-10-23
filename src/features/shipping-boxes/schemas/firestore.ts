/**
 * `shippingBoxes` — a GLOBAL library of named carton presets.
 *
 * ## Why global rather than per-store
 *
 * A box is a real physical carton size. Scoping presets per store would give
 * every seller their own private copy of "Medium", each with slightly
 * different numbers, and the second seller to ship a Beyblade in a standard
 * carton would re-measure instead of picking what already exists.
 *
 * `createdByName` is what keeps a shared library accountable: a wrong preset
 * has an author, and the next seller can see who added the one they are about
 * to trust.
 *
 * ## 🛑 A preset is a DEFAULT, never a lock
 *
 * The dimensions are COPIED onto the shipment when a seller uses one. Editing
 * a preset later must not retroactively change what an already-dispatched
 * parcel was declared as — the courier billed against the figures at dispatch,
 * and a stored reference would make a past declaration mutable. Same snapshot
 * discipline as the checkout's fee terms (D61).
 *
 * ## 🛑 Weight is not a formality
 *
 * An understated weight is re-billed by the courier AFTER delivery as a
 * weight-discrepancy adjustment — real money, arriving on a reconciliation we
 * cannot dispute without the parcel. The form says so rather than treating it
 * as a required field to get past.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

/** `box-` prefixed slug, so the id reads as what it is. */
export const SHIPPING_BOX_COLLECTION = "shippingBoxes";

export interface ShippingBoxDocument extends BaseDocument {
  /** What a seller picks it by: "Standard Beyblade carton", "Poly mailer S". */
  name: string;
  /** cm. */
  length: number;
  width: number;
  height: number;
  /**
   * kg, the EMPTY box. The parcel's weight is this plus contents, entered on
   * the dispatch form — a preset cannot know what went inside it.
   *
   * 🛑 Separate from the shipment's `weight` for exactly that reason. Storing
   * one "weight" on a preset and reusing it as the parcel weight is how every
   * parcel gets declared at the same figure regardless of contents.
   */
  tareWeight?: number;
  /** Who added it. Display name, so a seller can see whose preset this is. */
  createdByName: string;
  /** The uid, for moderation. Never rendered. */
  createdByUid: string;
  /**
   * Soft-retire rather than delete. A preset in use by a draft shipment must
   * not vanish mid-dispatch, and a deleted row takes its author with it.
   */
  isActive: boolean;
}

export const SHIPPING_BOX_FIELDS = {
  ID: "id",
  NAME: "name",
  IS_ACTIVE: "isActive",
  CREATED_BY_UID: "createdByUid",
  CREATED_AT: "createdAt",
} as const;

/**
 * Bounds, so a typo cannot reach a courier API as a 4-metre parcel.
 *
 * 🛑 Generous on purpose — these are a sanity check, not a tariff. India Post
 * and most couriers cap a single parcel well below these, and the right place
 * to learn a real limit is `checkServiceability`, which quotes against the
 * actual weight. A client-side rule that refuses a legitimate large parcel is
 * worse than one that lets it through to be priced.
 */
export const SHIPPING_BOX_LIMITS = {
  minCm: 1,
  maxCm: 200,
  minKg: 0,
  maxKg: 50,
} as const;
