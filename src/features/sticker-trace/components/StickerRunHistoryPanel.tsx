"use client";

/*
 * WHY: Tuning a halftone scan takes several attempts, and the attempts ARE the
 *      deliverable — "run 2 died at ridge, run 1's parts are still the accepted
 *      set" is the question this feature exists to answer. Until now the runs
 *      existed in Firestore with nothing able to list them.
 * WHAT: Every attempt on one sheet, newest first, with what each produced.
 *
 * 🛑 A run is NEVER overwritten. A retry is a new named run, so this list only
 * grows — which is why each row leads with the NAME the operator typed rather
 * than an id. "Untitled (3)" would defeat the whole point at the moment it
 * matters most.
 *
 * 🛑 It renders `has.*` BOOLEANS, never paths. The list action returns a
 * projection with no `*Path` fields at all: an artifact's existence is all a
 * list needs in order to offer "open overlay", and the path would be a private
 * Storage location that must not reach a client
 * (PRIVATE_TRACE_RUN_FIELDS, audit-public-projection-parity).
 *
 * EXPORTS: StickerRunHistoryPanel, StickerRunRow
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:tools/sticker-tracer
 * @tag sideEffects:none
 */

import { useCallback, useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Heading,
  Row,
  Span,
  Stack,
  Text,
} from "../../../ui/index";
import { TIER_HELP } from "../constants/help-content";

/** One attempt. Mirrors the route's projection — booleans, never paths. */
export interface StickerRunRow {
  id: string;
  name: string;
  tier: string;
  status: string;
  stage: string | null;
  partCount: number;
  groupCount: number;
  durationMs: number | null;
  createdAt: string;
  finishedAt: string | null;
  isActive: boolean;
  isPromoted: boolean;
  has: {
    preview: boolean;
    overlay: boolean;
    geometry: boolean;
    cutSvg: boolean;
    thumbAtlas: boolean;
  };
  error?: { stage: string; code: string; message: string; partOrdinal?: number } | null;
}

export interface StickerRunHistoryPanelProps {
  runs: readonly StickerRunRow[];
  loading?: boolean;
  /** Open a run's overlay or preview. Resolves a signed URL; the panel never holds one. */
  onOpenAsset?: (runId: string, kind: "preview" | "overlay" | "cutSvg") => void;
  /** Start a retry from this run — the retry panel takes it from here. */
  onRetry?: (run: StickerRunRow) => void;
  /**
   * Accept this run as the sheet's result and render its parts full-size.
   *
   * 🛑 Offered only on a SUCCEEDED run that is not already active. Promoting a
   * failed run would copy a partial result onto the sheet, and re-promoting the
   * active one spends the whole render budget to reach the state it is in.
   */
  onPromote?: (run: StickerRunRow) => void;
}

/**
 * 🛑 `succeeded` is NOT the same as `isActive`, and the badges keep them apart.
 *
 * A run can succeed and still not be the sheet's accepted result — that is the
 * normal case once you have tried three tiers. Collapsing the two would make
 * "which parts does this sheet actually show" unanswerable from the list, which
 * is most of what the list is for.
 */
function statusTone(status: string): "success" | "danger" | "warning" | "info" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "warning";
  return "info";
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/**
 * Dates are formatted with an EXPLICIT locale and options.
 *
 * A bare `toLocaleString()` renders differently on the server and in the
 * browser, which React reports as a hydration mismatch on a component whose
 * only job is to be read.
 */
const STAMP: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function StickerRunHistoryPanel({
  runs,
  loading = false,
  onOpenAsset,
  onRetry,
  onPromote,
}: StickerRunHistoryPanelProps) {
  const open = useCallback(
    (runId: string, kind: "preview" | "overlay" | "cutSvg") => () =>
      onOpenAsset?.(runId, kind),
    [onOpenAsset],
  );

  const sorted = useMemo(
    () => [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [runs],
  );

  if (loading) {
    return (
      <Card variant="default">
        <Text color="muted">Loading attempts…</Text>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card variant="default">
        <Stack gap="dense">
          <Heading level={3}>Attempts</Heading>
          <Text color="muted">
            No runs yet. Tune the parameters above, give the attempt a name, and
            commit it — every attempt is kept so you can compare them later.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="comfortable">
      <Heading level={3}>Attempts ({sorted.length})</Heading>

      {sorted.map((run) => (
        <Card key={run.id} variant="default">
          <Stack gap="dense">
            <Row align="center" justify="between" gap="sm" wrap>
              <Row align="center" gap="sm" wrap>
                <Text weight="bold">{run.name}</Text>
                <Badge variant={statusTone(run.status)}>{run.status}</Badge>
                {run.isActive ? <Badge variant="info">accepted</Badge> : null}
                {run.isPromoted ? <Badge variant="success">promoted</Badge> : null}
              </Row>
              <Text size="xs" color="muted">
                {new Date(run.createdAt).toLocaleString("en-GB", STAMP)}
              </Text>
            </Row>

            <Text size="sm" color="muted">
              {TIER_HELP[run.tier as keyof typeof TIER_HELP]?.title ?? run.tier}
              {" · "}
              {run.partCount} part{run.partCount === 1 ? "" : "s"}
              {run.groupCount > 1 ? ` in ${run.groupCount} sheets` : ""}
              {" · "}
              {formatDuration(run.durationMs)}
            </Text>

            {/*
              * A failed run shows the STAGE it died in and the part ordinal when
              * a shard was the thing that failed. "Something went wrong" is what
              * this panel exists to replace — the requirement was "even if we
              * fail we know", and a stage name is the smallest thing that
              * satisfies it.
              */}
            {run.status === "failed" && run.error ? (
              <Text size="sm" color="error" role="alert">
                Failed at <Span weight="semibold">{run.error.stage}</Span>
                {typeof run.error.partOrdinal === "number"
                  ? ` on part ${run.error.partOrdinal}`
                  : ""}
                : {run.error.message}
              </Text>
            ) : null}

            {run.status === "running" && run.stage ? (
              <Text size="sm" color="muted">
                Currently in <Span weight="semibold">{run.stage}</Span>.
              </Text>
            ) : null}

            <Row gap="sm" wrap>
              {run.has.preview ? (
                <Button size="sm" variant="secondary" onClick={open(run.id, "preview")}>
                  Preview
                </Button>
              ) : null}
              {run.has.overlay ? (
                <Button size="sm" variant="secondary" onClick={open(run.id, "overlay")}>
                  Overlay
                </Button>
              ) : null}
              {run.has.cutSvg ? (
                <Button size="sm" variant="secondary" onClick={open(run.id, "cutSvg")}>
                  Cut file
                </Button>
              ) : null}
              {onRetry ? (
                <Button size="sm" variant="ghost" onClick={() => onRetry(run)}>
                  Retry from this
                </Button>
              ) : null}
              {onPromote && run.status === "succeeded" && !run.isActive ? (
                <Button size="sm" variant="primary" onClick={() => onPromote(run)}>
                  Accept &amp; render
                </Button>
              ) : null}
            </Row>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
