/*
 * R1 CATALOGUE TAXONOMY — generations and systems. Nothing deeper.
 *
 * Owner, 2026-11-12: *"no need to have all 4000, just stick till systems and
 * generations"* · *"we are building categories not products"* · *"take help
 * from the wiki."*
 *
 * ## WHY THIS FILE EXISTS, measured 2026-11-12
 *
 *   · production `categories` = **0 documents**. The homepage category band,
 *     the brand tiles and every `/products` facet therefore render nothing —
 *     which is the whole reason the storefront reads as 3 of 12 mock sections.
 *   · dev-db `categories` = **4,000 documents, 4,000 of them ROOTS, zero
 *     children.** The tree machinery has never held a tree: every row is
 *     `tier: 0` with no `parentIds`.
 *   · and its contents are the wrong vertical — `Bandai · Banpresto ·
 *     Bushiroad · Funskool · Hot Wheels · Mattel · McFarlane · Mezco`.
 *
 * 🛑 NOTHING IN THE CODE WAS MISSING. `parentIds[]`, `ancestors[]`, `tier`,
 * `path`, the product-side closure in `categorySlugs[]` and the
 * `categoryTaxonomyBackfill` job that repairs that closure when a subtree
 * moves are all already built and already correct. This is a DATA gap wearing
 * the costume of a feature gap — there is nothing to design, only something to
 * populate.
 *
 * ## 📚 PROVENANCE — this is the WIKI's taxonomy, not a remembered one
 *
 * Every generation and system name below is lifted from `beydatabase`
 * (wiki.letitrip.in), which is the researched reference:
 *
 *   · generations  ← `beydatabase/src/lib/generation.ts` → `GENERATIONS`
 *   · systems      ← `beydatabase/out/systems-resolved.jsonl` (56 records,
 *                     each carrying `generation`, `chainPosition`, `slots`,
 *                     `introduced`, `supersededBy` and quoted evidence)
 *
 * ⚠ That corpus is RESEARCH OUTPUT, not a clean table: names repeat across
 * reader passes, and its `generation` field sometimes carries a whole
 * sentence of qualification (*"…— the LAST system of it"*). It was distilled
 * by hand rather than imported, which is why this file is a literal.
 *
 * 🛑 TWO THINGS THE WIKI CORRECTED, both of which I would have got wrong:
 *
 * 1. **`seed/series.json` is NOT the shop taxonomy.** All 18 of its rows are
 *    `kind: "Season"` — ANIME seasons. "Beyblade X (Season 2)" is not
 *    something anyone shops for, so a tree built from that file would have
 *    looked authoritative and been useless.
 * 2. **Pro Series is not in the Hasbro chain.** The corpus flags it
 *    explicitly: the other six form a strict succession and *"Pro Series runs
 *    ALONGSIDE three of them … and succeeds nothing. Any model that renders
 *    the Hasbro systems as a linear timeline must hold this one off to the
 *    side."* It is therefore declared with no chain position.
 *
 * ## 🛑 A TREE, BUT DELIBERATELY NOT A SET OF PAGES
 *
 * Owner: *"allow the proper tree but make it non pages so basic functionality
 * for the search and the filter facet work."*
 *
 * Those halves are independent, and it is worth saying why — because the
 * natural implementation of "no category pages" is to delete the category
 * data, and that is the mistake:
 *
 *   · **The TREE is data.** It drives the facet, the breadcrumb on a product,
 *     the homepage band and the search index. All of that is read through
 *     `categorySlugs` / `parentIds`, none of it through a URL.
 *   · **The PAGES are a surface**, closed by `browsePages.categories: false`,
 *     which `guardBrowsePage` turns into `notFound()` for the whole subtree.
 *     `/categories/<slug>` 404s BY DECISION (CLAUDE.md records it as a stated
 *     exception to never-drop-SEO, on the measured grounds that the 4,658
 *     category pages were empty).
 *
 * ✅ So a category is exactly what R1 says a store, brand and franchise are:
 * **a filter on `/products`, never a destination.**
 *
 * ## 🛑 EVERYTHING DERIVABLE IS DERIVED — see `deriveTaxonomy`
 *
 * These rows declare only what a human can know: slug, name, parent, kind,
 * copy. `rootId`, `tier`, `path`, `childrenIds`, `isLeaf`, `position`,
 * `subtreeSize` and the `ancestors[]` chain are COMPUTED from the parent links.
 *
 * Hand-writing those is how a taxonomy drifts, and this repo has paid for the
 * general lesson: an insert at order 10 in the homepage seed renumbered
 * nothing and produced two sections on one order, and `appkit-seed load` uses
 * `set({merge:true})` so it *cannot* remove a field that has gone stale. A
 * derived field cannot disagree with the structure it came from.
 */
