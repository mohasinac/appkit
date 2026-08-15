#!/usr/bin/env node
/**
 * audit-touch-handler-completeness.mjs — missing touchcancel detector.
 *
 * Flags any file that registers a `touchstart`/`touchmove`/`touchend`
 * listener (via addEventListener OR a JSX onTouchStart/onTouchMove/onTouchEnd
 * prop) but never registers a `touchcancel` counterpart (addEventListener OR
 * onTouchCancel).
 *
 * Root cause: an interrupted touch (OS/browser gesture takeover — e.g. a
 * notification pull-down, or the browser reinterpreting a touch as a page
 * scroll) never fires `touchend`. Any hook/component tracking gesture state
 * only in `touchstart`/`touchmove`/`touchend` handlers is left with stale
 * refs or stuck state, and any `onXxxEnd` callback the consumer relies on to
 * clear a "dragging"/"pulling"/"pressed" UI flag never fires.
 *
 * Found across 4 files in one bug-hunt session (2026-08-15): useGesture.ts,
 * useSwipe.ts, usePullToRefresh.ts (SHARED-BUG-13) and useLongPress.ts
 * (SHARED-BUG-14).
 *
 * Suppress per-file with a `// audit-touch-handler-ok: <reason>` comment
 * anywhere in the file for a genuine case where touchcancel doesn't apply
 * (e.g. a one-shot tap detector with no persisted state to reset).
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

const START_MOVE_END_RE = /addEventListener\(\s*["'](touchstart|touchmove|touchend)["']|onTouch(Start|Move|End)\b/;
const CANCEL_RE = /addEventListener\(\s*["']touchcancel["']|onTouchCancel\b/;
const SUPPRESS_RE = /\/\/\s*audit-touch-handler-ok\b/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(join(dir, entry.name), files);
    } else {
      const ext = extname(entry.name);
      if (ext === ".tsx" || ext === ".ts") files.push(join(dir, entry.name));
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  if (/__tests__|\.test\.[tj]sx?$/.test(file)) continue;
  const content = readFileSync(file, "utf8");
  if (SUPPRESS_RE.test(content)) continue;
  if (!START_MOVE_END_RE.test(content)) continue;
  if (CANCEL_RE.test(content)) continue;
  violations.push(relative(SRC_DIR, file));
}

if (violations.length === 0) {
  console.log("audit-touch-handler-completeness: every touchstart/move/end handler has a touchcancel counterpart ✓");
  process.exit(0);
}

const out = [
  `audit-touch-handler-completeness: ${violations.length} file(s) register touchstart/touchmove/touchend but no touchcancel:`,
  "",
  ...violations.map((f) => `  ${f}`),
  "",
  "Fix: add a touchcancel listener (addEventListener or onTouchCancel) that",
  "resets whatever state touchstart/touchmove set, WITHOUT firing the normal",
  "end-of-gesture callback — a cancelled touch is not a completed one.",
  "Suppress with // audit-touch-handler-ok: <reason> only when there is",
  "genuinely no persisted state for an interrupted touch to leave stale.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
