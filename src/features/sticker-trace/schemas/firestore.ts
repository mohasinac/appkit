/*
 * WHY: A scanned sticker sheet becomes cut-ready geometry through a pipeline
 *      that can fail in nine different stages, is retried with different
 *      parameters until it is right, and must still be able to answer "what
 *      did run 2 do differently last Tuesday" weeks later. One mutable
 *      document cannot hold that; an attempt is a record, not an overwrite.
 * WHAT: The two collections, and the task record that fans the work out.
 *
 * Collections:
 *   stickerSheets/{stickersheet-slug}   the sheet, and its CURRENT accepted result
 *   stickerTraceRuns/{runId}            every attempt, immutable once finished
 *   stickerTraceTasks/{taskId}          transient shard fan-out, deleted on finalize
 *
 * 🛑 Every `*Path` on these documents is a RAW STORAGE PATH under
 * `private/sticker-sheets/…` and must never reach a client. The bytes are
 * fetched through a short-lived signed URL minted by an authenticated route —
 * see § "Digital Content Delivery" for the precedent and why a guessable
 * public path is the one property a private asset must not have.
 *
 * EXPORTS: STICKER_SHEETS_COLLECTION, STICKER_TRACE_RUNS_COLLECTION,
 *   STICKER_TRACE_TASKS_COLLECTION, TraceRunStatusValues, TraceRunStatus,
 *   DpiSourceValues, DpiSource, StoredAsset, SheetArtifacts, RunArtifacts,
 *   PromotedArtifacts, SheetPart, TraceRunEvent, TraceRunError,
 *   StickerSheetDocument, StickerTraceRunDocument, StickerTraceTaskDocument,
 *   STICKER_SHEET_FIELDS, STICKER_TRACE_RUN_FIELDS, RUN_EVENTS_MAX
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:firestore-schema
 * @tag access:server
 * @tag consumers:sticker-sheets.repository,sticker-trace-runs.repository
 * @tag sideEffects:none
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type {
  PrecisionTier,
  Rect,
  ScanType,
  TraceParams,
  TraceStage,
} from "../../../_internal/shared/features/sticker-trace/types";

export const STICKER_SHEETS_COLLECTION = "stickerSheets";
export const STICKER_TRACE_RUNS_COLLECTION = "stickerTraceRuns";
export const STICKER_TRACE_TASKS_COLLECTION = "stickerTraceTasks";

export const TraceRunStatusValues = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type TraceRunStatus = (typeof TraceRunStatusValues)[keyof typeof TraceRunStatusValues];

/**
 * Where the scan's resolution came from.
 *
 * 🛑 `embedded` is NOT a measurement. Five of the nine reference scans declare
 * 72 or 96 dpi, which is a number the encoder wrote rather than anything about
 * the scanner — so the value is always shown and always confirmable, and a
 * sheet with no trustworthy dpi carries `bboxMm: null` rather than a plausible
 * figure. A fabricated millimetre on a cut file is a physical production error,
 * which is a different class of wrong from a missing one.
 */
export const DpiSourceValues = {
  EMBEDDED: "embedded",
  MANUAL: "manual",
  CALIBRATED: "calibrated",
} as const;

export type DpiSource = (typeof DpiSourceValues)[keyof typeof DpiSourceValues];

/** One object in Storage. `assetPath` is private and never leaves the server. */
export interface StoredAsset {
  assetPath: string;
  contentType: string;
  bytes: number;
  /** Lets a re-upload of identical bytes be recognised rather than re-traced. */
  sha256: string;
}

/**
 * What a RUN produces — about 2.5 MB, every time, for every attempt.
 *
 * 🛑 `thumbAtlasPath` is ONE sprite sheet, not N thumbnails, and that is a
 * storage decision rather than a UI one: object COUNT is metered separately
 * from bytes, so 60 thumbnails per run would spend Class A writes sixty times
 * faster for the same pixels. The part bounding boxes already live in
 * `geometry.json`, so one atlas plus those boxes is sufficient to render the
 * list — and it loads in one request instead of sixty.
 */
export interface RunArtifacts {
  previewPath?: string;
  overlayPath?: string;
  geometryPath?: string;
  cutSvgPath?: string;
  thumbAtlasPath?: string;
}

/**
 * What PROMOTING a run produces — full-resolution parts and the print exports.
 *
 * 🛑 Deliberately separate from `RunArtifacts`, because this is the single
 * decision that keeps the feature inside the Storage allowance. Rendering
 * full-res parts on every run costs ~600 MB per sheet across a tuning session;
 * rendering them only for the run actually chosen costs ~95 MB. That is the
 * difference between roughly 8 sheets and roughly 52 inside 5 GB, which is why
 * it is a schema boundary and not a flag.
 */
export interface PromotedArtifacts {
  at: Date;
  by: string;
  partAssetPaths: string[];
  cricutSvgPath?: string;
  printThenCutSvgPath?: string;
  pdfMosaicPath?: string;
}

/** What the SHEET carries once a run has been promoted onto it. */
export interface SheetArtifacts extends RunArtifacts {
  cricutSvgPath?: string;
  printThenCutSvgPath?: string;
  pdfMosaicPath?: string;
}