import type { CategoryType } from "../../features/categories/types";

/** The only thing a human declares. Everything else is computed. */
export interface TaxonomyNode {
  slug: string;
  name: string;
  /** Parent slug. `undefined` = a tier-0 root. */
  parent?: string;
  /** Defaults to `"category"`. Brands share the collection, discriminated. */
  kind?: CategoryType;
  /**
   * Which facet GROUP this row belongs to.
   *
   * 🛑 DECLARED, never inferred. The facet UI has to render "Generation" and
   * "Type" as two separate groups — a single flat list of 11 roots mixing
   * `Beyblade X` with `Stadiums` is not a filter, it is a pile. Inferring the
   * group from `tier` or from a hardcoded slug list is what makes adding a row
   * a code change, which is the thing this project's governing principle
   * forbids.
   *
   * Inherited by children: a system's axis is its generation's.
   */
  axis?: "generation" | "kind" | "brand";
  /** Surfaces on the homepage band / brand tiles. */
  featured?: boolean;
  /** One line. Becomes the meta description and the facet tooltip. */
  blurb?: string;
  /**
   * Position in its generation's succession, from the wiki's `chainPosition`.
   *
   * 🛑 ABSENT MEANS "NOT IN THE CHAIN", which is a real state and not missing
   * data — see the Pro Series note above. A reader must not infer order from
   * declaration index for these.
   */
  chain?: number;
}

/*
 * ── THE TREE — two levels, and that is the whole of it ──────────────────────
 *
 * generation → system. 4 product generations + spin-offs, ~24 systems.
 *
 * ⚠ Part SLOTS (Blade/Ratchet/Bit, Layer/Disc/Driver, Face/Energy Ring/Fusion
 * Wheel/Spin Track/Performance Tip) are deliberately NOT categories. They are
 * a property of a product within a system — the wiki models them as `slots` ON
 * a system record, and that is the right place. Promoting them to categories
 * is what turns 24 rows into 4,000.
 */
