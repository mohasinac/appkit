"use client";

/**
 * Physical labels — the ones that get stuck to things.
 *
 * 🛑 EVERYTHING HERE IS SIZED IN MILLIMETRES, because the output is a physical
 * object. `PrintCenterView` sized its labels `w-[200px]` and emitted no `@page`
 * rule at all, so a thermal printer received the browser's default A4 with a
 * 200-pixel card in the corner of it. Nothing errored; the operator found out
 * by holding a mostly-blank 50 x 25 mm label.
 *
 * ── THE TWO UNIT CONVERSIONS THAT MATTER ────────────────────────────────────
 *
 * 1. CSS defines 96 px per inch, EXACTLY, regardless of screen DPI. At print
 *    time the browser maps that to physical length, so a CSS px is 25.4/96 =
 *    0.2646 mm of paper. That is the only bridge between a layout and a ruler.
 *
 * 2. `JsBarcode`'s `width` option is PIXELS PER MODULE, not millimetres. The
 *    previous code passed `width: 2`, i.e. a 0.53 mm module — twice the density
 *    needed, which is why those barcodes were enormous. `moduleWidthPx()`
 *    converts a target mm module into that option so the intent is stated once.
 *
 * 🛑 AND THE WHOLE CHAIN IS DEFEATED BY THE PRINT DIALOG. "Fit to page" or any
 * scale other than 100% rescales the symbol, taking the module width with it —
 * silently, and the label still looks correct. Every printable view here says
 * so on screen, because it is the one failure no code can prevent.
 *
 * ── WHY THIS FILE USES `style={{}}` FOR DIMENSIONS ──────────────────────────
 *
 * Normally a variant or a token; here the numbers come from the PROFILE at
 * runtime, so `w-[${profile.widthMm}mm]` is a class Tailwind's build-time
 * scanner never sees and therefore never generates — it would silently emit
 * nothing and every label would collapse to its content size. These are the
 * "dynamic values impossible with classes" case the inline-style rule exists
 * to permit, and none of them is a COLOUR: every `style` here is a length or a
 * position. Colour, surface and type still go through the primitives.
 */

import { useEffect, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";
import {
  MM_PER_INCH,
  SAFE_MODULE_MM,
  labelFitsProfile,
  sheetPositionMm,
  type LabelProfile,
} from "../../../_internal/shared/features/print/label-profiles";

/** CSS px per inch is 96 by definition — not a screen measurement. */
const CSS_PX_PER_INCH = 96;

/** Millimetres of paper to CSS pixels. The only unit bridge in this file. */
export function mmToCssPx(mm: number): number {
  return (mm / MM_PER_INCH) * CSS_PX_PER_INCH;
}

/**
 * A target module width in mm, as JsBarcode's `width` option.
 *
 * Not rounded to an integer: JsBarcode accepts a fractional module width and
 * rounding to 1 px would quantise every density to 0.265 mm steps — which on a
 * 50 x 25 mm label is the difference between fitting and not.
 */
export function moduleWidthPx(moduleMm: number = SAFE_MODULE_MM): number {
  return mmToCssPx(moduleMm);
}

/**
 * Renders a CODE128 symbol at a known physical density.
 *
 * 🛑 THE QUIET ZONE IS COMPUTED, NOT GUESSED. CODE128 requires 10 modules of
 * clear space each side, and JsBarcode's `margin` is in pixels — so it must
 * scale with the module. The previous code passed a FIXED `margin: 8` beside
 * `width: 2`, which is 4 modules: under half the spec minimum. A short quiet
 * zone does not look wrong and does not fail to render; it just makes some
 * scanners refuse some reads, which is indistinguishable from a worn label.
 */
function Barcode({
  value,
  moduleMm = SAFE_MODULE_MM,
  heightMm,
  showValue = true,
}: {
  value: string;
  moduleMm?: number;
  heightMm: number;
  showValue?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    const px = moduleWidthPx(moduleMm);
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width: px,
        height: mmToCssPx(heightMm),
        displayValue: showValue,
        // ~2 mm of type: readable by a human squinting, and small enough that
        // it does not steal height from the bars on a 25 mm label.
        fontSize: mmToCssPx(2),
        textMargin: mmToCssPx(0.4),
        margin: 10 * px,
      });
    } catch (_err) {
      /*
       * JsBarcode throws on a value CODE128 cannot encode. The `<svg>` is left
       * empty and the label still prints its text, which is the right
       * degradation: a label with a title and no barcode is filable by hand,
       * and the only real fix is correcting the code on the record.
       */
      void normalizeError(_err);
    }
  }, [value, moduleMm, heightMm, showValue]);

  return <svg ref={ref} aria-label={`Barcode ${value}`} />;
}

