/**
 * verify-beyblade-taxonomy — EXECUTE the deriver and assert its answers.
 *
 * 🛑 The acceptance test is to RUN the resolver and read what it says, never to
 * confirm a caller exists. CLAUDE.md records three separate mechanisms that
 * shipped, compiled, and did nothing — `resolvePaymentMethod` with zero
 * consumers, `persistCartEmiPlan` whose route had been deleted beneath it, and
 * `dispatchNotification`'s seller arm that every input resolved away from.
 * None would have been found by review; all three were found by execution.
 *
 * ⚠ And this file's own subject is a measured instance of the same class: the
 * tree machinery (`parentIds`, `ancestors`, `tier`, the product closure, the
 * backfill job) was complete and had never held a tree — 4,000 rows in dev-db,
 * 4,000 of them roots.
 *
 * Run: npx tsx scripts/verify-beyblade-taxonomy.mts
 */
import {
  BEYBLADE_TAXONOMY,
  INCUMBENT_SLUG_MAP,
  deriveTaxonomy,
  type TaxonomyNode,
} from "../src/seed/R1/beyblade-taxonomy";

/*
 * The 19 distinct `categorySlugs` MEASURED across the 17 production listings
 * on 2026-11-12. Hard-coded on purpose: it is the observed state the migration
 * has to account for, so if production later carries a slug that is not here,
 * the loader's own reconciliation check must fail rather than silently drop it.
 */
const MEASURED_PRODUCTION_SLUGS = [
  "category-beyblade-x",
  "category-spinning-tops",
  "category-x-tops",
  "category-x-basic",
  "category-aeropegasus-3-70a",
  "category-x-unique-ux",
  "category-x-launchers",
  "category-x-xtreme-stadiums",
  "category-x-stadiums",
  "category-x-customize-sets",
  "category-knightshield-3-80n",
  "category-x-string-launchers",
  "category-x-winders",
  "category-wizardarrow-4-80b",
  "category-valkyrievolt-s4-70v",
  "category-x-custom-cx",
  "category-elevate",
  "category-x-bits",
  "category-x-parts",
];

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const derived = deriveTaxonomy();
const bySlug = new Map(derived.map((d) => [d.slug, d]));

console.log(`\n  ${derived.length} nodes derived\n`);

/* ── 1 · the shape dev-db got wrong ──────────────────────────────────────── */
const roots = derived.filter((d) => d.tier === 0);
const brands = derived.filter((d) => d.kind === "brand");
const generationRoots = roots.filter((d) => d.axis === "generation");
const kindRoots = roots.filter((d) => d.axis === "kind");
check(
  generationRoots.length === 5,
  `5 generation roots (dev-db has 4,000 accidental ones)`,
  generationRoots.map((r) => r.slug).join(", "),
);
check(kindRoots.length === 6, "6 product-kind roots — the second axis", kindRoots.map((r) => r.slug).join(", "));

/*
 * 🛑 Every row must resolve to a facet group. A row with no axis renders in no
 * group, i.e. nowhere — and nothing errors. This is the single field that
 * decides whether a filter is visible at all.
 */
check(
  derived.every((d) => d.axis === "generation" || d.axis === "kind" || d.axis === "brand"),
  "every node resolves to exactly one facet group",
  `generation ${derived.filter((d) => d.axis === "generation").length} · kind ${
    derived.filter((d) => d.axis === "kind").length
  } · brand ${derived.filter((d) => d.axis === "brand").length}`,
);
check(
  derived.every((d) => d.tier === 0 || d.axis === bySlug.get(d.rootId)!.axis),
  "a system inherits its generation's axis",
);
check(
  derived.length - roots.length > 0,
  "the tree has children at all — the defect in dev-db",
  `${derived.length - roots.length} non-root nodes`,
);
check(brands.length === 3, "3 brand rows, all real Beyblade manufacturers", brands.map((b) => b.name).join(" · "));

/*
 * 🛑 "stick till systems and generations" is an assertion, not a guideline.
 * Depth 2 means generation → system and nothing below; a part slot creeping in
 * as a category is exactly how 24 rows become 4,000.
 */