export const BEYBLADE_TAXONOMY: TaxonomyNode[] = [
  /* ── tier 0 · the four product generations, newest first ──────────────────
   * Newest first is also the facet order: a buyer arriving today is far more
   * likely to want X than the 1999 plastic line.
   *
   * ⚠ The wiki's `GENERATIONS` has six members; two are not generations.
   * "Across generations" is a MARKER for a row that spans several, and
   * "Spin-offs" is a real bucket but not a succession — both are handled
   * accordingly rather than copied in blindly.
   */
  {
    slug: "beyblade-x",
    name: "Beyblade X",
    featured: true,
    axis: "generation",
    chain: 4,
    blurb: "The current generation — the Xtreme Gear rail and the X-Celerator Gear System.",
  },
  {
    slug: "beyblade-burst",
    name: "Beyblade Burst",
    featured: true,
    axis: "generation",
    chain: 3,
    blurb: "Burst finishes, and the generation with the most systems of any.",
  },
  {
    slug: "metal-saga",
    name: "Metal Saga",
    featured: true,
    axis: "generation",
    chain: 2,
    blurb: "Metal Fight Beyblade — the metal-wheel generation.",
  },
  {
    slug: "original-series",
    name: "Original Series",
    featured: true,
    axis: "generation",
    chain: 1,
    blurb: "Bakuten Shoot Beyblade — where it started, through to Hard Metal System.",
  },
  {
    slug: "spin-offs",
    name: "Spin-offs",
    axis: "generation",
    blurb: "BeyWheelz, BeyWarriors and BeyRaiderz — related lines, outside the main succession.",
  },

  /* ── Beyblade X · systems ────────────────────────────────────────────────
   * 🛑 BX / UX / CX are PRODUCT-CODE families, not systems — the wiki records
   * them as such ("BX / UX / CX product-code families"), so they are not rows
   * here. They belong on a product as a code, which is also how a buyer
   * searches for them.
   */
  { slug: "x-basic-line", name: "Basic Line", parent: "beyblade-x", chain: 1 },
  { slug: "x-unique-line", name: "Unique Line", parent: "beyblade-x", chain: 2 },
  { slug: "x-custom-line", name: "Custom Line", parent: "beyblade-x", chain: 3 },
  {
    slug: "x-celerator-gear",
    name: "X-Celerator Gear System",
    parent: "beyblade-x",
    blurb: "The Xtreme Dash rail mechanism the generation is built around.",
  },

  /* ── Beyblade Burst · systems ────────────────────────────────────────────
   * Both naming lines are kept, because a buyer in India meets both: Hasbro
   * names on international stock, Takara Tomy names on import and in every
   * collector discussion. The wiki corpus carries both.
   *
   * 🛑 Takara Tomy and Hasbro are NOT translations of one another — the
   * generations diverge in which systems exist at all, so these are siblings
   * rather than one list with alternate labels.
   */
  { slug: "burst-single-dual-layer", name: "Burst (Single / Dual Layer)", parent: "beyblade-burst", chain: 1 },
  { slug: "burst-god-layer", name: "God Layer System", parent: "beyblade-burst", chain: 2 },
  { slug: "burst-cho-z", name: "Cho-Z System", parent: "beyblade-burst", chain: 3 },
  { slug: "burst-gatinko", name: "Gatinko System", parent: "beyblade-burst", chain: 4 },
  { slug: "burst-superking", name: "Superking / Sparking System", parent: "beyblade-burst", chain: 5 },
  { slug: "burst-dynamite-battle", name: "Dynamite Battle System", parent: "beyblade-burst", chain: 6 },
  /* The Hasbro succession — stated in the corpus as a strict chain. */
  { slug: "burst-switchstrike", name: "SwitchStrike System", parent: "beyblade-burst" },
  { slug: "burst-slingshock", name: "SlingShock System", parent: "beyblade-burst" },
  { slug: "burst-hypersphere", name: "HyperSphere System", parent: "beyblade-burst" },
  { slug: "burst-speedstorm", name: "SpeedStorm System", parent: "beyblade-burst" },
  { slug: "burst-quaddrive", name: "QuadDrive System", parent: "beyblade-burst" },
  { slug: "burst-quadstrike", name: "QuadStrike System", parent: "beyblade-burst" },
  {
    slug: "burst-pro-series",
    name: "Pro Series",
    parent: "beyblade-burst",
    /* 🛑 NO `chain` — see the file header. The wiki states it succeeds nothing
     * and runs alongside Surge, QuadDrive and QuadStrike. */
    blurb: "Runs alongside the main succession rather than inside it.",
  },

  /* ── Metal Saga · systems ────────────────────────────────────────────────
   * ⚠ "Arrangement System" is in the corpus as ANIME-ONLY (Metal Masters), and
   * "Performance Top System" is flagged there as meaning two different things
   * in two generations — marketing copy in Burst "with no architecture behind
   * it". Neither is a thing to sell, so neither is a category.
   */
  { slug: "mfb-metal-system", name: "Metal System", parent: "metal-saga", chain: 1 },
  { slug: "mfb-hybrid-wheel", name: "Hybrid Wheel System", parent: "metal-saga", chain: 2 },
  { slug: "mfb-4d", name: "4D System", parent: "metal-saga", chain: 3 },
  { slug: "mfb-synchrome", name: "Synchrome System", parent: "metal-saga", chain: 4 },
  {
    slug: "mfb-extreme-top",
    name: "Extreme Top System",
    parent: "metal-saga",
    blurb: "Hasbro's western naming for the generation's releases.",
  },

  /* ── Original Series · systems ──────────────────────────────────────────
   * The wiki is explicit that Hard Metal System is "the LAST system of it" and
   * that "Plastic Beyblade" denotes everything in the generation EXCEPT
   * Hard/Heavy Metal — so the two are not siblings in the obvious way. Only
   * the concrete architectures are rows; the umbrella term is not.
   */
  { slug: "og-4-layer", name: "4 Layer System", parent: "original-series", chain: 1 },
  { slug: "og-spin-gear", name: "Spin Gear System", parent: "original-series", chain: 2 },
  { slug: "og-magnacore", name: "Magnacore System", parent: "original-series", chain: 3 },
  { slug: "og-engine-gear", name: "Engine Gear System", parent: "original-series", chain: 4 },
  {
    slug: "og-hard-metal",
    name: "Hard Metal System",
    parent: "original-series",
    chain: 5,
    blurb: "HMS — the final architecture of the first generation.",
  },

  /* ══ AXIS B · PRODUCT KIND ═══════════════════════════════════════════════
   *
   * 🛑 A SECOND AXIS, found by reading the real products rather than by design
   * — and dropping it would have destroyed live categorisation.
   *
   * Measured on the 17 production listings: they carry slugs from TWO
   * independent axes at once. `category-beyblade-x` + `category-x-unique-ux`
   * is generation→system; `category-x-tops`, `category-x-launchers`,
   * `category-x-stadiums`, `category-x-parts`, `category-x-customize-sets` is
   * *what kind of thing it is*. A stadium is not a system of anything, and a
   * launcher belongs to no generation's succession.
   *
   * ✅ Keeping them as a SECOND SHALLOW TREE rather than nesting them under
   * each generation is what keeps the owner's depth rule intact. Nesting would
   * give `beyblade-x → x-tops → …` (depth 2, and the same rows repeated per
   * generation — 5 generations × 5 kinds is how a taxonomy starts multiplying).
   * Two flat axes stay depth-1 and compose at QUERY time: a buyer filters
   * `?category=beyblade-x&category=launchers` and gets X launchers, with no
   * row for that intersection existing anywhere.
   *
   * ⚠ This is also why the five per-product rows in production
   * (`category-aeropegasus-3-70a`, `category-knightshield-3-80n`,
   * `category-wizardarrow-4-80b`, `category-valkyrievolt-s4-70v`,
   * `category-elevate`) are DROPPED and not migrated: a category with exactly
   * one product, named after that product, is a product wearing a category's
   * clothes. Four thousand of those is the state dev-db is in.
   */
  { slug: "tops", axis: "kind", name: "Beyblades", featured: true, blurb: "Complete spinning tops, ready to battle." },
  { slug: "launchers", axis: "kind", name: "Launchers & Winders", featured: true, blurb: "String launchers, winders and grips." },
  { slug: "stadiums", axis: "kind", name: "Stadiums", featured: true, blurb: "Beystadiums, including Xtreme stadiums." },
  { slug: "parts", axis: "kind", name: "Parts & Spares", featured: true, blurb: "Individual parts for customising and repair." },
  { slug: "sets", axis: "kind", name: "Sets & Bundles", blurb: "Customise sets and multi-item bundles." },
  { slug: "accessories", axis: "kind", name: "Accessories", blurb: "Maintenance, storage and tools." },

  /* ── BRANDS — same collection, discriminated by `categoryType` ────────────
   * 🛑 `brandId` DOES NOT EXIST and must not be added. CLAUDE.md records the
   * measurement: `franchiseId` is 0/0 and `brandId` is 1/29, because *"a
   * franchise row IS a category (`categoryType: 'franchise'`)"* — and a brand
   * likewise. `categoryId` already carries all three kinds, so a parallel
   * identifier would be two ways to say one thing and a second source of
   * truth to drift.
   */
  {
    slug: "takara-tomy",
    name: "Takara Tomy",
    kind: "brand", axis: "brand",
    featured: true,
    blurb: "The originator. Japanese releases, and the reference for system and part naming.",
  },
  {
    slug: "hasbro",
    name: "Hasbro",
    kind: "brand", axis: "brand",
    featured: true,
    blurb: "International releases. Names and some moulds differ from Takara Tomy.",
  },
  { slug: "sonokong", name: "Sonokong", kind: "brand", axis: "brand", blurb: "Korean releases." },
];

