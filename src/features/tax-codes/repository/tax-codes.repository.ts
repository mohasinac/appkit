import { normalizeError } from "../../../errors/normalize";
import { DatabaseError, ConflictError, ValidationError } from "../../../errors";
import {
  BaseRepository,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  TAX_CODES_COLLECTION,
  TAX_CODE_FIELDS,
  TAX_CODE_SIEVE_FIELDS,
  createTaxCodeId,
  isValidHsnCode,
  type TaxCodeCreateInput,
  type TaxCodeDocument,
  type TaxCodeUpdateInput,
} from "../schemas/firestore";

function failureMessage(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : "Unknown error"}`;
}

/**
 * The `taxCodes` collection.
 *
 * Small, read-mostly and read on a hot path — `deriveTaxonomy` resolves a
 * category's `taxCodeId` on every product create and on any update that names
 * a taxonomy field. So the two reads below are single-document and
 * single-field-equality shaped on purpose; neither needs a composite index.
 */
export class TaxCodesRepository extends BaseRepository<TaxCodeDocument> {
  constructor() {
    super(TAX_CODES_COLLECTION);
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<TaxCodeDocument>> {
    return this.sieveQuery<TaxCodeDocument>(model, TAX_CODE_SIEVE_FIELDS);
  }

  /**
   * Every active code, chapter-then-rate ordered, for the picker.
   *
   * Unpaginated deliberately — this is ~10 rows and will be a few dozen at
   * most. If it ever needs paging, the picker needs `searchTxt` first, and
   * that is a different change.
   */
  async listActive(): Promise<TaxCodeDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(TAX_CODE_FIELDS.IS_ACTIVE, "==", true)
        .get();
      return snap.docs
        .map((d) => this.mapDoc<TaxCodeDocument>(d))
        .sort(
          (a, b) =>
            (a.chapter ?? "").localeCompare(b.chapter ?? "") ||
            a.gstRate - b.gstRate ||
            a.label.localeCompare(b.label),
        );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(failureMessage("Failed to list tax codes", error));
    }
  }

  /**
   * Every code including inactive ones, for the admin list.
   *
   * 🛑 EXPLICITLY bounded, even though the collection is five rows. Two
   * reasons: `BaseRepository.findAll()` relies on a cap several layers away
   * (`base.ts` clamps perPage at 500), and a route that reads "all of a
   * collection" with no visible bound is the shape that has to be re-audited
   * every time somebody wonders whether it is safe. 200 is far above any
   * plausible number of HSN codes and far below anything that costs.
   */
  async listAllBounded(): Promise<TaxCodeDocument[]> {
    try {
      const snap = await this.getCollection().limit(200).get();
      return snap.docs
        .map((d) => this.mapDoc<TaxCodeDocument>(d))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(failureMessage("Failed to list tax codes", error));
    }
  }

  /**
   * Resolve a code for derivation.
   *
   * 🛑 Returns `null` for an INACTIVE code as well as a missing one, and the
   * caller must treat both the same way: leave the product's `gstRate` and
   * `hsnCode` alone rather than writing a zero. Deactivating a code must not
   * silently re-rate the next listing to 0% — that is indistinguishable from a
   * deliberate exemption, which is the whole reason `gstRate` distinguishes
   * `undefined` from `0`.
   */
  async findResolvable(id: string): Promise<TaxCodeDocument | null> {
    try {
      const snap = await this.getCollection().doc(id).get();
      if (!snap.exists) return null;
      const doc = this.mapDoc<TaxCodeDocument>(snap);
      return doc.isActive ? doc : null;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(failureMessage("Failed to read tax code", error));
    }
  }

  /**
   * Create with a DERIVED id, so the same HSN cannot exist twice.
   *
   * Two rows for one HSN is the failure worth preventing structurally: an
   * admin edits one, categories point at the other, and the rate that reaches
   * an invoice is whichever the data happens to reference. A 409 here is the
   * right answer — the request is well-formed and the world already has it.
   */
  override async create(input: TaxCodeCreateInput): Promise<TaxCodeDocument> {
    const hsn = input.hsnCode?.trim() ?? "";
    if (hsn !== "" && !isValidHsnCode(hsn)) {
      throw new ValidationError(
        "An HSN code must be exactly 4, 6 or 8 digits.",
        { hsnCode: "Must be 4, 6 or 8 digits." },
      );
    }
    if (hsn === "" && input.gstRate !== 0) {
      throw new ValidationError(
        "An HSN code is required for any rate above 0%.",
        { hsnCode: "Required unless the rate is 0%." },
      );
    }

    const id = createTaxCodeId(hsn);
    const existing = await this.getCollection().doc(id).get();
    if (existing.exists) {
      throw new ConflictError(
        `A tax code for HSN ${hsn || "(exempt)"} already exists. Edit it instead of creating a second one.`,
      );
    }
    return this.createWithId(id, { ...input, hsnCode: hsn });
  }

  override async update(
    id: string,
    data: TaxCodeUpdateInput,
  ): Promise<TaxCodeDocument> {
    /*
     * 🛑 `hsnCode` is editable but the id is NOT re-derived from it. Changing
     * the id would orphan every `CategoryProductDefaults.taxCodeId` pointing
     * here — the mirror-drift shape of Root Cause #42, with an invoice at the
     * end of it. To correct a wrong HSN: deactivate this row, create the right
     * one, and repoint the categories.
     */
    if (data.hsnCode !== undefined) {
      const hsn = data.hsnCode.trim();
      if (hsn !== "" && !isValidHsnCode(hsn)) {
        throw new ValidationError(
          "An HSN code must be exactly 4, 6 or 8 digits.",
          { hsnCode: "Must be 4, 6 or 8 digits." },
        );
      }
    }
    return super.update(id, data);
  }
}

export const taxCodesRepository = new TaxCodesRepository();