const deepest = Math.max(...derived.map((d) => d.tier));
check(deepest === 1, "the tree stops at systems — max depth is generation → system", `deepest tier = ${deepest}`);
check(
  derived.every((d) => d.tier === 0 || d.isLeaf),
  "every system is a leaf — no part slots promoted to categories",
);

/* ── 2 · structural invariants ───────────────────────────────────────────── */
check(
  derived.every((d) => (d.tier === 0 ? d.parentIds.length === 0 : d.parentIds.length === 1)),
  "tier 0 ⇔ no parent, every other node has exactly one",
);
check(
  derived.every((d) => d.tier === 0 || (bySlug.get(d.parentIds[0]!)?.tier ?? -1) === d.tier - 1),
  "every node sits exactly one tier below its parent",
);
check(
  derived.every((d) => d.path.split("/").length === d.tier + 1 && d.path.endsWith(d.slug)),
  "`path` segment count matches `tier`, and ends at the node itself",
);
check(
  derived.every((d) => d.ancestors.length === d.tier),
  "`ancestors[]` length equals `tier` — the product breadcrumb reads this",
);
check(
  derived.every((d) => d.rootId === (d.ancestors[0]?.id ?? d.slug)),
  "`rootId` is the head of the ancestor chain",
);

/* Parent/child links must agree in BOTH directions — a one-way link is how a
 * facet finds a category that its parent does not list, so the band renders a
 * child the tree above it denies. */
check(
  derived.every((d) => d.childrenIds.every((c) => bySlug.get(c)?.parentIds[0] === d.slug)),
  "childrenIds ⇄ parentIds agree in both directions",
);
check(
  derived.every((d) => d.isLeaf === (d.childrenIds.length === 0)),
  "`isLeaf` matches the child count",
);
check(
  derived.every((d) => d.subtreeSize >= d.childrenIds.length),
  "`subtreeSize` is transitive, not just a direct-child count",
);

/* ── 3 · the R1 rules this tree has to obey ──────────────────────────────── */
check(
  new Set(derived.map((d) => d.slug)).size === derived.length,
  "slugs are unique — a collision silently merges two facets",
);
check(
  derived.every((d) => /^[a-z0-9-]+$/.test(d.slug)),
  "every slug is URL-safe (it becomes `/products?category=<slug>`)",
);
/*
 * 🛑 THE PRO SERIES INVARIANT. The wiki states it succeeds nothing and runs
 * alongside three other systems, so *"any model that renders the Hasbro
 * systems as a linear timeline must hold this one off to the side."* An absent
 * `chain` is therefore a real state, and a later edit that "tidies up" by
 * giving every row a chain position would silently assert a succession the
 * source denies.
 */
const pro = bySlug.get("burst-pro-series");
check(!!pro && pro.chain === undefined, "Pro Series carries NO chain position (the wiki says it succeeds nothing)");

/* Within one generation, declared chain positions must not collide — two
 * systems claiming the same step is a contradiction, not an ordering. */
let chainClash = 0;
for (const r of roots) {
  const kids = r.childrenIds.map((c) => bySlug.get(c)!).filter((k) => k.chain !== undefined);
  const seen = new Set<number>();
  for (const k of kids) {
    if (seen.has(k.chain!)) chainClash += 1;
    seen.add(k.chain!);
  }
}
check(chainClash === 0, "no two systems in one generation claim the same chain position");

/* Both naming lines must survive. A Hasbro-only tree would be wrong for an
 * Indian store, where import stock carries Takara Tomy names. */
const burstKids = (bySlug.get("beyblade-burst")?.childrenIds ?? []).map((c) => bySlug.get(c)!.name);
check(
  burstKids.some((n) => /Cho-Z|Superking|Dynamite|God Layer|Gatinko/.test(n)) &&
    burstKids.some((n) => /SwitchStrike|SlingShock|HyperSphere|SpeedStorm|Quad/.test(n)),
  "Burst carries BOTH the Takara Tomy and Hasbro system lines",
  `${burstKids.length} systems`,
);

