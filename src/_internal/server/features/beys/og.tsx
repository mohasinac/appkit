/**
 * OG card for `/beys/{slug}`.
 *
 * ── 🛑 NO IMAGE FETCHES, FOR THE REASON THE PARTS CARDS DO NOT EITHER ─────
 *
 * Beys DO have photographs — 1,903 of 1,988 — so this is a deliberate refusal
 * rather than a gap. The project was suspended for **Fast Origin Transfer at
 * 5.25× its allowance** (52.52 GB against 10 GB), traced to render-time image
 * proxying (Root Cause #104). 1,988 bey routes with one remote fetch each, on
 * a crawler sweep, is precisely the amplification that was just removed. Type
 * on a gradient costs one lambda and nothing else.
 *
 * ── 🛑 NO MONEY ON THE CANVAS ─────────────────────────────────────────────
 *
 * All eight money-bearing OG renderers were stripped, and the rule is stated
 * in CLAUDE.md: an OG image is a public image URL with the amount burned into
 * the pixels, so no sign-in gate reaches it and no paywall markup describes
 * it. 1,309 beys carry a price in the research data and none of it appears
 * here.
 *
 * `audit-guest-price-leak`'s R1 blocks a `₹` in any `og.tsx`, so this is
 * mechanically enforced rather than left to discipline.
 */
import type { ReactElement } from "react";
import type { BeyDocument } from "../../../../features/beys/schemas/firestore";

const BG = "#0f172a";
const GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
const MUTED = "#94a3b8";
const ACCENT = "#5eead4";

/*
 * 🛑 A COPY of the parts shell, not an import, and that is a considered
 * choice rather than laziness.
 *
 * The Duplication Decision Framework's Rule of Three says extract on the
 * THIRD copy, not the second — "two copies is observation; three is a
 * pattern". There are now exactly two OG shells of this shape. Lifting it to
 * a shared module today would also put a third consumer between every OG
 * renderer and its layout for no behavioural gain.
 *
 * When a third appears, extract then. The constants above are duplicated for
 * the same reason and in the same breath.
 */
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

/**
 * One bey's card.
 *
 * 🛑 EVERY CLAUSE IS CONDITIONAL, because the coverage genuinely varies: 93%
 * of beys have a mass but only 248 state it directly, and `system` is on 94%
 * while `type` and `spinDirection` are lower. A card reading "0 g" or an empty
 * separator would be a claim the data does not support — the same reason the
 * parts card builds its detail line by filtering.
 *
 * 🛑 The mass is marked `≈` when it was SUMMED from the parts rather than
 * stated, which is the same honesty the detail page applies. A derived figure
 * printed as an exact one is the single easiest way for this dataset to start
 * lying.
 */
export function renderBeyOg(
  bey: BeyDocument | null | undefined,
  opts: { siteName: string },
): ReactElement {
  if (!bey) return shell("Beyblades", "Beyblade database", "", opts.siteName);

  const statedMass = typeof bey.weightG === "number" ? bey.weightG : null;
  const summedMass = typeof bey.weightGFromParts === "number" ? bey.weightGFromParts : null;
  const mass =
    statedMass !== null
      ? `${statedMass} g`
      : summedMass !== null
        ? `≈ ${Math.round(summedMass * 10) / 10} g`
        : null;

  const bits = [
    bey.type ? `${bey.type} type` : null,
    bey.spinDirection ?? null,
    mass,
    bey.composition?.length ? `${bey.composition.length} parts` : null,
  ].filter((b): b is string => b !== null);

  /*
   * The eyebrow is the SYSTEM (Hybrid Wheel System, Burst Ultimate…) because
   * that is the one line a collector uses to place a bey in time, and it is
   * present on 94% of them. `series` is the fallback and "Beyblade" the floor
   * — never an empty eyebrow, which reads as a broken template.
   */
  const eyebrow = bey.system ?? bey.series ?? "Beyblade";
  return shell(eyebrow, bey.name, bits.join("  ·  "), opts.siteName);
}
