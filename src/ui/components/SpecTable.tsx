/**
 * A labelled key/value specification table.
 *
 * ── 🛑 WHY THIS EXISTS: EIGHT BYTE-IDENTICAL COPIES ────────────────────────
 *
 * This exact `Dl` / `Row` / `Dt` / `Dd` composition was pasted at eight call
 * sites — `ProductDetailPageView`, `AuctionDetailPageView`,
 * `ClassifiedDetailPageView`, `DigitalCodeDetailPageView`,
 * `LiveItemDetailPageView`, `PreOrderDetailPageView`, `BrandDetailPageView`
 * and `CustomSectionTabContent` — with the same variants and the same
 * `w-36 flex-shrink-0` label column in every one. The Duplication Decision
 * Framework's Rule of Three was overshot nearly 3×, every copy accepts the
 * same `{name, value, unit?}` row shape, and a styling fix had to be made
 * eight times.
 *
 * ── 🛑 IT RENDERS NOTHING FOR AN EMPTY LIST, DELIBERATELY ──────────────────
 *
 * `bit-chip` and `face-bolt` parts have no specifications in any source we
 * hold — 0 of 66 and 0 of 42, measured, and that is a fact about the sources
 * rather than missing data. A table of em-dashes would claim we looked each
 * value up and found none. The caller still decides whether to render a
 * heading; this only guarantees the table itself is absent rather than empty.
 *
 * ── 🛑 `w-36` IS KEPT, NOT CONVERTED TO A VARIANT ──────────────────────────
 *
 * It is a fixed label-column width shared by all eight original call sites, so
 * it belongs INSIDE the primitive — which is exactly where `audit-variant-ok`
 * permits a raw utility. Converting it to a prop would re-open the question at
 * every call site for no behaviour.
 *
 * @tag domain:ui
 * @tag layer:primitive
 * @tag pattern:none
 * @tag access:server
 */
import React from "react";

import { Dl, Dt, Dd } from "./Semantic";
import { Row } from "./Layout";

export interface SpecTableRow {
  /** The label. "Weight", "Material", "Released (JP)". */
  name: string;
  /** The value, already formatted. */
  value: string;
  /** Appended after a space when present. "g", "mm". */
  unit?: string;
  /**
   * Marks the value as approximate, rendered as a leading `≈`.
   *
   * 🛑 A per-row CONFIDENCE BADGE was the first design and is wrong: in a
   * ten-row table it is noise that crowds out the values themselves. One
   * glyph on the value plus a single footnote under the table says the same
   * thing and stays readable — the caller owns the footnote.
   */
  approximate?: boolean;
}

export interface SpecTableProps {
  rows: readonly SpecTableRow[];
  className?: string;
}

export function SpecTable({ rows, className }: SpecTableProps) {
  if (!rows.length) return null;
  return (
    <Dl
      divide="subtle"
      rounded="xl"
      border="subtle"
      className={`overflow-hidden${className ? ` ${className}` : ""}`}
    >
      {rows.map((s, i) => (
        <Row gap="md" oddEven="zebra" key={`${s.name}-${i}`} surface="default" padding="inline">
          <Dt className="w-36 flex-shrink-0" color="primary" weight="medium">
            {s.name}
          </Dt>
          <Dd className="flex-1" color="muted">
            {s.approximate ? "≈ " : ""}
            {s.value}
            {s.unit ? ` ${s.unit}` : ""}
          </Dd>
        </Row>
      ))}
    </Dl>
  );
}
