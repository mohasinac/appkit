/**
 * scripts/audit-violations.ts
 *
 * Audits the source tree for common architectural violations.
 * Run: npx ts-node --esm scripts/audit-violations.ts > violations.json
 *
 * Output: JSON object keyed by violation category, each containing an array
 * of matching file:line references.
 *
 * Exempt paths:
 *   - appkit/src/ui/components/    — wrapper definitions (raw HTML allowed here)
 *   - *.test.ts / *.spec.ts        — test files
 *   - scripts/seed-data/           — seed scripts
 *   - tailwind.config.js           — token definitions
 *   - src/tokens/                  — token definitions
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
interface AuditPattern {
  name: string;
  regex: string;
  fileTypes?: string;
}

const PATTERNS: AuditPattern[] = [
  {
    name: "raw_html_elements",
    regex:
      "<(h[1-6]|p\\b|button\\b|input\\b|textarea\\b|select\\b|form\\b|ul\\b|ol\\b|li\\b|section\\b|article\\b|nav\\b|main\\b|aside\\b|header\\b|footer\\b)",
    fileTypes: "tsx",
  },
  {
    name: "raw_media_elements",
    regex: "<(img|video)\\b",
    fileTypes: "tsx",
  },
  {
    name: "hardcoded_grid_cols",
    regex: "(?<![a-z]:)\\bgrid-cols-[1-9]\\b",
    fileTypes: "tsx",
  },
  {
    name: "icon_button_no_aria_label",
    regex: "<IconButton(?![^>]*aria-label)",
    fileTypes: "tsx",
  },
  {
    name: "icon_button_no_tooltip",
    regex: "<IconButton",
    fileTypes: "tsx",
  },
  {
    name: "direct_fetch",
    regex: "\\bfetch\\(",
    fileTypes: "ts,tsx",
  },
  {
    name: "console_log",
    regex: "console\\.(log|warn|error)\\(",
    fileTypes: "ts,tsx",
  },
  {
    name: "hardcoded_api_path",
    regex: "apiClient\\.(get|post|patch|put|delete)\\s*\\(\\s*['\"`]/api/",
    fileTypes: "ts,tsx",
  },
];

// Paths to exclude from results (partial path match)
const EXEMPT_PATHS: string[] = [
  "/ui/components/",
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
  "seed-data/",
  "tailwind.config",
  "/tokens/",
  "theme.ts",
];

// ─────────────────────────────────────────────────────────────────────────────

function runGrep(pattern: string, fileTypes: string): string[] {
  const includes = fileTypes
    .split(",")
    .map((ext) => `--include="*.${ext.trim()}"`)
    .join(" ");
  try {
    const output = execSync(
      `grep -rn ${includes} -E "${pattern}" src/`,
      { encoding: "utf8", cwd: process.cwd() },
    );
    return output.split("\n").filter(Boolean);
  } catch {
    // grep exits with code 1 when no matches
    return [];
  }
}

function isExempt(line: string): boolean {
  // Normalise path separators
  const normalised = line.replace(/\\/g, "/");
  return EXEMPT_PATHS.some((exempt) => normalised.includes(exempt));
}

// ─────────────────────────────────────────────────────────────────────────────

const results: Record<string, string[]> = {};

for (const { name, regex, fileTypes = "ts,tsx" } of PATTERNS) {
  const lines = runGrep(regex, fileTypes);
  results[name] = lines.filter((l) => !isExempt(l));
}

const totalViolations = Object.values(results).reduce(
  (sum, arr) => sum + arr.length,
  0,
);

const output = {
  summary: {
    total: totalViolations,
    categories: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, v.length]),
    ),
  },
  violations: results,
};

const json = JSON.stringify(output, null, 2);
writeFileSync("violations.json", json, "utf8");

// Print summary to stderr (so JSON stays clean on stdout)
process.stderr.write(
  `\nAudit complete — ${totalViolations} violations across ${Object.keys(results).length} categories.\n`,
);
process.stderr.write(
  Object.entries(output.summary.categories)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `  ${name}: ${count}`)
    .join("\n") + "\n\n",
);

console.log(json);
