"use client";

/*
 * WHY: The studio tunes a scan entirely in the tab — no upload, no Storage
 *      object, no Function invocation. That is the whole reason the codec is a
 *      port. This is the deliberate moment the operator decides those
 *      parameters are worth spending quota on.
 * WHAT: Name the attempt, pick a real tier, upload the scan, start the run.
 *
 * 🛑 THE NAME IS MANDATORY AND THE BUTTON STAYS DISABLED WITHOUT ONE. The
 * server rejects an empty name and so does this; the requirement is that every
 * attempt is something you can tell apart from the other seven later, and
 * "Untitled (3)" defeats it exactly when it matters.
 *
 * 🛑 The tier here is NOT the studio's. The studio is draft-only because it
 * runs on the main thread and draft's 1200px cap is what keeps a trace near a
 * second. A committed run is a server run, so the heavy tiers become available
 * for the first time — which is the point of committing at all.
 *
 * 🛑 The upload is three hops and the ROW IS CREATED FIRST. The object path
 * contains the sheet id, so a signed upload before the row exists has nowhere
 * to go — and an object with no document pointing at it is unreachable AND
 * unmeterable. See `createStickerSheet` for the full argument.
 *
 * EXPORTS: StickerCommitPanel, StickerCommitResult
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:tools/sticker-tracer
 * @tag sideEffects:none
 */

import { useCallback, useMemo, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { Alert, Button, Card, Form, Heading, Stack, Text } from "../../../ui/index";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import type { PrecisionTier } from "../../../_internal/shared/features/sticker-trace/types";
import { TIER_HELP } from "../constants/help-content";

/** Every tier, unlike the studio — see the header. */
const TIERS: PrecisionTier[] = ["draft", "standard", "precise", "max"];

export interface StickerCommitResult {
  sheetId: string;
  runId: string;
  /** Carries the single per-run claim for the live progress channel. */
  customToken: string;
}

export interface StickerCommitPanelProps {
  /** The file the studio is currently showing. Null disables the whole panel. */
  file: File | null;
  /** The raster's real size, from the studio's own decode. */
  dimensions: { widthPx: number; heightPx: number } | null;
  /**
   * Does the whole three-hop commit. Injected rather than imported so this
   * component stays in appkit and the consumer owns the transport — the same
   * seam the codec uses.
   */
  onCommit: (input: {
    file: File;
    title: string;
    tier: PrecisionTier;
    widthPx: number;
    heightPx: number;
  }) => Promise<StickerCommitResult>;
  onCommitted?: (result: StickerCommitResult) => void;
}

export function StickerCommitPanel({
  file,
  dimensions,
  onCommit,
  onCommitted,
}: StickerCommitPanelProps) {
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<PrecisionTier>("standard");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The file's size in MB, shown rather than hidden. A scan is stored AS
   * UPLOADED — no re-encode, because compression artefacts measured the same
   * magnitude as the cut-line signal on the halftone sample — so what an
   * operator picks here is what the storage meter will report forever.
   */
  const sizeMb = useMemo(
    () => (file ? Math.round((file.size / (1024 * 1024)) * 10) / 10 : 0),
    [file],
  );

  const ready = Boolean(file && dimensions && title.trim().length > 0 && !pending);

  const submit = useCallback(async () => {
    if (!file || !dimensions) return;
    setPending(true);
    setError(null);
    try {
      const result = await onCommit({
        file,
        title: title.trim(),
        tier,
        widthPx: dimensions.widthPx,
        heightPx: dimensions.heightPx,
      });
      onCommitted?.(result);
    } catch (err) {
      const n = normalizeError(err);
      /*
       * normalizeError FIRST — the project-wide rule, and the explanation goes
       * after the call rather than between it and the catch, because
       * audit-catch-normalize checks the first STATEMENT and a long comment in
       * between pushes the call outside its window.
       *
       * The message reaches an admin uploading their own scan, so the real text
       * is useful here. Root Cause #86 is about SERVER internals reaching a
       * buyer, which this is not — and the routes already map their own
       * failures to user-safe text.
       */
      setError(n.message);
    } finally {
      setPending(false);
    }
  }, [file, dimensions, title, tier, onCommit, onCommitted]);

  if (!file) {
    return (
      <Card variant="default">
        <Text color="muted">
          Pick a scan and tune it above. Nothing is uploaded until you commit a
          run — the trace you are watching runs entirely in this tab.
        </Text>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <Form onSubmit={(e) => e.preventDefault()}>
        <Stack gap="comfortable">
          <Heading level={3}>Commit this as a run</Heading>

          <Text size="sm" color="muted">
            Uploads <Text as="span" weight="semibold">{file.name}</Text> ({sizeMb} MB)
            and traces it at full resolution on the server. The parameters you
            tuned above are the starting point; a run keeps its own copy, so
            later edits here never change what an earlier run recorded.
          </Text>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <FieldInput
            name="title"
            label="Name this sheet"
            required
            value={title}
            onChange={setTitle}
          />
          <Text size="xs" color="muted">
            Required — nothing processes without one. Name it so you recognise it
            next to the others: &ldquo;Driger G, matte scan 600dpi&rdquo;.
          </Text>

          <FieldSelect
            name="tier"
            label="Tier"
            value={tier}
            options={TIERS.map((t) => ({ value: t, label: TIER_HELP[t].title }))}
            onChange={(v) => setTier(v as PrecisionTier)}
          />
          <Text size="xs" color="muted">
            {TIER_HELP[tier].body}
          </Text>

          {/*
            * Said plainly rather than discovered. `max` is the tier most likely
            * to produce a cut file Design Space cannot open, and an operator
            * picking it deserves to know that before spending the quota rather
            * than after.
            */}
          {tier === "max" ? (
            <Alert variant="warning">
              Max is expensive in both time and quota, and its finer simplify can
              push a busy sheet past Design Space&apos;s node ceiling. Try precise
              first unless a halftone scan is merging two stickers.
            </Alert>
          ) : null}

          {!dimensions ? (
            <Text size="xs" color="muted">
              Waiting for the scan to finish decoding…
            </Text>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            disabled={!ready}
            onClick={submit}
          >
            {pending ? "Uploading and starting…" : "Upload and run"}
          </Button>
        </Stack>
      </Form>
    </Card>
  );
}
