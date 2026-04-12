#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "index.md");

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]);

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "tmp",
  "logs",
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function readPackageName() {
  const pkgPath = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) return path.basename(ROOT);
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.name || path.basename(ROOT);
  } catch {
    return path.basename(ROOT);
  }
}

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(abs, files);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (CODE_EXTENSIONS.has(ext)) {
      files.push(abs);
    }
  }
}

function inferUsage(relPath) {
  const p = relPath.toLowerCase();
  if (p.includes("/app/") || p.startsWith("app/")) return "Next.js App Router route/layout/page/handler";
  if (p.includes("/actions/")) return "Action orchestration and side effects";
  if (p.includes("/features/") && p.includes("/components/")) return "Feature-level UI/view composition";
  if (p.includes("/features/")) return "Feature module logic, hooks, types, or schemas";
  if (p.includes("/components/")) return "Reusable UI component or presentation primitive";
  if (p.includes("/hooks/")) return "React hook for client/server feature state";
  if (p.includes("/contexts/")) return "React context/provider state boundary";
  if (p.includes("/repositories/")) return "Repository/data-access implementation";
  if (p.includes("/db/schema/")) return "Database schema/constants/model contracts";
  if (p.includes("/providers/")) return "Provider/adapter integration implementation";
  if (p.includes("/contracts/")) return "Interface/contract definition";
  if (p.includes("/utils/") || p.includes("/helpers/")) return "Shared utilities/helpers/transformations";
  if (p.includes("/validation/")) return "Validation schemas and input guards";
  if (p.includes("/monitoring/") || p.includes("/instrumentation/")) return "Observability/monitoring instrumentation";
  if (p.endsWith("package.json") || p.endsWith("tsconfig.json")) return "Project/package configuration";
  if (p.endsWith(".json")) return "Configuration/data file";
  return "Module implementation";
}

function addSymbol(symbols, kind, name) {
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  if (!symbols.has(trimmed)) symbols.set(trimmed, kind);
}

function extractSymbols(code) {
  const symbols = new Map();

  const regexes = [
    { kind: "fn", re: /\bexport\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g },
    { kind: "fn", re: /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g },
    { kind: "fn", re: /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g },
    { kind: "class", re: /\bexport\s+class\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "class", re: /\bclass\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "interface", re: /\bexport\s+interface\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "interface", re: /\binterface\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "type", re: /\bexport\s+type\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "type", re: /\btype\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "enum", re: /\bexport\s+enum\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "enum", re: /\benum\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "const", re: /\bexport\s+const\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "const", re: /\bconst\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "let", re: /\blet\s+([A-Za-z_$][\w$]*)\b/g },
    { kind: "var", re: /\bvar\s+([A-Za-z_$][\w$]*)\b/g },
  ];

  for (const { kind, re } of regexes) {
    let m;
    while ((m = re.exec(code)) !== null) {
      addSymbol(symbols, kind, m[1]);
    }
  }

  const exportNamed = /\bexport\s*\{([^}]+)\}/g;
  let ex;
  while ((ex = exportNamed.exec(code)) !== null) {
    const chunk = ex[1];
    chunk
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => {
        const aliasSplit = part.split(/\s+as\s+/i);
        const exported = (aliasSplit[1] || aliasSplit[0] || "").trim();
        if (exported) addSymbol(symbols, "export", exported);
      });
  }

  return [...symbols.entries()]
    .map(([name, kind]) => `${kind} ${name}`)
    .sort((a, b) => a.localeCompare(b));
}

function esc(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildRows(files) {
  const rows = [];
  for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    let code = "";
    try {
      code = fs.readFileSync(abs, "utf8");
    } catch {
      code = "";
    }

    const symbols = extractSymbols(code);
    rows.push({
      name: path.basename(rel),
      path: rel,
      usage: inferUsage(rel),
      symbols: symbols.length ? symbols.join(", ") : "-",
    });
  }

  rows.sort((a, b) => a.path.localeCompare(b.path));
  return rows;
}

function renderMarkdown(repoName, rows) {
  const lines = [];
  lines.push(`# ${repoName} Code Index`);
  lines.push("");
  lines.push("Auto-generated inventory of code/config files with detected exported and internal symbols.");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total indexed files: ${rows.length}`);
  lines.push("");
  lines.push("| Name | Path | Usage / What Is Inside | Symbols (Exported + Internal) |");
  lines.push("|---|---|---|---|");

  for (const row of rows) {
    lines.push(`| ${esc(row.name)} | ${esc(row.path)} | ${esc(row.usage)} | ${esc(row.symbols)} |`);
  }

  lines.push("");
  lines.push("Notes:");
  lines.push("- Symbol detection uses static pattern matching and may include some false positives/negatives.");
  lines.push("- This index is intended for migration/refactor discovery and ownership review.");

  return lines.join("\n");
}

function main() {
  const files = [];
  walk(ROOT, files);
  const rows = buildRows(files);
  const repoName = readPackageName();
  const md = renderMarkdown(repoName, rows);
  fs.writeFileSync(OUTPUT, md, "utf8");
  console.log(`Generated ${toPosix(path.relative(ROOT, OUTPUT))} with ${rows.length} files.`);
}

main();