/*
 * ── THE INCUMBENT VOCABULARY, and why a rewrite is owed ─────────────────────
 *
 * 🛑 THIS MAP IS THE DIFFERENCE BETWEEN A WORKING FACET AND AN EMPTY ONE, and
 * it was nearly missed. The tree above uses clean slugs (`beyblade-x`); the 17
 * real production listings carry `category-beyblade-x`. Seeding the tree
 * without reconciling the two would have produced the project's signature
 * failure in its purest form: 35 categories written successfully, every
 * product still pointing at slugs no category has, and therefore a facet that
 * returns nothing while every status check reads green.
 *
 * ⚠ It is only visible by joining the two sides. `categorySlugs` is matched
 * with `array-contains`, which cannot report "no such category" — it reports
 * an empty result, indistinguishable from "no products in this category".
 * That is the same silent-empty shape CLAUDE.md records for the missing index
 * that made every contest entry invisible.
 *
 * Every key below was MEASURED from production, not assumed — see the counts
 * in the loader's output. `null` means *deliberately dropped*: a category
 * named after a single product is a product, and migrating it would carry the
 * 4,000-row pattern into the new tree.
 */
export const INCUMBENT_SLUG_MAP: Record<string, string | null> = {
  /* Axis A — generation and system. */
  "category-beyblade-x": "beyblade-x",
  "category-x-basic": "x-basic-line",
  "category-x-unique-ux": "x-unique-line",
  "category-x-custom-cx": "x-custom-line",

  /* Axis B — product kind. Note the collapses: `x-string-launchers` and
   * `x-winders` both fold into `launchers`, and `x-xtreme-stadiums` into
   * `stadiums`. The X-specific half of each name is already carried by the
   * generation slug on the same product, so keeping it twice would be the
   * duplicate-vocabulary defect this project keeps paying for. */
  "category-x-tops": "tops",
  "category-x-launchers": "launchers",
  "category-x-string-launchers": "launchers",
  "category-x-winders": "launchers",
  "category-x-stadiums": "stadiums",
  "category-x-xtreme-stadiums": "stadiums",
  "category-x-parts": "parts",
  "category-x-bits": "parts",
  "category-x-customize-sets": "sets",

  /* 🛑 The catalogue root. Every product carried it (17/17) and it has no
   * counterpart: with two axes there is no single "everything" node, and
   * `/products` with no filter already is that page. A root category whose
   * only property is "contains the entire catalogue" earns nothing and makes
   * every closure one element longer. */
  "category-spinning-tops": null,

  /* Products masquerading as categories — 1 to 3 listings each, named after
   * the listing. Dropped. */
  "category-aeropegasus-3-70a": null,
  "category-knightshield-3-80n": null,
  "category-wizardarrow-4-80b": null,
  "category-valkyrievolt-s4-70v": null,
  "category-elevate": null,
};

