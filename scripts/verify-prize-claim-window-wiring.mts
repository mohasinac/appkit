/**
 * Assert the prize claim window is wired END TO END, across both repos.
 *
 * ## 🛑 WHY THIS IS A SOURCE VERIFIER AND NOT A UNIT TEST
 *
 * The defect it exists to catch is not a wrong value — it is a CORRECT value
 * written to a path nobody reads. `prizes.claimWindowDays` was on the
 * `SiteSettingsDocument` type and read by the award handler for a whole session
 * with NO form field anywhere, so the setting the owner was promised could not
 * be set. Then the first fix attempt could have written it under
 * `platformLimits` — which saves, reads back correctly on the admin screen, and
 * changes nothing about any prize. That is the `legalPages.shipping` failure
 * verbatim: written by the form, read by nothing.
 *
 * None of that is visible to a typecheck. Both halves are perfectly typed.
 *
 * ## The four links, and what breaking each one looks like
 *
 * | link | break it and… |
 * |---|---|
 * | the form SCHEMA declares the field | no input renders; the setting is unreachable |
 * | the view LOADS from `prizes.claimWindowDays` | the input always shows the default, so a saved value looks lost |
 * | the view SAVES to the `prizes` group | saves fine, changes no prize |
 * | the consumer ALLOW-LISTS `"prizes"` | every Save All is a 400 naming no field |
 *
 * ⚠ The allow-list check reads the SHOP, across the registry boundary — the
 * same thing `verify-guest-cart-snapshot.mts` does, and the only place these
 * two repos' agreement is asserted at all.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const appkitRoot = path.resolve(here, "..");
/* ⚠ The shop is the PARENT of the appkit submodule. Resolved, then existence-
   checked, because a publish can run from a git worktree where `../..` is the
   shop root and not the tree being packed — the trap `prepublish-gate.mjs`
   fell into. A missing file must FAIL here, never silently skip. */
const shopRoot = path.resolve(appkitRoot, "..");

let ok = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    ok += 1;
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
  }
}

/**
 * Read a source file with its COMMENTS STRIPPED.
 *
 * 🛑 THIS IS NOT TIDINESS — IT IS THE FIX FOR A FALSE PASS THIS VERIFIER
 * ACTUALLY PRODUCED. The allow-list check below looked for `"prizes"` inside
 * `WRITABLE_SITE_GROUPS`, and the explanatory comment *inside that array*
 * quotes the very token. So deleting the real entry left the verifier
 * **green at 10/10** — proven by sabotage, which is the only reason it was
 * found.
 *
 * ⚠ This is the project's recorded comment-vs-code trap read from the other
 * side. It is already written down for BANNED tokens — *"never quote a banned
 * token in the comment explaining why it is banned"*, after a de-branding
 * comment tripped the audit it explained, four times. The same hazard applies
 * to a REQUIRED token: a check that something is PRESENT is satisfied by the
 * prose saying it should be.
 *
 * ✅ Stripping at the single read point fixes every check at once, including
 * ones added later, instead of hardening each regex and missing the next one.
 */
function read(p: string): string {
  if (!existsSync(p)) throw new Error(`file not found: ${p}`);
  return (
    readFileSync(p, "utf8")
      /* Block comments first — a `//` inside one must not be treated as a line
         comment, and a URL's `//` must survive, which it does because block
         removal runs first and line removal requires leading whitespace. */
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
  );
}

const SCHEMA = path.join(appkitRoot, "src/features/admin/schemas/site-settings-limits-form.ts");
const VIEW = path.join(appkitRoot, "src/features/admin/components/AdminSiteSettingsView.tsx");
const ALLOWLIST = path.join(shopRoot, "src/app/api/admin/site/route.ts");
const HANDLER = path.join(appkitRoot, "src/features/admin/api/prizes/route.ts");
const ACTION = path.join(appkitRoot, "src/_internal/server/features/prizes/award-action.ts");

/* ── 1. the form schema declares the field ─────────────────────────────────── */

