/*
 * WHY: A box is a physical object with a label on it, and the registry is
 *      what makes "AC60-03" mean something to the software.
 * WHAT: Create by code, list, status transitions, and the rollup write the
 *       scheduled repair job calls.
 *
 * Holds no PII.
 *
 * EXPORTS: StorageBoxesRepository, storageBoxesRepository,
 *   StorageBoxCreateInput
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag pattern:repository
 * @tag access:server
 * @tag sideEffects:firestore
 */

import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { generateStorageBoxId } from "../../../utils/id-generators";
import { buildStorageBoxSearchTxt } from "../../../utils/search-txt-builders";
import {
  BoxStatusValues,
  BoxTypeValues,
  STORAGE_BOXES_COLLECTION,
  STORAGE_BOX_FIELDS,
  type BoxStatus,
  type BoxType,
  type StorageBoxDocument,
} from "../schemas/firestore";

export interface StorageBoxCreateInput {
  code: string;
  boxType: BoxType;
  location?: string;
  capacityNote?: string;
  status?: BoxStatus;
}

/**
 * `AC60-03` → ordinal 3.
 *
 * Denormalised because a list sorted by `code` as a STRING puts AC60-10
 * before AC60-2, which is the kind of ordering that makes an operator
 * distrust the whole screen. Derived on write, never typed.
 */
function ordinalOf(code: string): number {
  const m = code.match(/(\d+)\s*$/);
  return m ? Number.parseInt(m[1]!, 10) : 0;
}

export class StorageBoxesRepository extends BaseRepository<StorageBoxDocument> {
  constructor() {
    super(STORAGE_BOXES_COLLECTION);
  }

  /**
   * Create a box at its own code.
   *
   * 🛑 `createWithId`, not `create`, and that is the uniqueness guarantee: the
   * id IS `storagebox-{code}`, so a second `AC60-03` lands on the same
   * document instead of making a second registry row for one physical object.
   *
   * 🛑 And it REFUSES rather than overwriting. An operator labelling a new box
   * who types a code already in use has made a mistake that silently merging
   * two boxes would hide — and the merge would be unrecoverable, because the
   * placements of both would then point at one id.
   */
  async createBox(input: StorageBoxCreateInput): Promise<StorageBoxDocument> {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("A box needs a code");
    if (!BoxTypeValues.includes(input.boxType)) {
      throw new Error(`Unknown box type: ${input.boxType}`);
    }

    const id = generateStorageBoxId({ code });
    const existing = await this.findById(id);
    if (existing) {
      throw new Error(
        `Box ${code} already exists. A second ${code} is the same box — ` +
          `edit it instead, or use a new code.`,
      );
    }

    return this.createWithId(id, {
      code,
      boxType: input.boxType,
      ordinal: ordinalOf(code),
      status: input.status ?? "active",
      ...(input.location ? { location: input.location } : {}),
      ...(input.capacityNote ? { capacityNote: input.capacityNote } : {}),
      searchTxt: buildStorageBoxSearchTxt({
        code,
        boxType: input.boxType,
        location: input.location,
      }),
    } as Omit<StorageBoxDocument, "id" | "createdAt" | "updatedAt">);
  }

  /** Box by its printed code, which is what a scan or a typed search gives. */
  async findByCode(code: string): Promise<StorageBoxDocument | null> {
    return this.findById(generateStorageBoxId({ code: code.trim().toUpperCase() }));
  }

  async setStatus(id: string, status: BoxStatus): Promise<StorageBoxDocument> {
    if (!BoxStatusValues.includes(status)) {
      throw new Error(`Unknown box status: ${status}`);
    }
    return this.update(id, { status, updatedAt: new Date() });
  }

  /**
   * Write the advisory rollup.
   *
   * 🛑 Called ONLY by the scheduled repair job, never from a trigger on a
   * collection this also writes. That shape is Root Cause #92 — a
   * documentWritten trigger writing back to its own collection, whose no-op
   * guard compared maps with `JSON.stringify` while Firestore returns map keys
   * alphabetically, so the guard could never match and it recursed to 12M
   * invocations against a 2M/month quota. A scheduled recompute cannot
   * recurse, which is the entire reason for the choice.
   */
  async setRollup(
    id: string,
    distinctProducts: number,
    totalUnits: number,
  ): Promise<void> {
    await this.update(id, {
      rollup: { distinctProducts, totalUnits, computedAt: new Date() },
      updatedAt: new Date(),
    });
  }

  async listForAdmin(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<StorageBoxDocument>> {
    return this.sieveQuery<StorageBoxDocument>(
      model,
      StorageBoxesRepository.SIEVE_FIELDS,
      { defaultPageSize: 25, maxPageSize: 50 },
    );
  }

  /** Every Timestamp field carries `parseSieveDateValue` — Root Cause #47. */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    [STORAGE_BOX_FIELDS.CODE]: { canFilter: true, canSort: true },
    [STORAGE_BOX_FIELDS.BOX_TYPE]: { canFilter: true, canSort: false },
    [STORAGE_BOX_FIELDS.ORDINAL]: { canFilter: true, canSort: true },
    [STORAGE_BOX_FIELDS.STATUS]: { canFilter: true, canSort: false },
    [STORAGE_BOX_FIELDS.LOCATION]: { canFilter: true, canSort: false },
    [STORAGE_BOX_FIELDS.SEARCH_TXT]: { canFilter: true, canSort: false },
    [STORAGE_BOX_FIELDS.CREATED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
    [STORAGE_BOX_FIELDS.UPDATED_AT]: {
      canFilter: true,
      canSort: true,
      parseValue: parseSieveDateValue,
    },
  };
}

export const storageBoxesRepository = new StorageBoxesRepository();
