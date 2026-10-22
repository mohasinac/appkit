"use client";

/*
 * WHY: Every irreversible thing about an export is decided before the file is
 *      produced — which machine, which page, and which parts that machine
 *      simply cannot cut. Those answers exist in the export report and had
 *      nowhere to be shown, so the only way to discover a part was too wide
 *      was to cut it and watch it run off the material.
 * WHAT: Pick a profile and a page, see what will actually happen, then export.
 *
 * 🛑 IT SHOWS THE REFUSALS BEFORE THE DOWNLOAD, and that ordering is the whole
 * design. An oversized part is NAMED here — never scaled to fit, because a
 * scaled part produces a cut file that looks correct and yields stickers the
 * wrong physical size, which is only discoverable against the real object.
 *
 * 🛑 The preview fetches a REPORT, never the file. The whole point is trying
 * three machines and two pages before committing, and each of those would
 * otherwise be a few hundred KB of SVG through a Vercel function — the egress
 * shape `audit-sticker-trace-egress` exists to refuse. The bytes come from a
 * signed GCS URL only once, when the operator actually exports.
 *
 * EXPORTS: StickerPrintPanel
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:tools/sticker-tracer
 * @tag sideEffects:none
 */

import { useCallback, useEffect, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Row,
  Span,
  Stack,
  Text,
} from "../../../ui/index";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import { toUserMessage } from "../../../errors/error-display-map";

/** Mirrors the export route's response. Kept structural — no appkit internals. */
export interface ExportReport {
  unfit: Array<{
    ordinal: number;
    name: string;
    widthMm: number;
    heightMm: number;
    verdict: { reasons: readonly string[] };
  }>;
  unplaceable: Array<{ ordinal: number; name: string }>;
  nodesBefore: number;
  nodesAfter: number;
  maxDeviationMm: number;
  overBudget: boolean;
  pageCount: number;
}

const PROFILES = [
  { value: "print-shop", label: "Print shop (Roland / Graphtec)" },
  { value: "cricut-cut", label: "Cricut Joy 2 — cut only" },
  { value: "cricut-ptc", label: "Cricut Joy 2 — Print Then Cut" },
];