check("schema declares prizeClaimWindowDays", () => {
  const s = read(SCHEMA);
  if (!/prizeClaimWindowDays:\s*annotate\(/.test(s)) {
    throw new Error("the Limits form schema does not declare prizeClaimWindowDays");
  }
});

check("schema floors the window at 1, so a stored 0 cannot mean unlimited", () => {
  const s = read(SCHEMA);
  const m = s.match(/prizeClaimWindowDays:\s*annotate\(\s*z\.number\(\)([^,]*)/);
  if (!m) throw new Error("could not read the prizeClaimWindowDays zod chain");
  if (!/\.min\(1\)/.test(m[1]!)) {
    throw new Error(`expected .min(1) on the claim window, got: ${m[1]!.trim()}`);
  }
});

check("schema caps the window, so a typo cannot restore the 2-3 year case", () => {
  const s = read(SCHEMA);
  const m = s.match(/prizeClaimWindowDays:\s*annotate\(\s*z\.number\(\)([^,]*)/);
  if (!m || !/\.max\(\d+\)/.test(m[1]!)) {
    throw new Error("expected a .max() cap on the claim window");
  }
});

/* ── 2. the view loads from the path the handler reads ─────────────────────── */

check("view LOADS prizeClaimWindowDays from settings.prizes.claimWindowDays", () => {
  const s = read(VIEW);
  if (!/prizeClaimWindowDays:\s*s\.prizes\?\.claimWindowDays/.test(s)) {
    throw new Error(
      "the view does not load the field from `prizes.claimWindowDays` — a saved value would read back as the default",
    );
  }
});

/* ── 3. the view saves to the `prizes` group, NOT platformLimits ───────────── */

check("view SAVES claimWindowDays under a `prizes` group", () => {
  const s = read(VIEW);
  if (!/prizes:\s*\{[^}]*claimWindowDays:\s*limitsForm\.prizeClaimWindowDays/s.test(s)) {
    throw new Error("the save payload has no `prizes: { claimWindowDays }` entry");
  }
});

check("🛑 claimWindowDays is NOT saved under platformLimits", () => {
  const s = read(VIEW);
  const block = s.match(/platformLimits:\s*\{([^}]*)\}/s);
  if (!block) throw new Error("could not locate the platformLimits save block");
  if (/claimWindow/i.test(block[1]!)) {
    throw new Error(
      "claimWindowDays is written under platformLimits — it would save, read back, and change no prize",
    );
  }
});

/* ── 4. the consumer allow-lists the group ─────────────────────────────────── */

check('shop WRITABLE_SITE_GROUPS contains "prizes"', () => {
  const s = read(ALLOWLIST);
  const block = s.match(/WRITABLE_SITE_GROUPS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!block) throw new Error("could not locate WRITABLE_SITE_GROUPS in the shop");
  if (!/["']prizes["']/.test(block[1]!)) {
    throw new Error('the shop does not allow-list "prizes" — Save All would 400 naming no field');
  }
});

/* ── 5. the reader is still the handler, and the default is still bounded ──── */

check("the award handler reads the window from settings, not from the body", () => {
  const s = read(HANDLER);
  if (!/settings\?\.prizes\?\.claimWindowDays/.test(s)) {
    throw new Error("the handler no longer resolves claimWindowDays from site settings");
  }
});

check("🛑 an absent setting falls to a BOUNDED default, never unlimited", () => {
  const s = read(ACTION);
  const m = s.match(/DEFAULT_CLAIM_WINDOW_DAYS\s*=\s*(\d+)/);
  if (!m) throw new Error("DEFAULT_CLAIM_WINDOW_DAYS is gone — an unset setting must not mean forever");
  const days = Number(m[1]);
  if (!Number.isFinite(days) || days <= 0 || days > 365) {
    throw new Error(`the fallback window is not bounded sanely: ${m[1]}`);
  }
});

check("a non-positive or non-finite configured window falls back rather than opening", () => {
  const s = read(ACTION);
  if (!/Number\.isFinite\(input\.claimWindowDays\)/.test(s)) {
    throw new Error("awardPrize does not guard a non-finite configured window");
  }
  if (!/>\s*0/.test(s)) {
    throw new Error("awardPrize does not reject a non-positive configured window");
  }
});

/* ── report ────────────────────────────────────────────────────────────────── */

console.log(`verify-prize-claim-window-wiring: ${ok} ok, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
if (failures.length > 0) process.exit(1);