/** What `deriveTaxonomy` returns — the structural half of the stored shape. */
export interface DerivedTaxonomyNode extends TaxonomyNode {
  /** Resolved, never optional — inherited from the root when not declared. */
  axis: NonNullable<TaxonomyNode["axis"]>;
  rootId: string;
  parentIds: string[];
  childrenIds: string[];
  tier: number;
  path: string;
  order: number;
  position: number;
  isLeaf: boolean;
  subtreeSize: number;
  /** Root → parent, in order. The product breadcrumb and facet label read this. */
  ancestors: { id: string; name: string }[];
}

/**
 * Compute every structural field from the parent links.
 *
 * 🛑 THROWS on a bad tree rather than writing one. A cycle or a missing parent
 * produces a row that *looks* valid — `tier: 0`, no `parentIds` — and is then
 * indistinguishable from a deliberate root, which is exactly the state dev-db
 * is in today with 4,000 accidental roots. There is no safe degrade for a
 * malformed taxonomy at SEED time.
 *
 * ⚠ Note the asymmetry with the runtime rule ("unknown values degrade, never
 * throw"). That governs READING admin-written config against a possibly-older
 * deploy. This is a BUILD-time check over a literal in the repository, where a
 * throw costs a failed seed run and a silent pass costs a broken facet nobody
 * notices.
 */
