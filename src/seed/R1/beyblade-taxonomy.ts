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
    chain: 4,
    blurb: "The current generation — the Xtreme Gear rail and the X-Celerator Gear System.",
  },
  {
    slug: "beyblade-burst",
    name: "Beyblade Burst",
    featured: true,
    chain: 3,
    blurb: "Burst finishes, and the generation with the most systems of any.",
  },
  {
    slug: "metal-saga",
    name: "Metal Saga",
    featured: true,
    chain: 2,
    blurb: "Metal Fight Beyblade — the metal-wheel generation.",
  },
  {
    slug: "original-series",
    name: "Original Series",
    featured: true,
    chain: 1,
    blurb: "Bakuten Shoot Beyblade — where it started, through to Hard Metal System.",
  },
  {
    slug: "spin-offs",
    name: "Spin-offs",
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
    kind: "brand",
    featured: true,
    blurb: "The originator. Japanese releases, and the reference for system and part naming.",
  },
  {
    slug: "hasbro",
    name: "Hasbro",
    kind: "brand",
    featured: true,
    blurb: "International releases. Names and some moulds differ from Takara Tomy.",
  },
  { slug: "sonokong", name: "Sonokong", kind: "brand", blurb: "Korean releases." },
];

/** What `deriveTaxonomy` returns — the structural half of the stored shape. */
export interface DerivedTaxonomyNode extends TaxonomyNode {
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
    return {
      ...n,
      rootId: chain[0] ?? n.slug,
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
