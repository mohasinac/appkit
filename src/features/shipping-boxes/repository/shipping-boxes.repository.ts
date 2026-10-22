import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { BaseRepository } from "../../../providers/db-firebase";
import { slugify } from "../../../utils/string.formatter";
import {
  SHIPPING_BOX_COLLECTION,
  SHIPPING_BOX_FIELDS,
  SHIPPING_BOX_LIMITS,
  type ShippingBoxDocument,
} from "../schemas/firestore";

/**
 * The shared carton library. See the schema header for why it is global.
 */
export class ShippingBoxesRepository extends BaseRepository<ShippingBoxDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    /*
     * `name` is sortable AND filterable because this list is picked from by
     * typing — `PaginatedSelect` searches it. A field the picker searches that
     * is not allowlisted here would have its clause silently DROPPED and the
     * search would return the whole library while looking like it filtered
     * (Root Cause #62).
     */
    name: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    createdByUid: { canFilter: true, canSort: false },
  };

  constructor() {
    super(SHIPPING_BOX_COLLECTION);
  }

  /**
   * The picker's list. Active only, by name.
   *
   * 🛑 Retired presets are excluded here and NOT deleted, so a draft shipment
   * holding one does not lose it mid-dispatch.
   */
  async listActive(model: SieveModel): Promise<FirebaseSieveResult<ShippingBoxDocument>> {
    const baseQuery = this.getCollection().where(SHIPPING_BOX_FIELDS.IS_ACTIVE, "==", true);
    return this.sieveQuery<ShippingBoxDocument>(model, ShippingBoxesRepository.SIEVE_FIELDS, {
      baseQuery,
      defaultPageSize: 20,
      maxPageSize: 50,
    });
  }

  /**
   * Create a preset, keyed on a slug of its name.
   *
   * 🛑 `box-<slug>` as the document id, so the SAME carton name cannot be added
   * twice by two sellers. That is the whole value of a shared library — two
   * rows called "Standard carton" with different numbers is worse than one
   * row, because the picker gives no way to tell them apart.
   *
   * A colliding create is reported to the caller rather than silently
   * overwriting: the existing row has an author and may be in use, and the
   * second seller's intent ("I want a preset for this") is already satisfied
   * by the row that exists.
   */
  async createPreset(input: {
    name: string;
    length: number;
    width: number;
    height: number;
    tareWeight?: number;
    createdByUid: string;
    createdByName: string;
  }): Promise<{ box: ShippingBoxDocument; created: boolean }> {
    const name = input.name.trim();
    const id = `box-${slugify(name)}`;

    const existing = await this.findById(id);
    if (existing) return { box: existing, created: false };

    const now = new Date();
    const box: ShippingBoxDocument = {
      id,
      name,
      length: clampCm(input.length),
      width: clampCm(input.width),
      height: clampCm(input.height),
      ...(input.tareWeight === undefined ? {} : { tareWeight: clampKg(input.tareWeight) }),
      createdByUid: input.createdByUid,
      createdByName: input.createdByName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.createWithId(id, box);
    return { box, created: true };
  }

  /**
   * Every preset, retired included — the staff management list.
   *
   * Separate from `listActive` for the same reason the dispute reasons are: the
   * picker must never offer a retired row, and a management view must be able
   * to find one in order to put it back.
   */
  async listAll(model: SieveModel): Promise<FirebaseSieveResult<ShippingBoxDocument>> {
    return this.sieveQuery<ShippingBoxDocument>(model, ShippingBoxesRepository.SIEVE_FIELDS, {
      baseQuery: this.getCollection(),
      defaultPageSize: 20,
      maxPageSize: 50,
    });
  }

  /**
   * Correct a preset's dimensions. **Staff only** — enforced at the route.
   *
   * ## 🛑 This does NOT change any dispatched parcel, by construction
   *
   * The dimensions are COPIED onto the shipment at use time (the schema's own
   * header: *"a preset is a DEFAULT, never a lock"*), so there is no stored
   * reference for this to reach through. That is precisely why staff editing is
   * safe to offer at all: a seller's past declaration is a snapshot, and the
   * courier billed against the figures at dispatch.
   *
   * It is staff-only for the mirror reason — these numbers are what the NEXT
   * seller's dispatch form defaults to, so a wrong edit misdeclares other
   * people's parcels. A seller who finds a preset wrong adds a new one; staff
   * decide whether the shared row changes.
   *
   * 🛑 The NAME is deliberately not editable. The id is `box-<slug of name>`,
   * so renaming would either leave the id disagreeing with the name (the
   * mirror-drift trap) or require a new document, which is just a create. Add
   * the correctly-named preset and retire this one.
   */
  async updatePreset(
    id: string,
    input: { length?: number; width?: number; height?: number; tareWeight?: number },
  ): Promise<void> {
    const patch: Partial<ShippingBoxDocument> = { updatedAt: new Date() };
    if (input.length !== undefined) patch.length = clampCm(input.length);
    if (input.width !== undefined) patch.width = clampCm(input.width);
    if (input.height !== undefined) patch.height = clampCm(input.height);
    if (input.tareWeight !== undefined) patch.tareWeight = clampKg(input.tareWeight);
    await this.update(id, patch);
  }

  /** Soft-retire. See the schema for why this is never a delete. */
  async retire(id: string): Promise<void> {
    await this.update(id, { isActive: false, updatedAt: new Date() });
  }

  /** Put a retired preset back in the picker. */
  async reactivate(id: string): Promise<void> {
    await this.update(id, { isActive: true, updatedAt: new Date() });
  }
}

/*
 * Clamped rather than rejected. These bounds exist so a typo cannot reach a
 * courier API as a 4-metre parcel; they are not a tariff, and refusing a
 * legitimate large parcel client-side is worse than letting it through to be
 * priced by `checkServiceability` against the real figures.
 */
function clampCm(v: number): number {
  if (!Number.isFinite(v)) return SHIPPING_BOX_LIMITS.minCm;
  return Math.min(SHIPPING_BOX_LIMITS.maxCm, Math.max(SHIPPING_BOX_LIMITS.minCm, v));
}

function clampKg(v: number): number {
  if (!Number.isFinite(v)) return SHIPPING_BOX_LIMITS.minKg;
  return Math.min(SHIPPING_BOX_LIMITS.maxKg, Math.max(SHIPPING_BOX_LIMITS.minKg, v));
}

export const shippingBoxesRepository = new ShippingBoxesRepository();
