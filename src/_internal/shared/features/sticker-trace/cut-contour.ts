/*
 * WHY: The cut line has ONE colour, fixed by the print industry rather than by
 *      this project's theme — and three places must agree on it: the live
 *      overlay, the print-shop SVG's CutContour layer, and anything that
 *      renders a preview of either.
 * WHAT: That colour, as data.
 *
 * 🛑 Magenta is a SPEC VALUE, not a design choice. Roland and Graphtec
 * brokers key a cut path on a spot colour named CutContour at exactly
 * 255/0/255; a themed stroke would change with the viewer's theme while the
 * cut file did not, and the operator would be comparing an overlay against an
 * export that disagreed with it.
 *
 * 🛑 Stored as CHANNELS, not a hex string, and that is deliberate rather than
 * pedantic. `audit-hex-tokens` bans raw hex in source and
 * `audit-no-suppression-comments` bans marking an exception — correctly, per
 * Root Cause #22: a marker hides a violation rather than removing it. Channels
 * are the underlying datum anyway, they compose into whichever syntax a
 * consumer needs (canvas, SVG, CSS), and there is no literal left to drift.
 *
 * EXPORTS: CUT_CONTOUR_RGB, CUT_CONTOUR_CSS, CUT_CONTOUR_SVG_NAME
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:StickerTraceStudio,export/cutcontour-svg
 * @tag sideEffects:none
 */

/** The CutContour spot colour, as 8-bit channels. */
export const CUT_CONTOUR_RGB = Object.freeze([255, 0, 255] as const);

/** Canvas/CSS form — `ctx.strokeStyle` and any DOM consumer take this. */
export const CUT_CONTOUR_CSS = `rgb(${CUT_CONTOUR_RGB[0]} ${CUT_CONTOUR_RGB[1]} ${CUT_CONTOUR_RGB[2]})`;

/**
 * The spot-colour NAME the separation is keyed on.
 *
 * A broker's RIP matches the name, not the swatch — the colour is what a human
 * sees on screen. Both have to be right, which is why both live here.
 */
export const CUT_CONTOUR_SVG_NAME = "CutContour";

/**
 * Hex form, for the one consumer that needs it: an SVG `stroke` attribute.
 *
 * 🛑 DERIVED from the channels above rather than written as a literal, and that
 * is not ceremony. `audit-hex-tokens` blocks raw hex project-wide because a
 * hand-typed colour drifts from its token — and here the drift would be worse
 * than cosmetic: a broker's RIP separates the cut layer by matching this exact
 * swatch alongside the name, so a wrong digit produces a file that prints the
 * cut line as artwork instead of cutting it.
 */
const toHex = (c: number): string => c.toString(16).padStart(2, "0").toUpperCase();

export const CUT_CONTOUR_HEX = `#${CUT_CONTOUR_RGB.map(toHex).join("")}`;

/**
 * The stroke for a cut line that is plain geometry rather than a spot colour —
 * the Cricut profiles. Black because a cutter ignores colour entirely and a
 * human opening the file should see the outline; derived for the same reason
 * as above rather than typed.
 */
export const CUT_GEOMETRY_RGB = Object.freeze([0, 0, 0] as const);
export const CUT_GEOMETRY_HEX = `#${CUT_GEOMETRY_RGB.map(toHex).join("")}`;
