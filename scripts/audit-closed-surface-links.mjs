#!/usr/bin/env node
/**
 * audit-closed-surface-links — seeded CONTENT must not advertise a surface the
 * seeded SETTINGS close.
 *
 * 🛑 WHY THIS IS NOT COVERED BY ANYTHING ELSE, and the cost of that gap.
 *
 * `audit-section-config-links` checks that a `/categories/{id}` href in a
 * section config resolves to a real seeded category — i.e. that the link is
 * not a typo. It says nothing about whether the SECTION is open.
 * `audit-nav-page-wiring` checks nav hrefs against `page.tsx` files, and the
 * page always exists: closing a surface is a flag, never a deletion.
 *
 * So a link into a closed surface passes every existing gate. Measured against
 * production on 2026-10-27, with all four browse pages `false` since
 * 2026-10-24 and `art`/`spares` auto-hidden at count 0 (both already answering
 * a real 404 at the edge), one fetch of `/` carried:
 *
 *   34 links to /categories and /categories/{slug}   section closed
 *    3 links to /art                                 404
 *    3 links to /spares                              404
 *
 * from four sections nothing had an opinion about — `section-welcome-hero`
 * (`secondaryCtaLink`), `section-systems-matrix` (35 category buttons),
 * `section-generation-promos` (4 category banners) and `section-shop-extras`.
 *
 * `gateHomepageSections` now strips those at RENDER time, which is the fix
 * that holds for admin-authored content. This audit is the other half: it
 * keeps the SEED honest, so a fresh install does not start out shipping dead
 * links and quietly relying on the runtime filter to hide its own fixtures.
 * A fixture the filter always removes is dead weight that reads as content.
 *
 * ## What it checks
 *
 * Every string in every seeded homepage-section config, and the public
 * footer/nav link tables, against the closed-surface rules derived
 * from `site-settings-seed-data` — the same three axes `isClosedHref` reads:
 *
 *   · `listings.listingTypes`  — a type switched off (the seed cannot know the
 *                                measured counts, so this is the flag half only)
 *   · `listings.browsePages`   — a closed browse section, descendants included
 *   · `listings.categoryTypes` — bundles
 *
 * ## 🛑 Deliberately SILENT on a disabled section
 *
 * A section with `enabled: false` is not shipped, so its links cannot be
 * advertised and are not violations. That is what lets the correct remedy for
 * a whole-section offender be `enabled: false` rather than gutting its content
 * — the systems matrix keeps all 35 of its category buttons, ready for the day
 * `/categories` reopens.
 *
 * Strict zero. No suppression marker — a link either points somewhere open or
 * it does not.
 *
 * @tag domain:homepage
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:none
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/*
 * Resolved from THIS FILE, never from `process.cwd()`. The registry invokes
 * `appkit/scripts/…` from the consumer root while a human debugging it runs it
 * from inside `appkit/` — a cwd-relative path is correct for exactly one of
 * those and silently "passes" (via the absent-dist early exit) for the other,
 * which is the worst way for an audit to be wrong.
 */
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (!existsSync(DIST)) {
  console.log(
    "audit-closed-surface-links: appkit/dist absent — run `npm --prefix appkit run build` first.",
  );
  process.exit(0);
}

const load = (rel) => import(pathToFileURL(resolve(DIST, rel)).href);

const { homepageSectionsSeedData } = await load("seed/homepage-sections-seed-data.js");
const { siteSettingsSeedData } = await load("seed/site-settings-seed-data.js");
const { closedSurfacePrefixes, isUnderClosedPrefix } = await load(
  "_internal/shared/listing-types/hidden-surfaces.js",
);
const { closedSurfaceContext, isClosedHref } = await load(
  "_internal/shared/listing-types/route-gating.js",
);

/*
 * The seed is an array of documents; `siteSettings/global` is the one we want.
 * Resolved by id rather than `[0]` so a reordering cannot silently make this
 * audit measure a different document — it would still pass, which is the
 * failure mode that matters.
 */
const settings =
  (Array.isArray(siteSettingsSeedData) ? siteSettingsSeedData : [siteSettingsSeedData]).find(
    (d) => d?.id === "global",
  ) ?? null;

if (!settings) {
  console.error("✗ audit-closed-surface-links: siteSettings/global not found in the seed.");
  process.exit(1);
}

/*
 * 🛑 `counts: undefined`, and that is the honest reading rather than a
 * shortcut. `surfaceCounts` is a MEASUREMENT of live data; the seed cannot
 * know it, and `isListingSurfaceVisible` reads an absent count as VISIBLE.
 *
 * So this audit sees the FLAG half of the listing-type axis and not the
 * auto-hide half — it would not, on its own, have caught the `/art` and
 * `/spares` links, because both flags read `true` in the seed. That half is
 * caught at render by `gateHomepageSections`, which does read the counts.
 * Saying so here matters: an audit that is quietly narrower than the rule it
 * is believed to enforce is its own recurring defect (Root Cause #84).
 */
const ctx = closedSurfaceContext(settings, undefined);
const prefixes = closedSurfacePrefixes(settings);

const violations = [];
let checked = 0;

/** Walk any value, testing every string that looks like an in-app path. */
function walk(node, path, origin) {
  if (typeof node === "string") {
    if (!node.startsWith("/") || /\.(png|jpe?g|webp|svg|gif|mp4|ico)$/i.test(node)) return;
    // Media slugs are not navigation — `/media/foo` is an image source.
    if (node.startsWith("/media/")) return;
    checked++;
    if (isClosedHref(node, ctx) || isUnderClosedPrefix(node, prefixes)) {
      violations.push({ origin, path, href: node });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, origin));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, origin);
  }
}

for (const section of homepageSectionsSeedData ?? []) {
  // Not shipped, so it advertises nothing — see the header.
  if (section?.enabled === false) continue;
  walk(section.config, "config", `section ${section.id} (${section.type})`);
}

/*
 * 🛑 No carousel-slide loop any more. There is no seeded slide array to scan —
 * every hero slide is computed live from an event's own `carouselConfig`
 * (`getHeroCarouselSlides()`), and its link is always that event's own detail
 * page, never a hand-typed href. See CLAUDE.md "Homepage Hero Carousel".
 */

if (violations.length > 0) {
  console.error(
    `✗ audit-closed-surface-links: ${violations.length} seeded link(s) point at a closed surface`,
  );
  console.error(`  closed prefixes: ${prefixes.join(", ") || "(none)"}\n`);
  for (const v of violations) {
    console.error(`  ${v.origin}`);
    console.error(`    ${v.path} -> ${v.href}`);
  }
  console.error(
    "\n  Fix by setting the section's `enabled: false` (keeps the content for when the",
  );
  console.error(
    "  surface reopens), or by repointing the link at a surface that is open.",
  );
  process.exit(1);
}

console.log(
  `audit-closed-surface-links: clean ✓ (${checked} in-app link(s) checked, ` +
    `${prefixes.length} closed prefix(es))`,
);
