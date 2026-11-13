/**
 * verify-dock-fab-appearance — the floating dock's resting button must never
 * impersonate an action it cannot take.
 *
 * 🛑 THE DEFECT THIS EXISTS FOR WAS ON THE CHECKOUT, AND WAS FOUND BY DRIVING
 * IT AS A REAL BUYER — not by review, and not by any typecheck.
 *
 * Step 1 of the shop checkout registers exactly one bottom action:
 *
 *     { id: "continue", label: "Continue", variant: "primary",
 *       disabled: !selectedAddress || addressesLoading || cartIsEmpty }
 *
 * The dock's expanded panel honoured `disabled`. The resting FAB did not — it
 * read only `.label`, `.variant` and `.icon` — so a signed-in buyer with no
 * address saw, in one viewport, the SAME word "Continue" twice: once correctly
 * greyed out, and once as a live primary CTA. Measured in a browser:
 *
 *     in-page Continue      disabled=true
 *     panel  Continue       disabled=true
 *     FAB    Continue       disabled=FALSE   ← primary variant, h-14, shadow-lg
 *
 * ⚠ AND IT DID NOT BYPASS THE GATE, which is what makes it a UX defect rather
 * than a money hole, and also what made it survive: pressing it opened the
 * panel and did nothing else. The validator was right the whole time. This
 * project already has the class on record from the contest note counter —
 * *a correct validator behind a misleading control is indistinguishable, from
 * the user's side, from a WRONG one.*
 *
 * 🛑 THE FIX IS NOT `disabled={primaryAction.disabled}`. The FAB's `onClick` is
 * `setExpanded` — it is a DISCLOSURE control. Disabling it would strand every
 * other action in the panel behind a dead toggle, trading a cosmetic defect for
 * an unreachable one. It stops BORROWING the CTA appearance instead.
 *
 * Run: npx tsx appkit/scripts/verify-dock-fab-appearance.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * 🛑 THE REAL MODULE, IMPORTED AND RUN — not a regex over the source and not a
 * re-implementation. `dock-fab-appearance.ts` is deliberately React-free and
 * dependency-free so this import costs nothing and cannot drift from what
 * ships. An earlier draft of this verifier lifted the function out of the
 * `.tsx` with a regex and stripped its type annotations by hand; it failed on
 * its own surgery, which is a verifier bug wearing the costume of a code bug.
 */
import { resolveDockFabAppearance } from "../src/features/layout/dock-fab-appearance.ts";

const SRC = join(import.meta.dirname, "..", "src", "features", "layout", "SideActionDock.tsx");

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const src = readFileSync(SRC, "utf8");
type Action = Parameters<typeof resolveDockFabAppearance>[0]["primaryAction"];
const resolve = resolveDockFabAppearance;

const CONTINUE = { label: "Continue", variant: "primary", icon: {} };

console.log("\n  ── the exact checkout state that shipped the defect ──\n");
{
  /* Step 1, no address selected. */
  const r = resolve({ primaryAction: { ...CONTINUE, disabled: true }, isBulkMode: false });
  check(r.label !== "Continue", "a DISABLED primary action is not named on the FAB", `got "${r.label}"`);
  check(r.label === "Actions", 'it falls back to the neutral "Actions"', `got "${r.label}"`);
  check(r.variant !== "primary", "and it does not render in the primary CTA variant", `got "${r.variant}"`);
  check(r.borrowedAction === undefined, "nothing is borrowed, so no icon leaks either");
}

console.log("\n  ── loading is unavailable for the same reason ──\n");
{
  const r = resolve({ primaryAction: { label: "Verifying…", variant: "primary", loading: true }, isBulkMode: false });
  check(r.label === "Actions", "a LOADING action is not named on the FAB", `got "${r.label}"`);
  check(r.variant !== "primary", "nor rendered as a live CTA", `got "${r.variant}"`);
}

console.log("\n  ── the healthy case must still borrow, or the fix is a regression ──\n");
{
  const r = resolve({ primaryAction: { ...CONTINUE, disabled: false }, isBulkMode: false });
  check(r.label === "Continue", "an ENABLED action IS named on the FAB", `got "${r.label}"`);
  check(r.variant === "primary", "and keeps its variant", `got "${r.variant}"`);
  check(r.borrowedAction !== undefined, "and its icon is carried through");
}

console.log("\n  ── bulk mode and the empty case are unchanged ──\n");
{
  const bulk = resolve({ primaryAction: undefined, isBulkMode: true, bulkSelectedCount: 3 });
  check(bulk.label === "Bulk actions", "bulk mode still labels itself", `got "${bulk.label}"`);
  check(bulk.ariaLabel.includes("3"), "and still counts the selection", bulk.ariaLabel);

  const none = resolve({ primaryAction: undefined, isBulkMode: false, infoLabel: "₹10,799.00" });
  check(none.label === "Actions", "no actions → the neutral label", `got "${none.label}"`);
  check(none.ariaLabel === "₹10,799.00", "infoLabel still reaches aria-label", none.ariaLabel);
}

console.log("\n  ── the component must USE the resolver, not re-inline the decision ──\n");
{
  /* A resolver with no caller is this project's signature defect — five
   * recorded instances, including one on the money path. Assert the call. */
  check(/const fab = resolveDockFabAppearance\(\{/.test(src), "SideActionDock calls resolveDockFabAppearance");
  const fabBtn = /\{\/\* The resting button[\s\S]*?<\/Button>/.exec(src)?.[0] ?? "";
  check(fabBtn.length > 0, "the resting button's JSX was located");
  check(!/primaryAction\?\.(label|variant|icon)/.test(fabBtn), "the FAB no longer reads primaryAction directly", "it must go through `fab`/`borrowedAction`");
  check(/variant=\{fab\.variant\}/.test(fabBtn), "the FAB takes its variant from the resolver");
  check(/\{fab\.label\}/.test(fabBtn), "the FAB takes its label from the resolver");
}

console.log(`\n${fail === 0 ? "✅ the dock's FAB cannot impersonate an unavailable action" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
