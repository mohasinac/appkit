/*
 * WHY: Every `*Path` on these documents is a raw private Storage path. A
 *      document field is private until someone names it public, and the only
 *      thing that actually removes a field at runtime is a function that builds
 *      a NEW object.
 * WHAT: The sheet and run projections, with every schema field triaged.
 *
 * 🛑 ALLOW-LIST, never spread-and-delete. A denial keyed on a TypeScript
 * interface is structurally blind to fields the interface does not declare —
 * which is exactly how `adSettings.providerCredentials` went out unmasked from
 * `GET /api/site-settings` (Root Cause #70). These build literals.
 *
 * 🛑 A NARROW PROP TYPE STRIPS NOTHING. TypeScript's structural typing accepts
 * a wider object without complaint and Next serialises whatever the value
 * actually is, so typing a client prop `ClientStickerSheet` while passing a
 * `StickerSheetDocument` publishes every path in it. Only these functions
 * remove anything.
 *
 * 🛑 PATHS ARE REPLACED BY BOOLEANS, not omitted silently. The review UI needs
 * to know an overlay EXISTS so it can offer the button; it must never learn
 * WHERE. It then asks an authenticated route for a 5-minute signed URL. A bare
 * omission would have left the UI unable to tell "no overlay" from "overlay I
 * cannot see", and the obvious fix for that is to leak the path.
 *
 * EXPORTS: ClientStickerSheet, ClientSheetPart, ClientTraceRun,
 *   toClientStickerSheet, toClientTraceRun,
 *   PUBLIC_STICKER_SHEET_FIELDS, PRIVATE_STICKER_SHEET_FIELDS,
 *   PUBLIC_TRACE_RUN_FIELDS, PRIVATE_TRACE_RUN_FIELDS
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:adapter
 * @tag access:server
 * @tag consumers:api/admin/sticker-sheets,sticker-trace/components
 * @tag sideEffects:none
 */

import type {
  DpiSource,
  SheetPart,
  StickerSheetDocument,
  StickerTraceRunDocument,
  TraceRunError,
  TraceRunEvent,
  TraceRunStatus,
} from "../../../../features/sticker-trace/schemas/firestore";
import type {
  PrecisionTier,
  Rect,
  ScanType,
  TraceParams,
  TraceStage,
} from "../../../shared/features/sticker-trace/types";

/*
 * ---------------------------------------------------------------------------
 * The triage. Every schema field appears in exactly ONE of these lists, with a
 * reason on each private entry. audit-public-projection-parity fails on an
 * untriaged field, so adding one to the schema forces a decision here.
 * ---------------------------------------------------------------------------
 */

export const PUBLIC_STICKER_SHEET_FIELDS = [
  "id",
  "title",
  "scanType",
  "dpi",
  "dpiSource", // always shown and always confirmable — see the schema's 🛑
  "widthPx",
  "heightPx",
  "activeRunId",
  "traceStatus",
  "partCount",
  "groupCount",
  "parts", // projected per-part; `assetPath` stripped inside
  "createdAt",
  "updatedAt",
] as const;

export const PRIVATE_STICKER_SHEET_FIELDS = [
  // Carries assetPath (a raw private Storage path) and sha256. Only `bytes` is
  // surfaced, as sourceScanBytes, for the usage meter.
  "sourceScan",
  // Every member is a raw private Storage path. The client gets booleans here
  // and a 5-minute signed URL from an authenticated route.
  "artifacts",
] as const;

export const PUBLIC_TRACE_RUN_FIELDS = [
  "id",
  "sheetId",
  "name",
  "tier",
  "params", // the retry panel shows and edits these
  "requestedBy", // an Auth UID, never a name or an email — the actorUid rule
  "startedAt",
  "finishedAt",
  "durationMs",
  "status",
  "stage",
  "events", // the progress history the panel renders; messages are user-safe by contract
  "eventsTruncated",
  "partCount",
  "groupCount",
  "shardCount",
  "error", // stage/code/message/partOrdinal — message resolved through toUserMessage
  "artifactsPruned", // the retry panel MUST know artifacts are gone before offering resume
  "createdAt",
  "updatedAt",
] as const;

export const PRIVATE_TRACE_RUN_FIELDS = [
  // Raw private Storage paths (preview/overlay/geometry/cutSvg/thumbAtlas).
  // Surfaced as hasPreview/hasOverlay/hasGeometry/hasCutSvg/hasThumbAtlas.
  "artifacts",
  // partAssetPaths plus the three export paths are all raw Storage paths.
  // `at`/`by` are surfaced as promotedAt/promotedBy, the count as
  // promotedPartCount.
  "promoted",
] as const;

/* --------------------------------------------------------------------------- */

