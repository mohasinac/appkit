"use client";

/*
 * WHY: Up to this point the tracer was logic with no surface — the codec, the
 *      core and the live hook all worked and nobody could open them. This is
 *      the first thing a human can actually tune a scan with.
 * WHAT: Pick a local file, move the parameters, watch the outlines redraw.
 *
 * 🛑 The bytes NEVER leave the tab. The file goes straight into the canvas
 * codec, so tuning costs no upload, no Storage object and no Function
 * invocation — which is the whole reason the codec is a port. Uploading only
 * happens later, when the operator commits to a run.
 *
 * EXPORTS: StickerTraceStudio
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:tools/sticker-tracer
 * @tag sideEffects:none
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  FilePickerButton,
  Grid,
  Heading,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui/index";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import { paramsForTier } from "../../../_internal/shared/features/sticker-trace/config";
import type {
  PrecisionTier,
  TraceParams,
} from "../../../_internal/shared/features/sticker-trace/types";
import { CUT_CONTOUR_CSS } from "../../../_internal/shared/features/sticker-trace/cut-contour";
import { PARAM_HELP, TIER_HELP } from "../constants/help-content";
import { useLiveTrace } from "../hooks/useLiveTrace";
import { canvasCodec } from "../../../_internal/client/features/sticker-trace/canvas-codec";
import { normalizeError } from "../../../errors/normalize";

/*
 * Only `draft` is offered. The hook runs on the main thread and draft's
 * 1200px cap is what keeps one trace near a second; `standard`'s 3000 would
 * block the tab for several. The heavier tiers are a property of a RUN, chosen
 * when the operator commits — offering them here would be a control that
 * freezes the page.
 */
const TIER: PrecisionTier = "draft";

/**
 * The four parameters worth a live control.
 *
 * 🛑 Deliberately NOT every parameter. `TraceParams` has two dozen members and
 * a form of two dozen sliders is a form nobody reads — these are the four the
 * corpus work actually moved when a scan came out wrong, and the rest keep
 * their tier defaults. The full set belongs in the run's advanced panel, where
 * it is edited deliberately rather than dragged.
 */
/*
 * The four parameters worth a live control.
 *
 * 🛑 Deliberately NOT every parameter. `TraceParams` has two dozen members and
 * a form of two dozen sliders is a form nobody reads — these are the four the
 * corpus work actually moved when a scan came out wrong, and the rest keep
 * their tier defaults.
 *
 * 🛑 The hint text comes from PARAM_HELP, not from a literal here. It used to
 * be a second, shorter paraphrase of the same explanation, which is the copy
 * that drifts: the inline hint is the one people actually read, so it has to be
 * the same words the help panel shows.
 */
const CONTROLS = [
  { key: "ridgeHysteresisLow" as const, step: 0.01 },
  { key: "ridgeHysteresisHigh" as const, step: 0.01 },
  { key: "paperTolerance" as const, step: 1 },
  { key: "minPartAreaMm2" as const, step: 5 },
];

export interface StickerTraceStudioProps {
  /**
   * Rendered under the canvas — where a parent puts "commit this as a run".
   *
   * 🛑 `dimensions` are the scan's NATURAL size, from `codec.probe` — NOT the
   * raster's. The working raster is capped at the tier's `workingLongEdge`
   * (1200 at draft), so handing over `raster.width` would record the draft
   * size as the scan's true size on the sheet document, and every millimetre
   * derived from it afterwards would be wrong by the downscale factor.
   *
   * The browser is the only party that can measure this at all: appkit cannot
   * probe an image (the codec is injected, Root Cause #24) and reading the
   * header server-side would mean pulling up to 100 MB into a function, which
   * is the egress mistake this feature exists to avoid. Null until the probe
   * lands.
   */
  renderCommit?: (ctx: {
    params: TraceParams;
    file: File | null;
    dimensions: { widthPx: number; heightPx: number } | null;
  }) => React.ReactNode;
}

