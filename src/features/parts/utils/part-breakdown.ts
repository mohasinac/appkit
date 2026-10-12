/**
 * D12 — the `{{partBreakdown}}` description slot.
 *
 * A listing filed under a named-model leaf can state what the bey is made of,
 * from the same `modelComposition` the model page renders. The corpus knows
 * 259 models down to the slot; before this, a seller's auto-filled description
 * could say the series and the system and not one part.
 *
 * ── 🛑 WHY A SERVER-RESOLVED SLOT AND NOT A CLIENT ONE ─────────────────────
 *
 * Every other `{{slot}}` is resolved by the seller form from the draft it is
 * already holding — title, brand, condition, the category path. A part
 * breakdown is a Firestore read, so the form cannot compute it, and asking the
 * form to fetch it would be a second request per category change on a surface
 * that already makes one. It rides the template endpoint's existing response.
 *
 * ── 🛑 ABSENCE REMOVES THE LINE, IT DOES NOT EMPTY IT ──────────────────────
 *
 * 49 of 259 compositions did not join to a category, and most of the
 * catalogue is not a Beyblade at all. `interpolate` resolves an unfilled slot
 * to an empty string, so a body carrying `<li><strong>Parts:</strong>
 * {{partBreakdown}}</li>` would render an **empty bullet** on every listing
 * without a composition — a visible artifact that reads as broken data.
 *
 * So the endpoint strips the whole line instead. That is why the strip is
 * LINE-based rather than element-based: the seeded bodies are template
 * literals with exactly one `<li>` or `<p>` per source line, which makes
 * "the line containing the slot" an exact, predictable unit. A body that put
 * two elements on one line would lose both — stated here rather than guarded
 * against, because the guard would be a second HTML parser.
 */
import { PART_SLOT_LABEL, type ModelCompositionDocument, type PartGlossaryDocument } from "../schemas/firestore";

/** The slot name, in ONE place — the endpoint, the formatter and the seeded bodies all key on it. */
export const PART_BREAKDOWN_SLOT = "partBreakdown";

/**
 * `Attack Ring — Metal Attack Ring (19 g) · Weight Disk — CWD Chain Attacker`
 *
 * 🛑 ONE LINE, not a `<ul>`. A slot that emits markup breaks the moment a
 * template author drops it mid-sentence, and a second HTML-shaped slot beside
 * a plain one is two things that must agree about the same data. One
 * composable value, usable anywhere.
 *
 * Returns `""` when there is nothing to say, which is the signal the caller
 * uses to strip the line.
 */
export function formatPartBreakdown(
  compositions: readonly ModelCompositionDocument[],
  parts?: Map<string, PartGlossaryDocument>,
): string {
  // The first composition only. A remake shares a model's name and not its
  // parts, so concatenating two would describe a bey that does not exist.
  const comp = compositions[0];
  const slots = comp?.slots ?? [];
  if (slots.length === 0) return "";

  const pieces = slots
    .map((s) => {
      const label = PART_SLOT_LABEL[s.slotKey] ?? s.slotKey;
      const name = (s.partName ?? "").trim();
      if (!name) return null;
      const weight = s.weightG ?? (s.partId ? parts?.get(s.partId)?.weightG : undefined);
      return `${label} — ${name}${typeof weight === "number" ? ` (${weight} g)` : ""}`;
    })
    .filter((p): p is string => p !== null);

  return pieces.join(" · ");
}

/**
 * Remove the source line that carries `{{slot}}`.
 *
 * Used when the slot has no value, so the body arrives without the line rather
 * than with an empty one. See the header for why this is line-based.
 */
export function stripSlotLine(body: string, slot: string): string {
  const needle = `{{${slot}}}`;
  return body
    .split("\n")
    .filter((line) => !line.includes(needle))
    .join("\n");
}
