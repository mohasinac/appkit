"use client";

/**
 * Prints box labels and box contents sheets.
 *
 * Two outputs with deliberately different shapes, because they answer
 * different questions at different distances:
 *
 *   LABEL     stuck to the box. `BOX-AC60-03` as a scannable symbol, the code
 *             large enough to read across a room, and a total with a date.
 *   CONTENTS  A4, goes inside the box or on the shelf beside it. Lists every
 *             product. A 50 x 25 mm label cannot hold eight product names, so
 *             the label carries a total and this carries the detail.
 *
 * 🛑 BOTH ARE DATED SNAPSHOTS, AND BOTH SAY SO. A printed count is wrong the
 * moment something is picked. Printing "8 items" bare invites the operator to
 * trust it over the screen; printing "8 items as of 21 Oct" says what it is.
 */

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Div,
  Heading,
  Row,
  Stack,
  Text,
} from "../../../ui/index";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import {
  BoxContentsSheet,
  BoxLabel,
  LabelPageStyle,
  LabelSheet,
  PrintScaleWarning,
  type BoxContentsRow,
} from "./labels";
import { LabelProfilePicker } from "./LabelProfilePicker";
import {
  LABEL_PROFILES,
  documentPageCss,
  labelPageCss,
  type LabelProfileId,
} from "../../../_internal/shared/features/print/label-profiles";

export interface PrintableBox {
  id: string;
  code: string;
  boxType: string;
  location?: string | null;
  distinctProducts?: number | null;
  totalUnits?: number | null;
  countedAt?: string | null;
  /** Present only when the caller loaded placements for this box. */
  contents?: BoxContentsRow[];
}

export interface BoxLabelPrintViewProps {
  boxes: PrintableBox[];
  /**
   * 🛑 Passed in rather than read from `Date.now()` here. A render-time clock
   * makes the printed date differ between the server render and the client
   * hydration, which React reports as a hydration mismatch — and more
   * practically it means the date on the paper is "whenever this component
   * last rendered", which is not a fact about anything.
   */
  printedAt: string;
  boxesFailed?: boolean;
}

export function BoxLabelPrintView({
  boxes,
  printedAt,
  boxesFailed = false,
}: BoxLabelPrintViewProps) {
  const [mode, setMode] = useState<"labels" | "contents">("labels");
  /*
   * 100 x 50 mm by default, not the 50 x 25 used for products. A box label is
   * read from across a room and carries a code, a type, a location and a
   * count — four lines plus a symbol does not fit on a product label, and the
   * fit check would (correctly) refuse the barcode on 38 mm stock.
   */
  const [profileId, setProfileId] = useState<LabelProfileId>("thermal-100x50");
  const profile = LABEL_PROFILES[profileId];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const chosen = useMemo(
    () => boxes.filter((b) => selected.has(b.id)),
    [boxes, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /*
   * `BOX-` + the code. The longest one in the selection drives the fit report,
   * so the warning is about the worst label in the batch rather than the first.
   */
  const longestCodeLength = useMemo(
    () => chosen.reduce((n, b) => Math.max(n, b.code.length + 4), 0),
    [chosen],
  );

  return (
    <Stack gap="md" padding="md">
      {/*
        One `@page` owner, switched by mode — the rule is document-global, so
        two emitters would silently fight and the later one would win. Labels
        want the label as the page; a contents sheet wants A4.
      */}
      <LabelPageStyle
        css={mode === "labels" ? labelPageCss(profile) : documentPageCss()}
      />

      <Stack className="no-print" gap="sm">
        <Heading level={1} size="2xl">
          Print box labels
        </Heading>

        {boxesFailed && (
          <Alert variant="warning">
            Could not load the box list. It is unknown, not empty — reload
            before printing, or you will print a subset without knowing it.
          </Alert>
        )}

        <Row gap="xs">
          <Button
            variant={mode === "labels" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("labels")}
          >
            Box labels
          </Button>
          <Button
            variant={mode === "contents" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("contents")}
          >
            Contents sheets (A4)
          </Button>
        </Row>

        {mode === "labels" && (
          <>
            <LabelProfilePicker
              value={profileId}
              onChange={setProfileId}
              longestCodeLength={longestCodeLength}
            />
            <PrintScaleWarning />
          </>
        )}

        {boxes.length === 0 ? (
          <Text color="muted">
            No boxes registered yet. A box exists here because someone
            labelled a real one, so an empty list on a fresh install is
            correct.
          </Text>
        ) : (
          <Stack gap="xs">
            {boxes.map((b) => (
              <FieldCheckbox
                key={b.id}
                name={`box-${b.id}`}
                label={`${b.code}${b.location ? ` — ${b.location}` : ""}`}
                checked={selected.has(b.id)}
                onChange={() => toggle(b.id)}
              />
            ))}
          </Stack>
        )}

        <Row gap="sm" align="center" wrap>
          <Button
            disabled={chosen.length === 0}
            onClick={() => window.print()}
          >
            Print {chosen.length > 0 ? `${chosen.length} selected` : "selected"}
          </Button>
          {boxes.length > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setSelected(
                  selected.size === boxes.length
                    ? new Set()
                    : new Set(boxes.map((b) => b.id)),
                )
              }
            >
              {selected.size === boxes.length ? "Clear all" : "Select all"}
            </Button>
          )}
        </Row>

        {mode === "contents" && chosen.some((b) => !b.contents) && (
          /*
           * 🛑 Says WHICH sheets will be blank rather than printing a blank
           * one. A contents sheet for a box whose placements were never loaded
           * prints "This box is empty" — about a box that may hold eight
           * things. That is the worst claim this feature can make, and it is
           * indistinguishable from a genuinely empty box on paper.
           */
          <Alert variant="warning">
            Contents were not loaded for{" "}
            {chosen
              .filter((b) => !b.contents)
              .map((b) => b.code)
              .join(", ")}
            . Those sheets would print as empty, which is not the same as the
            box being empty — open each box&apos;s page to load its contents
            first.
          </Alert>
        )}
      </Stack>

      {mode === "labels" ? (
        <LabelSheet profile={profile}>
          {chosen.map((b) => (
            <BoxLabel key={b.id} profile={profile} box={b} />
          ))}
        </LabelSheet>
      ) : (
        <Div>
          {chosen
            .filter((b) => b.contents)
            .map((b) => (
              <BoxContentsSheet
                key={b.id}
                boxCode={b.code}
                boxType={b.boxType}
                location={b.location}
                rows={b.contents ?? []}
                printedAt={printedAt}
              />
            ))}
        </Div>
      )}
    </Stack>
  );
}