export interface SheetPart {
  /** 1-based, stable within the run that produced it. */
  ordinal: number;
  /** Auto-assigned as the ordinal, renameable by the admin. */
  name: string;
  /** Which physical sheet, when one scan holds several. */
  groupIndex: number;
  bboxPx: Rect;
  /** Null whenever dpi is untrustworthy — never a guess. */
  bboxMm: Rect | null;
  areaMm2: number | null;
  /** Full-resolution PNG. Absent until the producing run is promoted. */
  assetPath?: string;
  /**
   * "#7 is a copy of #3". Proposed by bbox + perceptual hash, CONFIRMED by a
   * human — a duplicate marked automatically is one the admin never gets asked
   * about, and two stickers that merely look alike at thumbnail size are common
   * on these sheets.
   */
  duplicateOf?: number;
}

/**
 * One progress transition, mirrored from RTDB so history survives the prune.
 *
 * 🛑 Capped at RUN_EVENTS_MAX with `eventsTruncated` recording the overflow —
 * the same discipline as `statusHistory`. An unbounded append on a `max`-tier
 * run with 60 shards approaches the 1 MiB document limit, and a truncation
 * nobody counted reads as "nothing else happened".
 */
export interface TraceRunEvent {
  at: Date;
  stage: TraceStage | "queued" | "done";
  pct: number;
  message?: string;
  level?: "info" | "warn" | "error";
}

export const RUN_EVENTS_MAX = 100;

/**
 * Why a run failed, in terms a retry panel can act on.
 *
 * `message` is user-safe — resolved through `toUserMessage`, never raw server
 * text. A Node `MODULE_NOT_FOUND` with a require stack rendered inside a
 * progress panel is Root Cause #86, and it reached a buyer's bid modal once
 * already.
 */
export interface TraceRunError {
  stage: TraceStage | "queued";
  code: string;
  message: string;
  /** Present when a SHARD failed, so the panel can name the part. */
  partOrdinal?: number;
}

export interface StickerSheetDocument extends BaseDocument {
  /**
   * 🛑 MANDATORY. Nothing processes without one.
   *
   * The whole point of keeping every attempt is being able to tell them apart
   * later, and "Untitled (3)" defeats that at the moment it matters most.
   */
  title: string;
  scanType: ScanType;
  dpi?: number;
  dpiSource?: DpiSource;
  widthPx: number;
  heightPx: number;
  sourceScan: StoredAsset;
  /** The run whose result this sheet currently shows. */
  activeRunId?: string;
  traceStatus: TraceRunStatus;
  partCount: number;
  groupCount: number;
  artifacts: SheetArtifacts;
  parts: SheetPart[];
}

export interface StickerTraceRunDocument extends BaseDocument {
  sheetId: string;
  /** 🛑 MANDATORY — "Run 3 — precise, tighter hysteresis". See the sheet's title. */
  name: string;
  tier: PrecisionTier;
  /**
   * The parameters this run ACTUALLY used, recorded rather than recomputed.
   *
   * Grouped by stage in `TraceParams` itself, which is what makes resume safe:
   * `resumeStage = max(requested, earliestChangedParamStage)`. Without that
   * clamp a run resumed from `parts` with a different ridge threshold produces
   * artifacts generated under different parameters than the run records, and
   * nothing anywhere contradicts it (Root Cause #42's shape).
   */
  params: TraceParams;
  requestedBy: string;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  status: TraceRunStatus;
  /** The stage it is in — or the stage it DIED in. */
  stage?: TraceStage | "queued" | "done";
  events: TraceRunEvent[];
  eventsTruncated?: number;
  partCount: number;
  groupCount: number;
  shardCount?: number;
  error?: TraceRunError;
  artifacts: RunArtifacts;
  promoted?: PromotedArtifacts | null;
  /** Set when retention strips the light artifacts; the row outlives its images. */
  artifactsPruned?: boolean;
}

/**
 * A unit of fan-out work. Doc-id-keyed, and that is what makes redelivery safe.
 *
 * 🛑 Cloud Functions guarantee AT-LEAST-ONCE delivery. The finalize task is
 * written with `create()` at `{runId}__finalize`, so a redelivered shard that
 * increments the counter again fails that create harmlessly instead of
 * spawning a second finalizer that double-renders every part.
 *
 * 🛑 Its trigger is `documentCreated`, never `documentWritten`. A write trigger
 * on a collection its own shards write back into is Root Cause #92 — one
 * million invocations a day against a two-million-a-month free quota, with a
 * billing page as the only symptom.
 */
export interface StickerTraceTaskDocument extends BaseDocument {
  runId: string;
  sheetId: string;
  kind: "part" | "finalize";
  /** `trace` renders review thumbnails; `full` renders promoted parts + exports. */
  mode: "thumb" | "full";
  shardIndex?: number;
  /** Ordinals this shard owns. Empty on a finalize task. */
  partOrdinals: number[];
}

export const STICKER_SHEET_FIELDS = {
  TITLE: "title",
  SCAN_TYPE: "scanType",
  TRACE_STATUS: "traceStatus",
  ACTIVE_RUN_ID: "activeRunId",
  PART_COUNT: "partCount",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const STICKER_TRACE_RUN_FIELDS = {
  SHEET_ID: "sheetId",
  NAME: "name",
  TIER: "tier",
  STATUS: "status",
  STAGE: "stage",
  REQUESTED_BY: "requestedBy",
  STARTED_AT: "startedAt",
  FINISHED_AT: "finishedAt",
  CREATED_AT: "createdAt",
} as const;
