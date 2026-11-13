/**
 * verify-link-tokens — a text link must use the `link` token, in both themes.
 *
 * 🛑 THE DEFECT: `.appkit-text-link--default` used `secondary-600` in light and
 * `primary-400` in dark. Measured against each theme's own page background:
 *
 *     light   #d4af37 on #fafafa    2.01 : 1   🛑
 *     dark    #1f52e4 on #020617    3.25 : 1   🛑
 *
 * Both below the 4.5 AA floor, so the DEFAULT link style — the one most links
 * on the site use — was unreadable in BOTH themes, at opposite ends of the
 * brand ramp. The same mirror shape as the `brand-tri` gradient.
 *
 * ⚠ `audit-contrast` reported "no unreadable pairs" throughout, because it
 * enumerates ink-on-surface pairs and had no entry for a link. It was found by
 * driving the live cart page and compositing computed colours. An audit's
 * COVERAGE is a claim; that one's was narrower than its green line suggested.
 *
 * ✅ `--appkit-color-link` already passed both (5.24 / 11.16) and needed no new
 * colour — the token existed and the component simply did not use it.
 *
 * This asserts the component KEEPS using it, because the contrast audit alone
 * cannot: it checks token values, not which token a CSS rule references.
 *
 * Run: npx tsx scripts/verify-link-tokens.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DEFAULT_LIGHT_THEME } from "../src/tokens/themes/default-light";
import { DEFAULT_DARK_THEME } from "../src/tokens/themes/default-dark";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "ui", "components", "TextLink.style.css"), "utf8");

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  const x = hex.replace("#", "");
  const n = (i: number) => parseInt(x.slice(i, i + 2), 16) / 255;
  return 0.2126 * srgb(n(0)) + 0.7152 * srgb(n(2)) + 0.0722 * srgb(n(4));
};
const ratio = (f: string, b: string) =>
  (Math.max(lum(f), lum(b)) + 0.05) / (Math.min(lum(f), lum(b)) + 0.05);

console.log("\n  ── the readable styles reference `link` ──\n");

/* The two styles that render body-sized link text. */
for (const variant of ["default", "underline"]) {
  const block = new RegExp(`\\.appkit-text-link--${variant}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  check(
    /var\(--appkit-color-link\)/.test(block),
    `--${variant} uses var(--appkit-color-link)`,
    block.trim().replace(/\s+/g, " ").slice(0, 60),
  );
  /*
   * 🛑 And no `.dark` override may re-point it at a brand ramp step. That
   * override is exactly what made the dark theme fail while the light rule
   * looked fine in isolation.
   */
  const darkBlock = new RegExp(`\\.dark\\s+\\.appkit-text-link--${variant}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  check(
    darkBlock === undefined,
    `--${variant} has NO .dark colour override (the token is already theme-aware)`,
    darkBlock ? `found: ${darkBlock.trim().replace(/\s+/g, " ")}` : "none",
  );
}

console.log("\n  ── `link` clears AA in every theme ──\n");
for (const theme of [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME]) {
  const t = theme.tokens as Record<string, string>;
  const link = t["appkit-color-link"];
  const bg = t["appkit-color-bg"];
  if (!link || !bg || !/^#[0-9a-f]{6}$/i.test(link) || !/^#[0-9a-f]{6}$/i.test(bg)) {
    check(false, `${theme.id}: link/bg not a plain hex — cannot evaluate`, `${link} on ${bg}`);
    continue;
  }
  const r = ratio(link, bg);
  check(r >= 4.5, `${theme.id}: link on bg`, `${link} on ${bg} = ${r.toFixed(2)}:1`);
}

/*
 * The regression guard: the two values that were wrong must still be BELOW the
 * floor. If a palette change ever makes them readable this assertion flips and
 * the comment above stops being true — which is worth knowing.
 */
console.log("\n  ── the old values are still unreadable (why they were replaced) ──\n");
const L = DEFAULT_LIGHT_THEME.tokens as Record<string, string>;
const D = DEFAULT_DARK_THEME.tokens as Record<string, string>;
const oldLight = ratio(L["appkit-color-secondary-600"]!, L["appkit-color-bg"]!);
const oldDark = ratio(D["appkit-color-primary-400"]!, D["appkit-color-bg"]!);
check(oldLight < 4.5, "light secondary-600 is below AA as link text", `${oldLight.toFixed(2)}:1`);
check(oldDark < 4.5, "dark primary-400 is below AA as link text", `${oldDark.toFixed(2)}:1`);

console.log(`\n${fail === 0 ? "✅ link tokens hold" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