export function StickerTraceStudio({ renderCommit }: StickerTraceStudioProps) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<Uint8Array | null>(null);
  const [params, setParams] = useState<TraceParams>(() => paramsForTier(TIER));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { parts, diagnostics, raster, tracing, lastMs, error } = useLiveTrace(source, params);

  /*
   * The scan's natural size, probed once per file.
   *
   * Deliberately separate from the trace: `probe` reads the header only and
   * does not decode pixels, so this costs nothing next to the trace itself —
   * and it is the only number the commit flow may record as the scan's size.
   */
  const [natural, setNatural] = useState<{ widthPx: number; heightPx: number } | null>(
    null,
  );
  const [probeError, setProbeError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setNatural(null);
      return;
    }
    let live = true;
    setProbeError(null);
    void canvasCodec
      .probe(source)
      .then((p) => {
        if (live) setNatural({ widthPx: p.width, heightPx: p.height });
      })
      .catch((err) => {
        const n = normalizeError(err);
        // A failed probe must not silently fall back to the raster's size —
        // that is the downscaled one, and a wrong scan size is invisible until
        // a millimetre figure reaches a cut file. Null blocks the commit.
        // Recorded on state rather than logged: this is a client component, and
        // the operator is the one who needs to know the commit is blocked.
        if (live) {
          setNatural(null);
          setProbeError(n.message);
        }
      });
    return () => {
      live = false;
    };
  }, [source]);

  const onFile = useCallback((picked: File) => {
    setFile(picked);
    void picked.arrayBuffer().then((buf) => setSource(new Uint8Array(buf)));
  }, []);

  const setParam = useCallback((key: keyof TraceParams, value: number) => {
    setParams((p) => ({ ...p, [key]: value }));
  }, []);

  /*
   * Draw the raster, then stroke every part's outline over it.
   *
   * 🛑 The outlines are stroked from the BÉZIER PATHS, not from the alpha
   * masks. A mask would show what the rasteriser produced; the paths are what
   * the machine will actually cut, and the two can differ — which is precisely
   * what an operator needs to see before committing.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !raster) return;
    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height),
      0,
      0,
    );

    ctx.lineWidth = Math.max(1, raster.width / 600);
    /*
     * The CutContour spot colour, from the shared domain constant — the same
     * value the print-shop SVG export will carry. A themed stroke would drift
     * from the export and change with the viewer's theme while the cut file
     * did not.
     */
    ctx.strokeStyle = CUT_CONTOUR_CSS;
    for (const part of parts) {
      const p = part.path;
      ctx.beginPath();
      ctx.moveTo(p.start.x, p.start.y);
      for (const seg of p.segments) {
        ctx.bezierCurveTo(seg.c1.x, seg.c1.y, seg.c2.x, seg.c2.y, seg.to.x, seg.to.y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }, [raster, parts]);

  const bgLabel = useMemo(
    () => (diagnostics ? (diagnostics.paperColour ? "paper" : "art") : "—"),
    [diagnostics],
  );

  return (
    <Section>
      <Stack gap="comfortable">
        <Row gap="comfortable" align="center">
          <FilePickerButton onFile={onFile} accept="image/*">
            {file ? "Choose a different scan" : "Choose a scan"}
          </FilePickerButton>
          {file ? <Text size="sm" color="muted">{file.name}</Text> : null}
        </Row>

        {error ? (
          <Card variant="default">
            <Text color="error" role="alert">
              {error}
            </Text>
          </Card>
        ) : null}

        {/*
          * Separate from the trace error on purpose. A failed trace means the
          * parameters need work; a failed PROBE means the scan's true size is
          * unknown, which blocks committing entirely — and silently falling
          * back to the downscaled raster's size would put a wrong number on the
          * sheet that only surfaces as a wrong millimetre on a cut file.
          */}
        {probeError ? (
          <Card variant="default">
            <Text color="error" role="alert">
              Could not read this scan&apos;s dimensions ({probeError}). You can
              still tune it, but it cannot be committed as a run until that
              works — a run needs the real pixel size, not the preview&apos;s.
            </Text>
          </Card>
        ) : null}

        {source ? (
          <Grid cols="cards">
            <Card variant="default">
              <Stack gap="comfortable">
                <Heading level={3}>Parameters</Heading>
                {CONTROLS.map((c) => (
                  <Stack key={c.key} gap="dense">
                    <FieldInput
                      name={c.key}
                      type="number"
                      label={PARAM_HELP[c.key]?.title ?? c.key}
                      step={c.step}
                      value={String(params[c.key])}
                      onChange={(v) => {
                        const n = Number(v);
                        // A half-typed "0." parses NaN; keeping the old value
                        // beats re-tracing against a NaN and blanking the canvas.
                        if (Number.isFinite(n)) setParam(c.key, n);
                      }}
                    />
                    <Text size="xs" color="muted">
                      {PARAM_HELP[c.key]?.body}
                    </Text>
                  </Stack>
                ))}
                <FieldSelect
                  name="tier"
                  label="Tier"
                  value={TIER}
                  disabled
                  options={[{ value: TIER, label: TIER_HELP[TIER].title }]}
                  onChange={() => undefined}
                />
                <Text size="xs" color="muted">
                  {TIER_HELP[TIER].body}
                </Text>
              </Stack>
            </Card>

            <Card variant="default">
              <Stack gap="dense">
                <Heading level={3}>Result</Heading>
                <Text>
                  {/*
                    * Parts and sheets are shown together on purpose: zero parts
                    * with one sheet-sized component is the montage signature,
                    * and separating the two numbers hides it.
                    */}
                  <Span weight="bold">{parts.length}</Span> part(s)
                  {diagnostics ? ` · ${diagnostics.droppedSheetSized} sheet-sized` : ""}
                  {diagnostics ? ` · ${diagnostics.droppedBelowMinArea} too small` : ""}
                </Text>
                <Text size="sm" color="muted">
                  background: {bgLabel}
                  {diagnostics
                    ? ` · ridge ${(diagnostics.ridgeCoverage * 100).toFixed(1)}%`
                    : ""}
                  {lastMs !== null ? ` · ${lastMs} ms` : ""}
                  {tracing ? " · tracing…" : ""}
                </Text>
                {diagnostics && parts.length === 0 && diagnostics.droppedSheetSized >= 1 ? (
                  <Text size="sm" color="warning">
                    No parts, and one component covers the whole sheet — this looks
                    like several sheets in one scan, which is unsupported. Scan them
                    individually or crop.
                  </Text>
                ) : null}
              </Stack>
            </Card>
          </Grid>
        ) : (
          <Text color="muted">
            Pick a scanned sticker sheet to trace. Nothing is uploaded — the trace
            runs entirely in this tab.
          </Text>
        )}

        {source ? (
          <Card variant="default">
            {/*
              * Scaled to fit by CLASS, not an inline style — the width is
              * static, so there is nothing dynamic to justify one
              * (audit-inline-styles caught it). The canvas keeps the raster's
              * own pixel size via width/height attributes set in the effect;
              * only its DISPLAY size is responsive.
              */}
            <canvas ref={canvasRef} className="w-full h-auto" />
          </Card>
        ) : null}

        {renderCommit?.({
          params,
          file,
          dimensions: natural,
        })}
      </Stack>
    </Section>
  );
}