/* ── 3b · THE JOIN. An unmapped or mistyped slug = a silently empty facet ── */
const unmapped = MEASURED_PRODUCTION_SLUGS.filter((s) => !(s in INCUMBENT_SLUG_MAP));
check(
  unmapped.length === 0,
  "every slug measured in production is accounted for in the map",
  unmapped.length ? `UNMAPPED: ${unmapped.join(", ")}` : `all ${MEASURED_PRODUCTION_SLUGS.length}`,
);

/*
 * 🛑 THE ONE ASSERTION THAT WOULD HAVE CAUGHT THE WHOLE CLASS. Every non-null
 * target must exist as a node in the tree. A typo here does not throw, does not
 * fail a typecheck, and does not show up in any status check — it produces a
 * product pointing at a category that does not exist, and `array-contains`
 * reports that as an empty result rather than an error.
 */
const danglingTargets = Object.entries(INCUMBENT_SLUG_MAP)
  .filter(([, to]) => to !== null)
  .filter(([, to]) => !bySlug.has(to!))
  .map(([from, to]) => `${from} → ${to}`);
check(
  danglingTargets.length === 0,
  "every mapped target resolves to a real node in the tree",
  danglingTargets.length ? `DANGLING: ${danglingTargets.join(", ")}` : "no dangling targets",
);

const dropped = Object.entries(INCUMBENT_SLUG_MAP).filter(([, to]) => to === null);
check(
  dropped.length === 6,
  "6 slugs are deliberately dropped (5 per-product rows + the catalogue root)",
  dropped.map(([k]) => k.replace("category-", "")).join(" · "),
);

/* Both axes must survive the migration, or the facet loses a dimension. */
const targets = new Set(Object.values(INCUMBENT_SLUG_MAP).filter(Boolean) as string[]);
const axisA = [...targets].filter((t) => (bySlug.get(t)!.tier === 1) || bySlug.get(t)!.slug === "beyblade-x");
const axisB = [...targets].filter((t) => ["tops", "launchers", "stadiums", "parts", "sets"].includes(t));
check(axisA.length > 0 && axisB.length > 0, "the migration preserves BOTH axes", `A: ${axisA.length} · B: ${axisB.length}`);

/* ── 4 · PROVE THE CHECKER CAN FAIL ──────────────────────────────────────── */
console.log("\n  self-tests — each must be REFUSED:");
const mustThrow = (label: string, nodes: TaxonomyNode[]) => {
  try {
    deriveTaxonomy(nodes);
    fail += 1;
    console.log(`    🛑 ACCEPTED a bad tree: ${label}`);
  } catch (e) {
    console.log(`    ✅ refused ${label} — ${(e as Error).message}`);
  }
};
mustThrow("a missing parent", [{ slug: "orphan", name: "Orphan", parent: "does-not-exist" }]);
mustThrow("a duplicate slug", [
  { slug: "dup", name: "A" },
  { slug: "dup", name: "B" },
]);
mustThrow("a 2-cycle", [
  { slug: "a", name: "A", parent: "b" },
  { slug: "b", name: "B", parent: "a" },
]);
/* The newest invariant, and the quietest one if it ever broke: a root with no
 * axis yields rows that belong to no facet group and therefore render nowhere. */
mustThrow("a root that declares no axis", [{ slug: "groupless", name: "Groupless" }]);

/* And the positive control: the real tree must NOT throw. A checker that
 * refuses everything is as useless as one that accepts everything. */
try {
  deriveTaxonomy();
  console.log("    ✅ accepted the real tree (positive control)");
} catch (e) {
  fail += 1;
  console.log(`    🛑 REFUSED the real tree — ${(e as Error).message}`);
}

/* ── the tree, printed, so a human can read what will be written ─────────── */
console.log("\n  the tree as it will be seeded:\n");
const print = (slug: string, indent: string) => {
  const n = bySlug.get(slug)!;
  const tag = n.kind === "brand" ? "  [brand]" : "";
  console.log(`  ${indent}${n.name}${tag}`);
  for (const c of n.childrenIds) print(c, indent + "   ");
};
for (const r of roots) print(r.slug, "");

console.log(`\n${fail === 0 ? "✅ taxonomy holds" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
