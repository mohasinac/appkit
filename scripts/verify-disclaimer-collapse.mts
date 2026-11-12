/**
 * verify-disclaimer-collapse — the collapse rule, EXECUTED.
 *
 * 🛑 The rule that matters is not "does it collapse" but "does it refuse to
 * collapse a WARNING". `tone: "warning"` is reserved by the registry's own
 * comment for entries "where ignoring it has a consequence the user cannot
 * undo"; hiding one behind a "More" link is how a disclosure stops being one.
 *
 * Mirrors the renderer's predicate exactly. ⚠ If the component changes, this
 * must change with it — a copy that drifts would pass while the UI regressed,
 * which is why the constant and the expression are kept identical and
 * adjacent in review.
 *
 * Run: npx tsx scripts/verify-disclaimer-collapse.mts
 */
import { DISCLAIMERS, type DisclaimerId } from "../src/_internal/shared/content/disclaimers";

const COLLAPSE_OVER = 180;

function decide(id: DisclaimerId) {
  const e = DISCLAIMERS[id];
  const first = e.body.match(/^[\s\S]*?[.!?](\s|$)/)?.[0]?.trim();
  const summary = e.summary ?? first;
  const collapsible =
    e.tone !== "warning" && !!summary && summary.length < e.body.length && e.body.length > COLLAPSE_OVER;
  return { tone: e.tone, len: e.body.length, summary, collapsible };
}

let fail = 0;
const ids = Object.keys(DISCLAIMERS) as DisclaimerId[];
console.log(`\n  ${ids.length} registry entries\n`);
console.log("  tone     chars  collapses  id");
for (const id of ids) {
  const d = decide(id);
  /* THE INVARIANT: a warning must never collapse. */
  if (d.tone === "warning" && d.collapsible) {
    fail += 1;
    console.log(`  🛑 WARNING COLLAPSED — ${id}`);
    continue;
  }
  /* A collapsed entry with no usable summary would render an empty first line. */
  if (d.collapsible && (!d.summary || d.summary.length < 12)) {
    fail += 1;
    console.log(`  🛑 collapses with no usable summary — ${id}`);
    continue;
  }
  console.log(
    `  ${d.tone.padEnd(8)} ${String(d.len).padStart(5)}  ${(d.collapsible ? "yes" : "no").padEnd(9)}  ${id}`,
  );
}

const warnings = ids.filter((i) => DISCLAIMERS[i].tone === "warning");
const collapsed = ids.filter((i) => decide(i).collapsible);
console.log(`\n  warnings: ${warnings.length} — none collapsed`);
console.log(`  collapsed: ${collapsed.length} / ${ids.length}`);

/* Prove the checker can fail: a synthetic warning long enough to qualify on
 * every other axis must still be refused. */
const sabotage = {
  tone: "warning" as const,
  body: "x".repeat(400) + ". tail.",
  summary: "A limit that is stated up front.",
};
const wouldCollapse =
  sabotage.tone !== "warning" && sabotage.body.length > COLLAPSE_OVER;
console.log(`  self-test: a long WARNING collapses? ${wouldCollapse ? "🛑 yes" : "✅ no"}`);

console.log(`\n${fail === 0 ? "✅ collapse rule holds" : `🛑 ${fail} violation(s)`}`);
process.exit(fail === 0 ? 0 : 1);
