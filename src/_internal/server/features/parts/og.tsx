/**
 * D12 — OG cards for the part surfaces.
 *
 * ── 🛑 NO IMAGE FETCHES, DELIBERATELY ──────────────────────────────────────
 *
 * Every other OG renderer here pulls a cover image through `resolveOgImageUrl`.
 * These do not, and that is the one design decision worth stating: the project
 * was suspended for **Fast Origin Transfer at 5.25× its allowance** (52.52 GB
 * against 10 GB), traced to render-time image proxying (Root Cause #104). A
 * glossary of 753 parts across 20 classifications is 774 OG routes; one remote
 * fetch each, on a crawler sweep, is exactly the amplification that was just
 * removed. Type on a gradient costs one lambda and nothing else.
 *
 * It also costs nothing in usefulness: a part has no photograph in our data.
 * The honest card is its name, what kind of part it is, its weight and how
 * many models use it — all four of which are facts we hold.
 *
 * ── 🛑 NO MONEY ON THE CANVAS ──────────────────────────────────────────────
 *
 * All eight money-bearing OG renderers were stripped for this reason: an OG
 * image is a public image URL with the amount burned into the pixels, so no
 * sign-in gate reaches it and no paywall markup describes it. A part card
 * carries no price and never should, even though its page lists listings.
 */
import type { ReactElement } from "react";
import {
  PART_SLOT_LABEL,
  type PartGlossaryDocument,
  type PartSlot,
} from "../../../../features/parts/schemas/firestore";

const BG = "#0f172a";
const GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
const MUTED = "#94a3b8";
const ACCENT = "#5eead4";

function shell(
  eyebrow: string,
  title: string,
  detail: string,
  siteName: string,
): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: BG,
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: GRADIENT }} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: ACCENT,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: title.length > 34 ? 56 : 76,
            color: "#ffffff",
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {detail && <div style={{ fontSize: 28, color: MUTED }}>{detail}</div>}
        <div style={{ fontSize: 20, color: MUTED, marginTop: 8 }}>{siteName}</div>
      </div>
    </div>
  );
}

/** One part's card. */
export function renderPartOg(
  part: PartGlossaryDocument | null | undefined,
  usedByCount: number,
  opts: { siteName: string },
): ReactElement {
  if (!part) return shell("Parts", "Beyblade parts", "", opts.siteName);
  const classification = PART_SLOT_LABEL[part.slot] ?? part.classification ?? part.slot;
  /*
   * Only the facts we have. 23 of 753 parts carry a code and 98 carry a
   * weight, so each clause is conditional — a card reading "0 g" or an empty
   * bracket would be a claim we cannot support.
   */
  const bits = [
    part.code ? `Code ${part.code}` : null,
    typeof part.weightG === "number" ? `${part.weightG} g` : null,
    usedByCount > 0
      ? `Used by ${usedByCount} ${usedByCount === 1 ? "model" : "models"}`
      : null,
  ].filter((b): b is string => b !== null);
  return shell(classification, part.name, bits.join("  ·  "), opts.siteName);
}

/** One classification's card. */
export function renderPartClassificationOg(
  slot: PartSlot,
  count: number,
  opts: { siteName: string },
): ReactElement {
  const label = PART_SLOT_LABEL[slot] ?? slot;
  return shell(
    "Parts database",
    label,
    // `count` comes from the same bounded read the page renders, so the number
    // on the card is the number on the page. A separate count query would be a
    // second source that could disagree.
    count > 0 ? `${count} recorded` : "",
    opts.siteName,
  );
}