/** A part as the review UI sees it: geometry and identity, never a path. */
export interface ClientSheetPart {
  ordinal: number;
  name: string;
  groupIndex: number;
  bboxPx: Rect;
  /** Null whenever dpi is untrustworthy — never a fabricated millimetre. */
  bboxMm: Rect | null;
  areaMm2: number | null;
  /** Whether a full-resolution render exists, NOT where it is. */
  hasAsset: boolean;
  duplicateOf?: number;
}

export interface ClientStickerSheet {
  id: string;
  title: string;
  scanType: ScanType;
  dpi?: number;
  dpiSource?: DpiSource;
  widthPx: number;
  heightPx: number;
  /** Size only. The path and hash never leave the server. */
  sourceScanBytes: number;
  activeRunId?: string;
  traceStatus: TraceRunStatus;
  partCount: number;
  groupCount: number;
  parts: ClientSheetPart[];
  hasPreview: boolean;
  hasOverlay: boolean;
  hasGeometry: boolean;
  hasCutSvg: boolean;
  hasCricutSvg: boolean;
  hasPrintThenCutSvg: boolean;
  hasPdfMosaic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientTraceRun {
  id: string;
  sheetId: string;
  name: string;
  tier: PrecisionTier;
  params: TraceParams;
  requestedBy: string;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  status: TraceRunStatus;
  stage?: TraceStage | "queued" | "done";
  events: TraceRunEvent[];
  eventsTruncated?: number;
  partCount: number;
  groupCount: number;
  shardCount?: number;
  error?: TraceRunError;
  artifactsPruned?: boolean;
  hasPreview: boolean;
  hasOverlay: boolean;
  hasGeometry: boolean;
  hasCutSvg: boolean;
  hasThumbAtlas: boolean;
  /** Promotion is a fact about the run; its paths are not. */
  promotedAt?: Date;
  promotedBy?: string;
  promotedPartCount: number;
  hasCricutSvg: boolean;
  hasPrintThenCutSvg: boolean;
  hasPdfMosaic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toClientPart(part: SheetPart): ClientSheetPart {
  return {
    ordinal: part.ordinal,
    name: part.name,
    groupIndex: part.groupIndex,
    bboxPx: part.bboxPx,
    bboxMm: part.bboxMm,
    areaMm2: part.areaMm2,
    hasAsset: Boolean(part.assetPath),
    ...(part.duplicateOf !== undefined ? { duplicateOf: part.duplicateOf } : {}),
  };
}

export function toClientStickerSheet(doc: StickerSheetDocument): ClientStickerSheet {
  const a = doc.artifacts ?? {};
  return {
    id: doc.id,
    title: doc.title,
    scanType: doc.scanType,
    dpi: doc.dpi,
    dpiSource: doc.dpiSource,
    widthPx: doc.widthPx,
    heightPx: doc.heightPx,
    sourceScanBytes: doc.sourceScan?.bytes ?? 0,
    activeRunId: doc.activeRunId,
    traceStatus: doc.traceStatus,
    partCount: doc.partCount,
    groupCount: doc.groupCount,
    parts: (doc.parts ?? []).map(toClientPart),
    hasPreview: Boolean(a.previewPath),
    hasOverlay: Boolean(a.overlayPath),
    hasGeometry: Boolean(a.geometryPath),
    hasCutSvg: Boolean(a.cutSvgPath),
    hasCricutSvg: Boolean(a.cricutSvgPath),
    hasPrintThenCutSvg: Boolean(a.printThenCutSvgPath),
    hasPdfMosaic: Boolean(a.pdfMosaicPath),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toClientTraceRun(doc: StickerTraceRunDocument): ClientTraceRun {
  const a = doc.artifacts ?? {};
  const p = doc.promoted ?? null;
  return {
    id: doc.id,
    sheetId: doc.sheetId,
    name: doc.name,
    tier: doc.tier,
    params: doc.params,
    requestedBy: doc.requestedBy,
    startedAt: doc.startedAt,
    finishedAt: doc.finishedAt,
    durationMs: doc.durationMs,
    status: doc.status,
    stage: doc.stage,
    events: doc.events ?? [],
    eventsTruncated: doc.eventsTruncated,
    partCount: doc.partCount,
    groupCount: doc.groupCount,
    shardCount: doc.shardCount,
    error: doc.error,
    artifactsPruned: doc.artifactsPruned,
    hasPreview: Boolean(a.previewPath),
    hasOverlay: Boolean(a.overlayPath),
    hasGeometry: Boolean(a.geometryPath),
    hasCutSvg: Boolean(a.cutSvgPath),
    hasThumbAtlas: Boolean(a.thumbAtlasPath),
    ...(p?.at ? { promotedAt: p.at } : {}),
    ...(p?.by ? { promotedBy: p.by } : {}),
    promotedPartCount: p?.partAssetPaths?.length ?? 0,
    hasCricutSvg: Boolean(p?.cricutSvgPath),
    hasPrintThenCutSvg: Boolean(p?.printThenCutSvgPath),
    hasPdfMosaic: Boolean(p?.pdfMosaicPath),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