const PAGES = [
  { value: "a4", label: "A4" },
  { value: "a3", label: "A3" },
  { value: "a5", label: "A5" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
  { value: "tabloid", label: "Tabloid" },
  { value: "joy-mat-standard", label: 'Joy mat 4.5 × 6.5"' },
  { value: "joy-mat-long", label: 'Joy mat 4.5 × 12"' },
  { value: "joy-mat-card", label: 'Joy card mat 4.5 × 6.25"' },
  { value: "joy-smart-material", label: 'Joy Smart Material 4.5 × 48"' },
];

export interface StickerPrintPanelProps {
  /** Fetches the report for a profile/page pair. Injected — appkit owns no transport. */
  loadReport: (
    profile: string,
    page: string,
  ) => Promise<{ report: ExportReport; refusedReason: string | null }>;
  /** Resolve and open the cut file's signed URL. */
  onDownloadCutFile?: () => void;
  /** Resolve and open the PDF mosaic. */
  onDownloadMosaic?: () => void;
}

/*
 * The report, rendered.
 *
 * 🛑 NOT exported. It was, "so the retry and review surfaces can reuse it" —
 * which is a consumer that does not exist, and audit-orphan-view-component
 * caught it as reachable only through a barrel. Split out for readability
 * inside this file; export it the day something actually imports it.
 */
function ExportReportView({ report }: { report: ExportReport }) {
  return (
    <Stack gap="dense">
      <Row gap="sm" wrap align="center">
        <Badge variant="info">
          {report.pageCount} page{report.pageCount === 1 ? "" : "s"}
        </Badge>
        <Badge variant={report.overBudget ? "danger" : "success"}>
          {report.nodesAfter.toLocaleString()} nodes
        </Badge>
        {report.maxDeviationMm > 0 ? (
          <Badge variant="warning">±{report.maxDeviationMm}mm</Badge>
        ) : null}
      </Row>

      {/*
        * The node budget's cost, stated rather than hidden. Export
        * simplification is a SEPARATE budget from the trace's, so a `max`-tier
        * trace can be re-simplified here — and an operator who is told
        * "48,900 nodes, worst deviation 0.08mm" can decide whether that
        * matters. One told nothing cannot.
        */}
      {report.nodesAfter < report.nodesBefore ? (
        <Text size="sm" color="muted">
          Simplified from {report.nodesBefore.toLocaleString()} nodes to fit this
          machine&apos;s budget. Worst-case deviation from the traced outline:{" "}
          <Span weight="semibold">{report.maxDeviationMm}mm</Span>.
        </Text>
      ) : null}

      {report.overBudget ? (
        <Alert variant="error">
          Still over this machine&apos;s node budget after simplification. Design
          Space may refuse to open the file — try the print-shop profile, which
          has no ceiling, or split the sheet.
        </Alert>
      ) : null}

      {/*
        * 🛑 Unfit parts are listed BY NAME with the machine's own reasons. This
        * is the screen that exists so nobody discovers a too-wide part by
        * cutting it.
        */}
      {report.unfit.length > 0 ? (
        <Alert variant="warning">
          <Stack gap="dense">
            <Text weight="semibold">
              {report.unfit.length} part
              {report.unfit.length === 1 ? "" : "s"} this machine cannot cut:
            </Text>
            {report.unfit.map((u) => (
              <Text key={u.ordinal} size="sm">
                <Span weight="semibold">{u.name}</Span> (
                {u.widthMm.toFixed(1)} × {u.heightMm.toFixed(1)}mm) —{" "}
                {u.verdict.reasons.join(" ")}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {report.unplaceable.length > 0 ? (
        <Alert variant="warning">
          {report.unplaceable.length} part
          {report.unplaceable.length === 1 ? "" : "s"} would not fit on this page
          at any rotation:{" "}
          {report.unplaceable.map((u) => u.name).join(", ")}. A larger page, or
          the print-shop profile, will take them.
        </Alert>
      ) : null}
    </Stack>
  );
}

export function StickerPrintPanel({
  loadReport,
  onDownloadCutFile,
  onDownloadMosaic,
}: StickerPrintPanelProps) {
  const [profile, setProfile] = useState("print-shop");
  const [page, setPage] = useState("a4");
  const [report, setReport] = useState<ExportReport | null>(null);
  const [refusedReason, setRefusedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadReport(profile, page);
      setReport(res.report);
      setRefusedReason(res.refusedReason);
    } catch (err) {
      const n = normalizeError(err);
      /*
       * Kept distinct from `refusedReason`. A refusal is a true answer about
       * this sheet — "no confirmed DPI" — while this is the request failing.
       * Rendering both the same way would have an operator confirming a DPI to
       * fix a lapsed session.
       */
      setError(toUserMessage(n.code, undefined, { fallback: "We couldn't prepare that print. Please try again." }));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [loadReport, profile, page]);

  // Re-report on every change: the point of the panel is comparing options.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /*
   * 🛑 Downloads stay enabled while a REFUSAL is showing only when there is
   * something to download. A refusal means no file exists, so offering the
   * button would hand the operator a 404 for a reason the panel just explained.
   */
  const canDownload = report !== null && refusedReason === null && report.pageCount > 0;

  return (
    <Card variant="default">
      <Stack gap="comfortable">
        <Heading level={3}>Print &amp; export</Heading>

        <FieldSelect
          name="profile"
          label="Machine"
          value={profile}
          options={PROFILES}
          onChange={setProfile}
        />
        <FieldSelect
          name="page"
          label="Page / material"
          value={page}
          options={PAGES}
          onChange={setPage}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        {/*
          * The refusal, verbatim from the server. It names the fix — confirm
          * the DPI, promote a run — rather than describing the symptom.
          */}
        {refusedReason ? <Alert variant="warning">{refusedReason}</Alert> : null}

        {loading ? (
          <Text color="muted">Checking what this machine can do…</Text>
        ) : report && !refusedReason ? (
          <ExportReportView report={report} />
        ) : null}

        <Row gap="sm" wrap>
          <Button
            variant="primary"
            disabled={!canDownload}
            onClick={() => onDownloadCutFile?.()}
          >
            Download cut file
          </Button>
          <Button
            variant="secondary"
            disabled={!canDownload}
            onClick={() => onDownloadMosaic?.()}
          >
            Download PDF mosaic
          </Button>
        </Row>

        {/*
          * Repeated here as well as in the PDF's own footer. The person
          * printing is often not the person who exported, and "fit to page" is
          * the default in several dialogs — it silently rescales a document
          * whose entire purpose is true physical size.
          */}
        <Text size="xs" color="muted">
          Print the mosaic at 100% — never &ldquo;fit to page&rdquo;, or the
          stickers come out the wrong size.
        </Text>
      </Stack>
    </Card>
  );
}