/**
 * The single `@page` owner for a printable view.
 *
 * 🛑 EXACTLY ONE OF THESE PER VIEW. `@page` is document-global and cannot be
 * scoped — two of them does not give two geometries, the later one in document
 * order silently wins and the label prints at the wrong size with nothing in
 * the markup looking wrong. `audit-label-profiles` R3 enforces that only
 * `label-profiles.ts` may author the rule at all.
 */
export function LabelPageStyle({ css }: { css: string }) {
  return <style>{css}</style>;
}

/** One label's box, in mm, with the profile's padding inside it. */
function LabelBox({
  profile,
  children,
}: {
  profile: LabelProfile;
  children: React.ReactNode;
}) {
  return (
    <Div
      className="appkit-label"
      style={{
        width: `${profile.widthMm}mm`,
        height: `${profile.heightMm}mm`,
        padding: `${profile.paddingMm}mm`,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {children}
    </Div>
  );
}

export interface ProductLabelData {
  barcodeId?: string | null;
  sku?: string | null;
  name: string;
  price?: number | null;
  /** 🛑 Which box it lives in — see the component note. */
  boxCode?: string | null;
}

/**
 * A product label: symbol, name, price, and WHERE IT LIVES.
 *
 * 🛑 THE BOX CODE IS THE ADDITION THAT MAKES THE LABEL USEFUL FOR PUTTING
 * THINGS AWAY. Without it a picker holding the item has to scan it and look at
 * a screen to learn which shelf it came off; with it the label answers the
 * question the person holding it is actually asking. It replaces the free-text
 * `physicalLocation` that used to print here — that field was three
 * inconsistent inputs with no registry behind it, so two people wrote "shelf
 * 3", "Shelf-3" and "AC60 3" for one place and no list could group them.
 */
export function ProductLabel({
  profile,
  product,
}: {
  profile: LabelProfile;
  product: ProductLabelData;
}) {
  const code = product.barcodeId ?? product.sku ?? null;

  /*
   * The fit is checked PER LABEL, against the code this label actually
   * carries — not once for the profile. Codes vary in length (a seller-authored
   * SKU is variable width by design), so one product can fit stock that the
   * next cannot.
   */
  const fit = useMemo(
    () => (code ? labelFitsProfile(profile, code.length) : null),
    [profile, code],
  );

  /*
   * 🛑 REFUSES, NEVER SCALES. A symbol squeezed to fit looks perfect and does
   * not scan — the proportions stay right while the module width drops below
   * what a scanner resolves, so the failure surfaces weeks later as "the
   * scanner is broken" with every label already stuck to something. A visible
   * refusal is read in the second it happens, by the person who can still pick
   * different stock.
   */
  const refuse = fit !== null && !fit.fits;

  return (
    <LabelBox profile={profile}>
      {code && !refuse ? (
        <Barcode
          value={code}
          // A third of the label's height, which leaves room for the name and
          // price without the bars becoming too short to scan at an angle.
          heightMm={Math.max(6, profile.heightMm * 0.42)}
        />
      ) : code ? (
        <Text size="xs" color="error">
          Code too long for {profile.widthMm}×{profile.heightMm} mm
        </Text>
      ) : (
        <Text size="xs" color="muted">
          No barcode
        </Text>
      )}
      <Text size="xs" weight="medium" truncate={1}>
        {product.name}
      </Text>
      <Row gap="xs" justify="center" wrap>
        {product.price != null && (
          <Text size="xs" color="muted">
            ₹{product.price.toLocaleString("en-IN")}
          </Text>
        )}
        {product.boxCode && (
          <Text size="xs" weight="semibold">
            {product.boxCode}
          </Text>
        )}
      </Row>
    </LabelBox>
  );
}

export interface BoxLabelData {
  code: string;
  boxType: string;
  location?: string | null;
  distinctProducts?: number | null;
  totalUnits?: number | null;
  /** When the rollup was computed — see the staleness note. */
  countedAt?: string | null;
}

/**
 * A box label: the code, large, plus what it held WHEN PRINTED.
 *
 * 🛑 THE PRINT DATE IS NOT DECORATION — it is what makes the counts honest. A
 * label is a frozen snapshot stuck to a moving object: the moment something is
 * picked, the printed count is wrong. Printing "8 items" with no date invites
 * the operator to trust it; printing "8 items as of 21 Oct" says plainly that
 * it is a note from the past and the screen is authoritative.
 *
 * 🛑 The barcode encodes `BOX-{code}`, with the prefix, because the receive
 * station discriminates on it: a `BOX-` scan arms a box and a `LIR-` scan adds
 * an item, and that decision has to be makeable without a lookup. The stored
 * `code` is the bare `AC60-03`.
 */
export function BoxLabel({
  profile,
  box,
}: {
  profile: LabelProfile;
  box: BoxLabelData;
}) {
  const value = `BOX-${box.code.toUpperCase()}`;
  const fit = labelFitsProfile(profile, value.length);

  return (
    <LabelBox profile={profile}>
      {fit.fits ? (
        <Barcode value={value} heightMm={Math.max(8, profile.heightMm * 0.4)} />
      ) : (
        <Text size="xs" color="error">
          {value} too long for this stock
        </Text>
      )}
      <Text size="lg" weight="bold" numeric>
        {box.code}
      </Text>
      <Text size="xs" color="muted">
        {[box.boxType, box.location].filter(Boolean).join(" · ")}
      </Text>
      {box.totalUnits != null ? (
        <Text size="xs" color="muted">
          {box.distinctProducts ?? 0} product
          {box.distinctProducts === 1 ? "" : "s"} · {box.totalUnits} unit
          {box.totalUnits === 1 ? "" : "s"}
          {box.countedAt
            ? ` as of ${new Date(box.countedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}`
            : ""}
        </Text>
      ) : (
        /*
         * "Not yet counted" rather than "0 products". The rollup is written by
         * a scheduled job, so a box registered this morning has no counts —
         * and a printed `0` about a full box is worse than no number at all.
         */
        <Text size="xs" color="muted">
          Not yet counted
        </Text>
      )}
    </LabelBox>
  );
}

/**
 * Lays labels out on an A4 die-cut sheet, at the stock's real pitch.
 *
 * 🛑 ABSOLUTE POSITIONING FROM THE PITCH, not a flex grid. A grid distributes
 * whatever space it is given; a die-cut sheet has fixed holes, and the only
 * thing that lands ink inside them is placing each label at
 * `margin + n x pitch`. One millimetre of accumulated flex rounding is
 * invisible on label one and off the die-cut by label thirteen.
 */
export function LabelSheet({
  profile,
  children,
}: {
  profile: LabelProfile;
  children: React.ReactNode[];
}) {
  const sheet = profile.sheet;
  if (!sheet) {
    // Thermal: the page IS the label, so each child is its own page and the
    // `@page` rule plus `break-after` handles it. No positioning to do.
    return <>{children}</>;
  }

  const perPage = sheet.columns * sheet.rows;
  const pages: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += perPage) {
    pages.push(children.slice(i, i + perPage));
  }

  return (
    <>
      {pages.map((page, pageIndex) => (
        <Div
          key={pageIndex}
          className="appkit-label-sheet"
          style={{
            position: "relative",
            width: `${profile.page.widthMm}mm`,
            height: `${profile.page.heightMm}mm`,
            // A sheet past the first must start on a new page; the first must
            // NOT, or every print begins with a blank sheet.
            breakBefore: pageIndex === 0 ? "auto" : "page",
          }}
        >
          {page.map((child, i) => {
            const pos = sheetPositionMm(sheet, i);
            if (!pos) return null;
            return (
              <Div
                key={i}
                style={{
                  position: "absolute",
                  left: `${pos.leftMm}mm`,
                  top: `${pos.topMm}mm`,
                }}
              >
                {child}
              </Div>
            );
          })}
        </Div>
      ))}
    </>
  );
}

export interface BoxContentsRow {
  productTitle: string;
  productSku?: string | null;
  quantity: number;
  slot?: string | null;
}

/**
 * An A4 sheet listing what is in a box — the thing that goes INSIDE it, or on
 * the shelf beside it.
 *
 * 🛑 A4, not a label, and that is the point of having it at all. A 50 x 25 mm
 * label cannot list eight products, so the box label carries only a total; the
 * contents have to live somewhere a person can read them without a screen, and
 * that is a sheet of paper. It is explicitly a snapshot, dated in the header
 * for the same reason the box label's counts are.
 */
export function BoxContentsSheet({
  boxCode,
  boxType,
  location,
  rows,
  printedAt,
}: {
  boxCode: string;
  boxType: string;
  location?: string | null;
  rows: BoxContentsRow[];
  printedAt: string;
}) {
  const totalUnits = rows.reduce((n, r) => n + r.quantity, 0);

  return (
    <Div
      className="appkit-label-sheet"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm",
        boxSizing: "border-box",
      }}
    >
      <Stack gap="sm">
        <Row justify="between" align="center">
          <Text size="2xl" weight="bold" numeric>
            {boxCode}
          </Text>
          <Text size="sm" color="muted">
            {[boxType, location].filter(Boolean).join(" · ")}
          </Text>
        </Row>
        {/*
          The date is in the HEADER, beside the box code, not in a footer.
          A contents sheet outlives its accuracy and is read by someone
          standing at a shelf — the first thing they need to know is how old
          it is, and a footer on page two is not where they will look.
        */}
        <Text size="sm" color="muted">
          {rows.length} product{rows.length === 1 ? "" : "s"} · {totalUnits}{" "}
          unit{totalUnits === 1 ? "" : "s"} · printed{" "}
          {new Date(printedAt).toLocaleString("en-IN")}
        </Text>
        <Text size="xs" color="muted">
          A snapshot. The dashboard is authoritative — anything picked since
          this was printed is still listed here.
        </Text>

        <Div style={{ marginTop: "6mm" }}>
          {rows.length === 0 ? (
            <Text color="muted">This box is empty.</Text>
          ) : (
            <Stack gap="none">
              {rows.map((r, i) => (
                <Row
                  key={`${r.productTitle}-${i}`}
                  justify="between"
                  align="center"
                  padding="y-2xs"
                  border="bottom"
                >
                  <Stack gap="none">
                    <Text size="sm">{r.productTitle}</Text>
                    {(r.productSku || r.slot) && (
                      <Text size="xs" color="muted" numeric>
                        {[r.productSku, r.slot].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </Stack>
                  <Text size="sm" weight="semibold" numeric>
                    ×{r.quantity}
                  </Text>
                </Row>
              ))}
            </Stack>
          )}
        </Div>
      </Stack>
    </Div>
  );
}

/**
 * The on-screen warning that no code can replace.
 *
 * Every density calculation in this file assumes the browser prints at 100%.
 * "Fit to page" rescales the symbol and takes the module width with it, and
 * the result still looks like a correct label.
 */
export function PrintScaleWarning() {
  return (
    <Text size="sm" color="warning" className="no-print">
      Print at 100% / &ldquo;Actual size&rdquo;. Any scaling — including
      &ldquo;Fit to page&rdquo; — narrows the barcode below what scanners read,
      and the label will still look correct.
    </Text>
  );
}
