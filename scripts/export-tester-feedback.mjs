#!/usr/bin/env node
/**
 * export-tester-feedback — dumps all tester QA checklist responses into a single
 * Markdown report, optimized for a future Claude Code session to read directly
 * and go fix the reported issues — no live Firestore query, no auth, no admin UI.
 *
 * Talks directly to Firestore via firebase-admin (same pattern as seed-cli.mjs /
 * purge-tester-sandbox.mjs). Joins testerChecklistResponses against
 * testerChecklistItems (responses don't store the human-readable label/href).
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/export-tester-feedback.mjs
 *   node appkit/scripts/export-tester-feedback.mjs --out custom-report.md
 *   node appkit/scripts/export-tester-feedback.mjs --service-account <path-to-key.json>
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const rawArgs = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const SERVICE_ACCOUNT_OVERRIDE = typeof flag("service-account") === "string" ? flag("service-account") : null;
const OUT_FILE = typeof flag("out") === "string" ? flag("out") : "tester-feedback-report.md";
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://letitrip.in";

// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / purge-tester-sandbox.mjs)
// ---------------------------------------------------------------------------
const repoRoot = process.cwd();
const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const raw = t.slice(eq + 1).trim();
    const v = raw.replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
} else {
  console.warn(`⚠ .env.local not found at ${envLocalPath} — relying on existing process.env`);
}

const required = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missing.length > 0) {
  console.error(`✗ Missing required env vars: ${missing.join(", ")}`);
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// firebase-admin init
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

function parsePrivateKey(raw) {
  if (!raw) return raw;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

if (!admin.apps.length) {
  if (SERVICE_ACCOUNT_OVERRIDE) {
    const key = JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
    });
  }
}
const db = admin.firestore();
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);

// ---------------------------------------------------------------------------
// Fetch + join + format
// ---------------------------------------------------------------------------
function escapeMd(text) {
  return String(text ?? "").replace(/\r?\n/g, " ").trim();
}

function screenshotLink(screenshotUrl) {
  if (!screenshotUrl) return "(none)";
  const abs = screenshotUrl.startsWith("http") ? screenshotUrl : `${SITE_ORIGIN}${screenshotUrl}`;
  return `[view](${abs})`;
}

const itemsSnap = await db.collection("testerChecklistItems").get();
const itemById = new Map();
for (const doc of itemsSnap.docs) {
  itemById.set(doc.id, doc.data());
}

const responsesSnap = await db.collection("testerChecklistResponses").get();
const responses = responsesSnap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((r) => r.answer === "yes" || r.answer === "no");

// phase -> group -> page -> [responses], sorted for stable output
const grouped = new Map();
for (const r of responses) {
  const item = itemById.get(r.checklistItemId);
  const phase = item?.phase ?? r.phase ?? 0;
  const groupLabel = item?.groupLabel ?? r.groupKey ?? "Unknown group";
  const pageLabel = item?.pageLabel ?? r.pageKey ?? "Unknown page";
  const key = `${phase}\u241f${groupLabel}\u241f${pageLabel}`;
  if (!grouped.has(key)) grouped.set(key, { phase, groupLabel, pageLabel, items: [] });
  grouped.get(key).items.push({ ...r, label: item?.label ?? r.checklistItemId, href: item?.href });
}

const sortedGroups = Array.from(grouped.values()).sort(
  (a, b) => a.phase - b.phase || a.groupLabel.localeCompare(b.groupLabel) || a.pageLabel.localeCompare(b.pageLabel),
);

const issues = responses.filter((r) => r.answer === "no");
const passingWithNotes = responses.filter((r) => r.answer === "yes" && r.comment && r.comment.trim());

const lines = [];
lines.push("# Tester Feedback Report");
lines.push("");
lines.push(
  `Generated ${new Date().toISOString()} — ${issues.length} issue(s) ("No" answers) across ${responses.length} answered case(s), plus ${passingWithNotes.length} note(s) on passing cases.`,
);
lines.push("");
lines.push("> Auto-generated by `node appkit/scripts/export-tester-feedback.mjs` — do not edit by hand, re-run to refresh.");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Issues (\"No\" answers) — fix these");
lines.push("");

if (issues.length === 0) {
  lines.push("_No issues reported yet._");
  lines.push("");
} else {
  let lastPhase = null;
  for (const group of sortedGroups) {
    const groupIssues = group.items.filter((r) => r.answer === "no");
    if (groupIssues.length === 0) continue;
    if (group.phase !== lastPhase) {
      lines.push(`## Phase ${group.phase}`);
      lines.push("");
      lastPhase = group.phase;
    }
    lines.push(`### ${group.groupLabel} \u203a ${group.pageLabel}`);
    lines.push("");
    for (const r of groupIssues) {
      lines.push(`- [ ] **${escapeMd(r.label)}**`);
      lines.push(`  - Tester: ${escapeMd(r.testerDisplayName)}`);
      if (r.comment) lines.push(`  - Comment: ${escapeMd(r.comment)}`);
      lines.push(`  - Screenshot: ${screenshotLink(r.screenshotUrl)}`);
      if (r.href) lines.push(`  - Test this: ${r.href}`);
      lines.push(`  - Status: ${r.status === "reviewed" ? "reviewed" : "new"}`);
      lines.push("");
    }
  }
}

lines.push("---");
lines.push("");
lines.push("## Notes on passing cases (\"Yes\" with a comment)");
lines.push("");

if (passingWithNotes.length === 0) {
  lines.push("_No notes on passing cases._");
  lines.push("");
} else {
  let lastPhase = null;
  for (const group of sortedGroups) {
    const groupNotes = group.items.filter((r) => r.answer === "yes" && r.comment && r.comment.trim());
    if (groupNotes.length === 0) continue;
    if (group.phase !== lastPhase) {
      lines.push(`## Phase ${group.phase}`);
      lines.push("");
      lastPhase = group.phase;
    }
    lines.push(`### ${group.groupLabel} \u203a ${group.pageLabel}`);
    lines.push("");
    for (const r of groupNotes) {
      lines.push(`- **${escapeMd(r.label)}** (works)`);
      lines.push(`  - Tester: ${escapeMd(r.testerDisplayName)}`);
      lines.push(`  - Comment: ${escapeMd(r.comment)}`);
      lines.push(`  - Screenshot: ${screenshotLink(r.screenshotUrl)}`);
      lines.push("");
    }
  }
}

const outPath = resolve(repoRoot, OUT_FILE);
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`✓ Wrote ${outPath} — ${issues.length} issue(s), ${passingWithNotes.length} note(s)`);
process.exit(0);
