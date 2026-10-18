/*
 * WHY: One scanned sheet, and the CURRENT accepted result for it. Every
 *      attempt that produced that result lives in `stickerTraceRuns` — this
 *      document only ever holds the one a human chose.
 * WHAT: Reads, the create funnel, and promotion of a run's artifacts onto the
 *       sheet.
 *
 * 🛑 This repository holds NO PII and declares no `piiFields`. A sticker sheet
 * is an admin's own scan: the only person-shaped field anywhere near it is
 * `PromotedArtifacts.by`, which is an Auth UID — the same thing every
 * `actorUid` in § "Status History" is, and explicitly NOT PII there either.
 * Declaring a `piiFields` list for a document with nothing to encrypt is the
 * fiction Root Cause #50 is about: a named mechanism whose name is the only
 * evidence it does anything.
 *
 * EXPORTS: StickerSheetsRepository, stickerSheetsRepository
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:repository
 * @tag access:server
 * @tag consumers:sticker-trace/actions,api/admin/sticker-sheets
 * @tag sideEffects:firestore
 */

import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import { generateStickerSheetId } from "../../../utils/id-generators";
import {
  STICKER_SHEETS_COLLECTION,
  STICKER_SHEET_FIELDS,
  TraceRunStatusValues,
  type SheetArtifacts,
  type SheetPart,
  type StickerSheetDocument,
} from "../schemas/firestore";

/** What a caller supplies to register a freshly uploaded scan. */
export interface StickerSheetCreateInput {
  title: string;
  scanType: StickerSheetDocument["scanType"];
  widthPx: number;
  heightPx: number;
  sourceScan: StickerSheetDocument["sourceScan"];
  dpi?: number;
  dpiSource?: StickerSheetDocument["dpiSource"];
}

export class StickerSheetsRepository extends BaseRepository<StickerSheetDocument> {
  constructor() {
    super(STICKER_SHEETS_COLLECTION);
  }

  /**
   * The ONE create path, so a sheet cannot exist without its counters.
   *
   * `traceStatus` starts `queued` rather than absent: a Firestore equality
   * cannot match a missing field, so a sheet with no status would be absent
   * from its own admin list while rendering perfectly by id (Root Cause #101).
   *
   * Deliberately not `createWithId` — that does a read-after-write, costing a
   * Firestore read on every create against Rule #6's budget, for a document
   * this function already holds in full.
   */
  override async create(input: StickerSheetCreateInput): Promise<StickerSheetDocument> {
    const id = generateStickerSheetId({ title: input.title });
    const now = new Date();
    const data: Omit<StickerSheetDocument, "id"> = {
      ...input,
      traceStatus: TraceRunStatusValues.QUEUED,
      partCount: 0,
      groupCount: 0,
      artifacts: {},
      parts: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.getCollection().doc(id).set(prepareForFirestore(data));
    return { id, ...data };
  }

  /**
   * Accept a run's result as the sheet's current one.
   *
   * 🛑 `artifacts` is REPLACED, not merged. A promotion means "this run's
   * output is what the sheet shows now", so carrying a previous run's
   * `overlayPath` forward would leave the sheet pointing at an overlay drawn
   * from different geometry than its own `parts` — two halves of two different
   * runs, with nothing anywhere contradicting it (Root Cause #42's shape).
   * The superseded run keeps its own artifacts on its own document; nothing is
   * lost, and the history is what makes that safe.
   */
  async promoteRun(
    sheetId: string,
    runId: string,
    result: {
      parts: SheetPart[];
      groupCount: number;
      artifacts: SheetArtifacts;
    },
  ): Promise<StickerSheetDocument> {
    return this.update(sheetId, {
      activeRunId: runId,
      traceStatus: TraceRunStatusValues.SUCCEEDED,
      partCount: result.parts.length,
      groupCount: result.groupCount,
      parts: result.parts,
      artifacts: result.artifacts,
    });
  }

  /**
   * Rename one part, or mark it a duplicate of another.
   *
   * Matched on `ordinal`, never on array index — removing a part shifts every
   * later index by one, so an index-wise write renames the wrong sticker. Same
   * rule as § "Lottery Config Writes" merges by `slotNumber`.
   *
   * An unknown ordinal is a no-op that throws rather than a silent miss: the
   * caller named a part that is not on this sheet, and answering 200 to that
   * is how a rename appears to work and does nothing (Root Cause #40).
   */
  async updatePart(
    sheetId: string,
    ordinal: number,
    patch: Partial<Pick<SheetPart, "name" | "duplicateOf">>,
  ): Promise<StickerSheetDocument> {
    const sheet = await this.findByIdOrFail(sheetId);
    const index = sheet.parts.findIndex((p) => p.ordinal === ordinal);
    if (index === -1) {
      throw new Error(`Sticker sheet ${sheetId} has no part with ordinal ${ordinal}`);
    }
    const parts = [...sheet.parts];
    parts[index] = { ...parts[index]!, ...patch };
    return this.update(sheetId, { parts });
  }

  async listForAdmin(model: SieveModel): Promise<FirebaseSieveResult<StickerSheetDocument>> {
    return this.sieveQuery<StickerSheetDocument>(model, StickerSheetsRepository.SIEVE_FIELDS, {
      defaultPageSize: 25,
      maxPageSize: 50,
    });
  }

  /**
   * Every sheet's stored bytes, for the usage meter.
   *
   * `.select()` on the two size fields rather than a full read: the meter sums
   * numbers and never renders a sheet's parts, and a full scan of documents
   * carrying up to sixty `SheetPart` entries each is real payload for a figure
   * that is two integers wide.
   */
  async listSizes(): Promise<Array<{ id: string; title: string; bytes: number }>> {
    const snap = await this.getCollection()
      .select(STICKER_SHEET_FIELDS.TITLE, "sourceScan")
      .get();
    return snap.docs.map((doc) => {
      const data = doc.data() as Partial<StickerSheetDocument>;
      return {
        id: doc.id,
        title: data.title ?? doc.id,
        bytes: data.sourceScan?.bytes ?? 0,
      };
    });
  }

  /**
   * 🛑 Every Timestamp field carries `parseSieveDateValue`.
   *
   * Without it a GTE/LTE filter reaches Firestore as an ISO *string* against a
   * stored Timestamp, matches ZERO documents, and raises nothing — Root Cause
   * #47, which cost 27 repository files to fix once.
   */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    title: { canFilter: true, canSort: true },
    scanType: { canFilter: true, canSort: false },
    traceStatus: { canFilter: true, canSort: false },
    activeRunId: { canFilter: true, canSort: false },
    partCount: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };
}

export const stickerSheetsRepository = new StickerSheetsRepository();
