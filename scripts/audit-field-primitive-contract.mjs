#!/usr/bin/env node
/**
 * audit-field-primitive-contract.mjs — ui/forms Field* wrapper contract check.
 *
 * Every component in appkit/src/ui/forms/ that consumes FormShellContext
 * (the FieldInput/FieldTextarea/FieldSelect/FieldCheckbox/ColorPickerField
 * family) must follow two rules consistently:
 *
 *   1. Never forward the resolved `error` value as a prop into the
 *      underlying wrapped primitive (Input/Textarea/Select/Checkbox/etc).
 *      Those primitives render their OWN error <Text role="alert"> block
 *      whenever `error` is truthy — forwarding it duplicates the error
 *      message (and its role="alert" announcement) alongside the Field
 *      wrapper's own error block below.
 *   2. Call `ctx?.clearFieldError(name)` from the change handler when
 *      `showError` is true, so picking a new (valid) value clears a
 *      previously-set FormShell error instead of leaving it displayed
 *      indefinitely.
 *
 * Root cause: FieldCheckbox.tsx violated rule 1 (SHARED-BUG-33) and
 * ColorPickerField.tsx violated rule 2 (SHARED-BUG-34) — both found in the
 * 2026-08-15 bug-hunt session because the OTHER three Field* files already
 * did the right thing and nothing enforced the same contract on all five.
 *
 * Suppress per-file with `// audit-field-contract-ok: <reason>` for a
 * genuinely different field type that doesn't fit this contract.
 *
 * Exits 0 on clean, 1 on violations.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORMS_DIR = join(__dirname, "..", "src", "ui", "forms");

const SUPPRESS_RE = /\/\/\s*audit-field-contract-ok\b/;
// Matches a JSX prop `error={...}` — the sign this file is forwarding its
// resolved error value into a child element, rather than only rendering its
// own error <Text> block.
const FORWARDS_ERROR_RE = /\berror=\{/;

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (e.name.endsWith(".tsx") || e.name.endsWith(".ts")))
    .filter((e) => !/__tests__|\.test\.[tj]sx?$/.test(e.name))
    .map((e) => join(dir, e.name));
}

const violations = [];

for (const file of listFiles(FORMS_DIR)) {
  const content = readFileSync(file, "utf8");
  // Only files that actually participate in the FormShell error contract.
  if (!content.includes("FormShellContext")) continue;
  if (!content.includes("showError")) continue;
  if (SUPPRESS_RE.test(content)) continue;

  const rel = relative(FORMS_DIR, file);
  const issues = [];

  if (FORWARDS_ERROR_RE.test(content)) {
    issues.push('forwards `error={...}` into a child element — the primitive renders its own error block, duplicating the message');
  }
  if (!content.includes("clearFieldError")) {
    issues.push("never calls ctx?.clearFieldError(name) — a previously-set error stays displayed after the value changes");
  }

  if (issues.length > 0) violations.push({ file: rel, issues });
}

if (violations.length === 0) {
  console.log("audit-field-primitive-contract: all ui/forms Field* components follow the error contract ✓");
  process.exit(0);
}

const out = [
  `audit-field-primitive-contract: ${violations.length} file(s) violate the Field* error contract:`,
  "",
  ...violations.flatMap((v) => [`  ${v.file}`, ...v.issues.map((i) => `    - ${i}`)]),
  "",
  "Fix: match the pattern in FieldInput.tsx / FieldTextarea.tsx / FieldSelect.tsx —",
  "never pass `error=` to the wrapped primitive, and call",
  "`if (showError) ctx?.clearFieldError(name);` from the change handler.",
  "Suppress with // audit-field-contract-ok: <reason> for a field type that",
  "genuinely doesn't fit this contract.",
];

process.stderr.write(out.join("\n") + "\n");
process.exit(1);