export function deriveTaxonomy(nodes: TaxonomyNode[] = BEYBLADE_TAXONOMY): DerivedTaxonomyNode[] {
  const bySlug = new Map<string, TaxonomyNode>();
  for (const n of nodes) {
    if (bySlug.has(n.slug)) throw new Error(`[taxonomy] duplicate slug: ${n.slug}`);
    bySlug.set(n.slug, n);
  }

  /* Every declared parent must exist, or the child becomes a silent root. */
  for (const n of nodes) {
    if (n.parent && !bySlug.has(n.parent)) {
      throw new Error(`[taxonomy] "${n.slug}" names a parent that does not exist: "${n.parent}"`);
    }
  }

  /* Walk to the root. The depth cap doubles as the cycle detector. */
  const chainOf = (slug: string): string[] => {
    const chain: string[] = [];
    let cur = bySlug.get(slug)?.parent;
    while (cur) {
      if (chain.includes(cur)) throw new Error(`[taxonomy] cycle through "${cur}"`);
      chain.unshift(cur);
      if (chain.length > 12) throw new Error(`[taxonomy] chain deeper than 12 at "${slug}"`);
      cur = bySlug.get(cur)?.parent;
    }
    return chain;
  };

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent) continue;
    childrenOf.set(n.parent, [...(childrenOf.get(n.parent) ?? []), n.slug]);
  }

  /* Transitive descendant count, memoised. */
  const sizeCache = new Map<string, number>();
  const subtreeSize = (slug: string): number => {
    const hit = sizeCache.get(slug);
    if (hit !== undefined) return hit;
    const kids = childrenOf.get(slug) ?? [];
    const total = kids.reduce((acc, k) => acc + 1 + subtreeSize(k), 0);
    sizeCache.set(slug, total);
    return total;
  };

  /*
   * `position` is the index among SIBLINGS; `order` is declaration order,
   * which is the facet order a buyer sees. Two different jobs — collapsing
   * them is what makes a reorder inside one branch renumber an unrelated one.
   */
  const siblingIndex = new Map<string, number>();
  for (const [, kids] of childrenOf) kids.forEach((k, i) => siblingIndex.set(k, i));
  nodes.filter((n) => !n.parent).forEach((n, i) => siblingIndex.set(n.slug, i));

  return nodes.map((n, i) => {
    const chain = chainOf(n.slug);
    const kids = childrenOf.get(n.slug) ?? [];
    const rootId = chain[0] ?? n.slug;

    /*
     * A system inherits its generation's axis. 🛑 Resolved to a REQUIRED value
     * rather than left optional: an `undefined` axis means the facet UI has no
     * group to put the row in, and a row in no group renders nowhere — the
     * silent-omission failure, on the one field that decides whether a filter
     * is visible at all. A root that declares no axis is a bug in the literal,
     * so it throws here rather than disappearing from a facet later.
     */
    const axis = n.axis ?? bySlug.get(rootId)?.axis;
    if (!axis) throw new Error(`[taxonomy] "${n.slug}" resolves to no axis (root "${rootId}" declares none)`);

    return {
      ...n,
      axis,
      rootId,
      parentIds: n.parent ? [n.parent] : [],
      childrenIds: kids,
      tier: chain.length,
      path: [...chain, n.slug].join("/"),
      order: i,
      position: siblingIndex.get(n.slug) ?? 0,
      isLeaf: kids.length === 0,
      subtreeSize: subtreeSize(n.slug),
      ancestors: chain.map((s) => ({ id: s, name: bySlug.get(s)?.name ?? s })),
    };
  });
}
