/*
 * WHY: An attempt is a RECORD, not an overwrite. Tuning a halftone scan takes
 *      several runs, and the whole value of keeping them is being able to ask
 *      weeks later what run 2 did differently and which stage run 3 died in.
 * WHAT: Create, the capped event log, terminal transitions, and per-sheet
 *       history.
 *
 * 🛑 A finished run is never edited. `markSucceeded` / `markFailed` are the
 * last writes it takes; a re-trace creates a NEW document. Promotion writes to
 * the SHEET (`promoteRun`) plus this run's own `promoted` block, and nothing
 * else about the run moves.
 *
 * Holds no PII — see the same note on `sticker-sheets.repository`.
 *
 * EXPORTS: StickerTraceRunsRepository, stickerTraceRunsRepository,
 *   StickerTraceRunCreateInput
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:repository
 * @tag access:server
 * @tag consumers:sticker-trace/actions,functions/sticker-trace
 * @tag sideEffects:firestore
 */

import {
  BaseRepository,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import {
  RUN_EVENTS_MAX,
  STICKER_TRACE_RUNS_COLLECTION,
  STICKER_TRACE_RUN_FIELDS,
  TraceRunStatusValues,
  type PromotedArtifacts,
  type RunArtifacts,
  type StickerTraceRunDocument,
  type TraceRunError,
  type TraceRunEvent,
} from "../schemas/firestore";

export interface StickerTraceRunCreateInput {
  sheetId: string;
  /** 🛑 Mandatory. The reason history is worth keeping is being able to tell runs apart. */
  name: string;
  tier: StickerTraceRunDocument["tier"];
  params: StickerTraceRunDocument["params"];
  requestedBy: string;
}

export class StickerTraceRunsRepository extends BaseRepository<StickerTraceRunDocument> {
  constructor() {
    super(STICKER_TRACE_RUNS_COLLECTION);
  }

  /**
   * A run is born `queued` with an empty event log and zeroed counts.
   *
   * Firestore assigns the id (the § "Slug Prefix System" convention for
   * `carts` / `jobs` / `notifications`): a run carries a mandatory human NAME,
   * which is what anyone reads, so a second slug prefix would add a parse
   * surface and a collision story for no reader. The id appears only in a
   * Storage path and an RTDB channel key.
   */
  override async create(input: StickerTraceRunCreateInput): Promise<StickerTraceRunDocument> {
    return super.create({
      ...input,
      status: TraceRunStatusValues.QUEUED,
      stage: "queued",
      events: [],
      partCount: 0,
      groupCount: 0,
      artifacts: {},
      promoted: null,
    });
  }

  /**
   * Append one progress transition, FIFO-capped.
   *
   * 🛑 `arrayUnion` cannot enforce a cap, so this folds in memory and writes
   * the whole array — the same constraint § "Status History" records, and the
   * reason `prior` exists here: the coordinator and the finalizer each hold
   * the run already, so threading it costs **zero extra reads**. Omitting it
   * is legal and pays one read.
   *
   * 🛑 Truncation is RECORDED, never silent. `eventsTruncated` is what lets a
   * reader say "earlier progress trimmed" instead of implying a `max`-tier run
   * with sixty shards simply had ten events.
   */
  async appendEvent(
    runId: string,
    event: TraceRunEvent,
    prior?: StickerTraceRunDocument | null,
  ): Promise<StickerTraceRunDocument> {
    const current = prior !== undefined && prior !== null ? prior : await this.findByIdOrFail(runId);
    const merged = [...(current.events ?? []), event];
    const overflow = Math.max(0, merged.length - RUN_EVENTS_MAX);
    return this.update(runId, {
      events: overflow > 0 ? merged.slice(overflow) : merged,
      ...(overflow > 0
        ? { eventsTruncated: (current.eventsTruncated ?? 0) + overflow }
        : {}),
      stage: event.stage,
    });
  }

  /** `queued` → `running`, stamping the clock the duration is measured from. */
  async markStarted(runId: string, shardCount?: number): Promise<StickerTraceRunDocument> {
    return this.update(runId, {
      status: TraceRunStatusValues.RUNNING,
      startedAt: new Date(),
      ...(shardCount !== undefined ? { shardCount } : {}),
    });
  }

  /**
   * Terminal success.
   *
   * `durationMs` is computed from the run's own `startedAt` rather than
   * accepted from the caller — two call sites each subtracting their own pair
   * of timestamps is how the number ends up meaning different things on
   * different runs (Root Cause #75).
   */
  async markSucceeded(
    runId: string,
    result: { partCount: number; groupCount: number; artifacts: RunArtifacts },
    prior?: StickerTraceRunDocument | null,
  ): Promise<StickerTraceRunDocument> {
    const current = prior !== undefined && prior !== null ? prior : await this.findByIdOrFail(runId);
    const finishedAt = new Date();
    return this.update(runId, {
      status: TraceRunStatusValues.SUCCEEDED,
      stage: "done",
      finishedAt,
      ...(current.startedAt
        ? { durationMs: finishedAt.getTime() - current.startedAt.getTime() }
        : {}),
      ...result,
    });
  }

  /**
   * Terminal failure, naming the stage it died in.
   *
   * 🛑 `error.message` must already be user-safe — resolved through
   * `toUserMessage`, never raw server text. A Node `MODULE_NOT_FOUND` with a
   * full require stack rendered inside a progress panel is Root Cause #86, and
   * it reached a buyer's bid modal once already.
   *
   * Partial artifacts are KEPT when the caller has them: a run that failed at
   * `parts` still produced a preview and an overlay, and those are exactly
   * what makes the failure diagnosable.
   */
  async markFailed(
    runId: string,
    error: TraceRunError,
    partial?: Partial<Pick<StickerTraceRunDocument, "artifacts" | "partCount" | "groupCount">>,
    prior?: StickerTraceRunDocument | null,
  ): Promise<StickerTraceRunDocument> {
    const current = prior !== undefined && prior !== null ? prior : await this.findByIdOrFail(runId);
    const finishedAt = new Date();
    return this.update(runId, {
      status: TraceRunStatusValues.FAILED,
      stage: error.stage,
      finishedAt,
      ...(current.startedAt
        ? { durationMs: finishedAt.getTime() - current.startedAt.getTime() }
        : {}),
      error,
      ...(partial ?? {}),
    });
  }

  /** Records that this run's full-resolution parts and exports now exist. */
  async markPromoted(
    runId: string,
    promoted: PromotedArtifacts,
  ): Promise<StickerTraceRunDocument> {
    return this.update(runId, { promoted });
  }

  /**
   * One sheet's attempt history, newest first.
   *
   * A single equality plus one `orderBy` on `createdAt`, which every document
   * carries — `BaseRepository.create` writes it. Ordering by an OPTIONAL field
   * (`startedAt`, `finishedAt`) would silently drop every queued run from its
   * own history, which is Root Cause #100.
   */
  async listBySheet(sheetId: string, limit = 50): Promise<StickerTraceRunDocument[]> {
    const snap = await this.getCollection()
      .where(STICKER_TRACE_RUN_FIELDS.SHEET_ID, "==", sheetId)
      .orderBy(STICKER_TRACE_RUN_FIELDS.CREATED_AT, "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async listForAdmin(model: SieveModel): Promise<FirebaseSieveResult<StickerTraceRunDocument>> {
    return this.sieveQuery<StickerTraceRunDocument>(model, StickerTraceRunsRepository.SIEVE_FIELDS, {
      defaultPageSize: 25,
      maxPageSize: 50,
    });
  }

  /** Every Timestamp field carries `parseSieveDateValue` — Root Cause #47. */
  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    sheetId: { canFilter: true, canSort: false },
    name: { canFilter: true, canSort: true },
    tier: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    stage: { canFilter: true, canSort: false },
    requestedBy: { canFilter: true, canSort: false },
    partCount: { canFilter: true, canSort: true },
    durationMs: { canFilter: true, canSort: true },
    startedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    finishedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };
}

export const stickerTraceRunsRepository = new StickerTraceRunsRepository();
