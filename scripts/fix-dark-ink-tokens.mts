/**
 * fix-dark-ink-tokens — re-point `.dark` ink from the dark end of a ramp to
 * the light end.
 *
 * 🛑 THE CLASS, found four times in one day: a ramp step chosen for a LIGHT
 * background used as INK on a DARK one. Each instance is invisible in exactly
 * one theme, and the worst read as a DISABLED "Add to Cart".
 *
 *   `primary`      #1e3a8a   1.95 : 1 on #020617
 *   `primary-400`  #1f52e4   3.25 : 1
 *   `primary-300`  #6e90f4   6.68 : 1   ← the fix
 *
 * ⚠ ONLY `color:` INSIDE A `.dark` BLOCK is rewritten. A `background`,
 * `border-color` or `box-shadow` built from the same token is decorative and
 * is NOT read — rewriting those would change the design for no accessibility
 * gain, which is how an a11y sweep earns a reputation for breaking things.
 *
 * Idempotent: a rule already on `primary-300` is left alone.
 *
 * Usage:  npx tsx scripts/fix-dark-ink-tokens.mts [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_DARK_THEME } from "../src/tokens/themes/default-dark";

const WRITE = process.argv.includes("--write");
const T = DEFAULT_DARK_THEME.tokens as Record<string, string>;
const bg = T["appkit-color-bg"]!;

const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => {
  const x = h.replace("#", "");
  const n = (i: number) => parseInt(x.slice(i, i + 2), 16) / 255;
  return 0.2126 * srgb(n(0)) + 0.7152 * srgb(n(2)) + 0.0722 * srgb(n(4));
};
const ratio = (f: string, b: string) =>
  (Math.max(lum(f), lum(b)) + 0.05) / (Math.min(lum(f), lum(b)) + 0.05);

/* The replacement is CHOSEN BY MEASUREMENT, not by preference: the first step
 * of the same ramp that clears 4.5:1, so the hue is preserved and the change
 * is the smallest one that works. */
function readableReplacement(token: string): string | null {
  const family = token.replace(/-\d+$/, "");
  for (const step of ["300", "200"]) {
    const candidate = `${family}-${step}`;
    const v = T[candidate];
    if (v && /^#[0-9a-f]{6}$/i.test(v) && ratio(v, bg) >= 4.5) return candidate;
  }
  return null;
}

const dir = join(import.meta.dirname, "..", "src", "ui", "components");
let changed = 0;
const report: string[] = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith(".style.css"))) {
  const path = join(dir, file);
  const original = readFileSync(path, "utf8");
  let next = original;

  /* Walk `.dark …{ … }` blocks and rewrite only the `color:` declaration. */
  next = next.replace(/(\.dark[^{]*\{)([^}]*)(\})/g, (whole, open, body, close) => {
    const newBody = body.replace(
      /((?:^|[^-])color:\s*var\(--)(appkit-color-[a-z0-9-]+)(\))/gm,
      (decl: string, pre: string, token: string, post: string) => {
        const v = T[token];
        if (!v || !/^#[0-9a-f]{6}$/i.test(v)) return decl;
        if (ratio(v, bg) >= 4.5) return decl;
        const repl = readableReplacement(token);
        if (!repl) return decl;
        report.push(
          `  ${file.padEnd(28)} ${token.replace("appkit-color-", "").padEnd(14)} ${ratio(v, bg).toFixed(2)}:1  →  ${repl.replace("appkit-color-", "")} ${ratio(T[repl]!, bg).toFixed(2)}:1`,
        );
        changed += 1;
        return `${pre}${repl}${post}`;
      },
    );
    return `${open}${newBody}${close}`;
  });

  if (next !== original && WRITE) writeFileSync(path, next, "utf8");
}

console.log(report.length ? report.join("\n") : "  ✅ nothing to fix");
console.log(`\n  ${changed} declaration(s) ${WRITE ? "REWRITTEN" : "would be rewritten (dry run)"}`);
process.exit(0);
