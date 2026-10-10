/*
 * WHY: The seed shipped 47 nodes across 2 roots, all Beyblade — which made
 *      every competitor-measured price band unseedable, left `live` listings
 *      with nowhere to file, and meant no page had ever rendered a tier-4
 *      rollup. A 15-site crawl (~25,900 listings) supplied the taxonomy spine;
 *      the only competitor with a real tree uses OUR axis, generation ->
 *      part-family -> line, so this deepens that axis rather than rotating it.
 * WHAT: The authoring literal for a 6-root forest. Structural fields
 *       (parentIds/ancestors/tier/path/position/subtreeSize/isLeaf/childrenIds)
 *       are derived by `buildCategoryTree`, never written here.
 *
 * EXPORTS:
 *   CATEGORY_FOREST — nested CategoryTreeNode[] consumed by categories-seed-data
 *
 * ## Three structural decisions worth knowing before editing this
 *
 * 1. LAUNCHERS, PARTS AND STADIUMS ARE PER GENERATION. A BX-10 Xtreme Stadium
 *    is a Beyblade X product; a BB-10 Attack Type is Metal Fight. The old seed
 *    had one `battle-gear` bucket holding all of them, which forces a buyer
 *    shopping Beyblade X to filter a list that is mostly not for their beys.
 *    worldhobbyshop agrees in PROSE while being unable to express it — its
 *    single "Stadiums & Arenas" category describes itself as covering "all
 *    generations", the split stated in the description because WooCommerce's
 *    flat taxonomy could not hold it. What remains cross-generation is the
 *    genuinely universal gear, and that is `category-accessories`.
 *
 * 2. A NAMED MODEL IS A PLAIN CATEGORY LEAF, `categoryType` OMITTED. Not
 *    `categoryType:"sublisting"`, which opts out of every path that works:
 *    `deriveTaxonomy` never reads `sublistingCategoryId`,
 *    `countersReconcile` leaves `metrics.productCount` at 0 forever (the page
 *    renders "Browse all 0 listings"), and `NON_LISTING_CATEGORY_TYPES`
 *    excludes it from the sitemap. The model leaves come from
 *    `./category-models` and are GENERATED from B4's canonical corpus — a slug
 *    is a document id, a URL and a searchTxt source, so it is the one field
 *    that cannot be quietly corrected later.
 *
 * 3. ONE CHAIN PER PRODUCT, SO ONLY ONE AXIS CAN BE THE TREE. `categoriesIn`
 *    is `array-contains-any`, capped at 30 values, and a product carries its
 *    FULL ancestor chain — so a category page matches on its own id alone and
 *    depth costs nothing. Release type, authenticity, language, grade, scale
 *    and chase status are therefore `productFeatures`, never nodes. See
 *    `product-features-seed-data.ts`.
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:derived
 * @tag access:server-only
 * @tag consumers:seed/categories-seed-data.ts
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../../features/categories/schemas";
import type { CategoryDescriptionTemplate } from "../../features/categories/schemas/category-content";
import type { CategoryTreeNode } from "./category-tree";
import { MODEL_LEAVES } from "./category-models";
import {
  COLLECTIBLE_TEMPLATES,
  PART_TEMPLATES,
  SEALED_TEMPLATES,
  accessoryDefaults,
  beyDefaults,
  diecastDefaults,
  figureDefaults,
  launcherDefaults,
  livingDefaults,
  marketBand,
  partDefaults,
  stadiumDefaults,
  tcgDefaults,
} from "./category-content";
import { seedPhoto } from "./media";

const cover = (slug: string) => seedPhoto(`category-image-${slug}-20260101`, 1200, 600);

/**
 * A tier-3 line that owns named-model leaves.
 *
 * 🛑 `MODEL_LEAVES[id] ?? []` is a real guard, not defensive noise: the map is
 * generated from the canonical corpus, and a line whose every candidate landed
 * on B4's review list legitimately has none. A missing key must produce an
 * empty line, never a crash — but a line that is MEANT to have models and
 * silently has none is the failure this cannot see, which is why the seed
 * asserts `MODEL_LEAF_COUNT` against what it actually spread.
 */
function line(
  id: string,
  name: string,
  description: string,
  defaults: CategoryDocument["productDefaults"],
  templates: CategoryDescriptionTemplate[],
): CategoryTreeNode {
  return {
    id,
    name,
    description,
    extra: { productDefaults: defaults, descriptionTemplates: templates },
    children: MODEL_LEAVES[id] ?? [],
  };
}

/** A node with defaults but no model children. */
function node(
  id: string,
  name: string,
  description: string,
  defaults?: CategoryDocument["productDefaults"],
  templates?: CategoryDescriptionTemplate[],
  children?: CategoryTreeNode[],
): CategoryTreeNode {
  const extra: Partial<CategoryDocument> = {};
  if (defaults) extra.productDefaults = defaults;
  if (templates) extra.descriptionTemplates = templates;
  return {
    id,
    name,
    description,
    ...(Object.keys(extra).length ? { extra } : {}),
    ...(children ? { children } : {}),
  };
}

/** A branch node — grouping only, no products file directly under it. */
function branch(
  id: string,
  name: string,
  description: string,
  children: CategoryTreeNode[],
): CategoryTreeNode {
  return { id, name, description, children };
}

// ═════════════════════════════════════════════════════════════════════════════
// Root 1 — Spinning Tops
// ═════════════════════════════════════════════════════════════════════════════

const BEYBLADE_ORIGINAL: CategoryTreeNode = {
  id: "category-beyblade-original",
  name: "Beyblade Original",
  description:
    "The original Beyblade series (1999–2003) by Takara — Plastic Generation tops, Spin Gear, Magnacore, Engine Gear and HMS, with the ripcord launchers that started the franchise.",
  extra: {
    display: { icon: "🪀", coverImage: cover("beyblade-original"), color: "#b45309", showInMenu: true, showInFooter: false },
    contentBody: `<p>The original Beyblade line ran from 1999 to 2003 and moved through four part systems in four years. Each one changed what a top could do, and each one is a separate shelf here because the parts do not interchange.</p>
<p><strong>Spin Gear System</strong> was the first — an Attack Ring, a Weight Disk, a Blade Base and a spin gear that set direction. <strong>Magnacore</strong> added magnets to the base, pulling a top toward or away from the stadium centre. <strong>Engine Gear</strong> put a wound spring inside the top that released mid-battle. <strong>Heavy Metal System</strong>, the 2003 finale, replaced the plastic core with metal throughout and is the most expensive original-era line on this site by a wide margin — a reflection of how few survive in playable condition.</p>
<p>Browse by system above, or go straight to a model. Loose <a href="/categories/category-original-parts">Attack Rings, Weight Disks and Blade Bases</a> are listed separately for rebuilds, and <a href="/categories/category-original-launchers">ripcord launchers and winders</a> are their own shelf because an original-era launcher drives nothing from a later generation.</p>`,
    highlights: [
      "The tops that started it all in 1999, split by the four part systems that actually differ",
      "Loose Attack Rings, Weight Disks and Blade Bases for rebuilding a vintage combo",
      "HMS sealed pieces are the single highest-value Beyblade tier on the site",
    ],
    faqs: [
      { question: "Will an original-series top work with a Burst or X launcher?", answer: "No — every generation changed the launcher prongs and the lock. An original-series top needs an original-series ripcord launcher." },
      { question: "How do I tell a genuine Takara release from a reproduction?", answer: "Check the base stamp and the sticker finish under good light, and compare the weight: reproductions are almost always lighter. Every listing here states its authenticity, and a reproduction is labelled as one." },
      { question: "What is the difference between Spin Gear, Magnacore and Engine Gear?", answer: "They are three generations of the same slot. Spin Gear (2000) set spin direction; Magnacore (2002) added a magnet to pull the top toward or away from the stadium centre; Engine Gear (2003) added a wound spring that released mid-battle. Parts are not interchangeable between them." },
    ],
  },
  children: [
    branch("category-original-tops", "Original Tops", "Complete original-series Beyblades, from the first Spin Gear releases through HMS.", [
      line("category-original-plastic-gen", "Plastic Generation", "The earliest 1999–2000 plastic-series releases, before the Spin Gear system was formalised.", beyDefaults("category-original-plastic-gen", "Beyblade (Original)", "Plastic Generation"), COLLECTIBLE_TEMPLATES),
      line("category-original-spin-gear", "Spin Gear System", "The 2000–2001 Spin Gear releases — the system that set the Attack Ring / Weight Disk / Blade Base template.", beyDefaults("category-original-spin-gear", "Beyblade (Original)", "Spin Gear System"), COLLECTIBLE_TEMPLATES),
      line("category-original-magnacore", "Magnacore System", "The 2002 V-Force Magnacore line, with magnets in the base that pull a top toward or away from the stadium centre.", beyDefaults("category-original-magnacore", "Beyblade V-Force", "Magnacore System"), COLLECTIBLE_TEMPLATES),
      line("category-original-engine-gear", "Engine Gear System", "The 2003 G-Revolution Engine Gear line — a wound spring inside the top that releases mid-battle.", beyDefaults("category-original-engine-gear", "Beyblade G-Revolution", "Engine Gear System"), COLLECTIBLE_TEMPLATES),
      line("category-original-hms", "Heavy Metal System", "The 2003 HMS line — metal throughout, the last and heaviest of the original generation, and the highest-value tier here.", beyDefaults("category-original-hms", "Beyblade HMS", "Heavy Metal System"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-original-parts", "Original Parts", "Loose Attack Rings, Weight Disks and Blade Bases for rebuilding an original-era combo.", [
      node("category-original-attack-rings", "Attack Rings", "The upper contact ring — what actually strikes an opponent, and the part that decides a combo's attack profile.", partDefaults("category-original-attack-rings", "Attack Ring"), PART_TEMPLATES),
      node("category-original-weight-disks", "Weight Disks", "The metal disk between ring and base. Heavier disks buy stamina; lighter ones buy speed.", partDefaults("category-original-weight-disks", "Weight Disk"), PART_TEMPLATES),
      node("category-original-blade-bases", "Blade Bases", "The bottom assembly — tip shape, spin gear housing and, on later systems, the magnet or engine.", partDefaults("category-original-blade-bases", "Blade Base"), PART_TEMPLATES),
    ]),
    branch("category-original-launchers", "Original Launchers", "Ripcord launchers, grips and winders for original-series tops.", [
      node("category-original-ripcord-launchers", "Ripcord Launchers", "The classic pull-cord launchers used across the original series.", launcherDefaults("category-original-ripcord-launchers", "Beyblade (Original)"), PART_TEMPLATES),
      node("category-original-winders", "Winders & Ripcords", "Replacement ripcords and winders. A wear part — the first thing to fail on a vintage launcher.", launcherDefaults("category-original-winders", "Beyblade (Original)"), PART_TEMPLATES),
    ]),
    branch("category-original-stadiums", "Original Stadiums", "Bakuten-era stadiums and arenas, sized for original-series play.", [
      node("category-original-bakuten-arena", "Bakuten Arenas", "The standard round dishes of the original era, including the tournament-sized Bakuten arenas.", stadiumDefaults("category-original-bakuten-arena", "Beyblade (Original)"), SEALED_TEMPLATES),
      node("category-original-attack-stadium", "Attack Stadiums", "Shallower, faster dishes that keep tops in contact rather than circling.", stadiumDefaults("category-original-attack-stadium", "Beyblade (Original)"), SEALED_TEMPLATES),
    ]),
  ],
};

const BEYBLADE_METAL: CategoryTreeNode = {
  id: "category-beyblade-metal",
  name: "Beyblade Metal Fight",
  description:
    "The Metal Fight era (2008–2013) — Metal System, Metal Fusion, Metal Masters, Metal Fury's 4D system and Shogun Steel. Metal-weighted tops with a four-part swappable system.",
  extra: {
    display: { icon: "⚙️", coverImage: cover("beyblade-metal"), color: "#64748b", showInMenu: true, showInFooter: false },
    contentBody: `<p>Metal Fight ran from 2008 to 2013 and is the generation that made Beyblade a tuning game. A top is four parts — a Face Bolt, an Energy Ring, a Fusion Wheel and a Spin Track with a Performance Tip — and every one of them is sold loose here, which is why this branch has more part listings than complete tops.</p>
<p>The code after a name is the build. <strong>105RF</strong> means a 105-height Spin Track and a Rubber Flat tip: tall enough to clear a dish's slope, with rubber for aggressive floor contact. <strong>145WD</strong> is taller again with a Wide Defense tip, which trades speed for the ability to survive being hit. Reading those codes is most of what separates a casual buyer from a competitive one, and our <a href="/categories/category-metal-parts">parts shelf</a> is organised by them.</p>
<p>Four sub-generations sit above: <strong>Metal System</strong> (the 2008 debut), <strong>Metal Fusion</strong> and <strong>Metal Masters</strong> on the Hybrid Wheel System, <strong>Metal Fury</strong> on the heavier 4D system, and <strong>Shogun Steel</strong> / Zero-G, which added a rocking stadium and tops built for it.</p>`,
    highlights: [
      "Metal-weighted tops with a genuinely deep four-part tuning system",
      "The only generation where loose parts outnumber complete tops — Energy Rings, Fusion Wheels, Spin Tracks and Tips all listed individually",
      "Covers all five sub-generations: Metal System, Fusion, Masters, Fury (4D) and Shogun Steel",
    ],
    faqs: [
      { question: "What does the code after a top's name mean, like \"105RF\"?", answer: "It is the Spin Track height and the Performance Tip. 105RF is a 105-height track with a Rubber Flat tip — tall enough to clear a dish's slope, with rubber for aggressive floor contact. Swapping track and tip is how you trade stamina against attack." },
      { question: "Can Metal Fight tops battle Burst tops in the same stadium?", answer: "Physically yes where the stadium fits both, but they do not burst apart on impact the way Burst tops do, so a Burst top can lose by bursting while a Metal Fight top simply keeps spinning. Most local groups keep the generations separate." },
      { question: "Are Metal Fight parts interchangeable with 4D parts?", answer: "Partly. 4D Fusion Wheels and bottoms were designed to accept Hybrid Wheel System components, but not everything fits in both directions — the listing states which system a part belongs to." },
    ],
  },
  children: [
    branch("category-metal-tops", "Metal Fight Tops", "Complete Metal Fight Beyblades across all five sub-generations.", [
      line("category-metal-phws", "Metal System", "The 2008 debut system that preceded the Hybrid Wheel System — the first metal-weighted tops.", beyDefaults("category-metal-phws", "Beyblade: Metal Fusion", "Metal System"), COLLECTIBLE_TEMPLATES),
      line("category-metal-fusion", "Metal Fusion", "The Hybrid Wheel System wave that defined the era — Face Bolt, Energy Ring, Fusion Wheel, Spin Track, Tip.", beyDefaults("category-metal-fusion", "Beyblade: Metal Fusion", "Hybrid Wheel System"), COLLECTIBLE_TEMPLATES),
      line("category-metal-masters", "Metal Masters", "Later Hybrid Wheel releases with heavier wheels and tighter tolerances.", beyDefaults("category-metal-masters", "Beyblade: Metal Masters", "Hybrid Wheel System"), COLLECTIBLE_TEMPLATES),
      line("category-metal-fury-4d", "Metal Fury (4D)", "The 4D System wave — multi-mode wheels and switchable bottoms, and the heaviest tops of the era.", beyDefaults("category-metal-fury-4d", "Beyblade: Metal Fury", "4D System"), COLLECTIBLE_TEMPLATES),
      line("category-metal-shogun-steel", "Shogun Steel / Zero-G", "The 2012–2013 Zero-G line, built for the rocking Zero-G stadium rather than a static dish.", beyDefaults("category-metal-shogun-steel", "Beyblade: Shogun Steel", "Synchrom System"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-metal-parts", "Metal Fight Parts", "The four-part system sold loose — this is where a custom Metal Fight combo gets built.", [
      node("category-metal-face-bolts", "Face Bolts", "The screw and face sticker at the top. Mostly cosmetic, occasionally a weight tweak.", partDefaults("category-metal-face-bolts", "Face Bolt"), PART_TEMPLATES),
      node("category-metal-energy-rings", "Energy Rings", "The clear upper ring (Clear Wheel) that sets spin balance and adds a small contact profile.", partDefaults("category-metal-energy-rings", "Energy Ring"), PART_TEMPLATES),
      node("category-metal-fusion-wheels", "Fusion Wheels", "The metal mass of the top — the single part that most decides whether a combo attacks or endures.", partDefaults("category-metal-fusion-wheels", "Fusion Wheel"), PART_TEMPLATES),
      node("category-metal-spin-tracks", "Spin Tracks", "The height component. 85, 100, 105, 125, 145, 230 — taller clears a dish's slope, lower sits under an opponent.", partDefaults("category-metal-spin-tracks", "Spin Track"), PART_TEMPLATES),
      node("category-metal-performance-tips", "Performance Tips", "The floor contact: Rubber Flat, Wide Defense, Eternal Sharp, Metal Ball and the rest of the bottom vocabulary.", partDefaults("category-metal-performance-tips", "Performance Tip"), PART_TEMPLATES),
    ]),
    branch("category-metal-launchers", "Metal Fight Launchers", "String launchers, ripcord launchers and grips for the Metal Fight era.", [
      node("category-metal-string-launchers", "String Launchers", "The pull-string launchers that replaced ripcords, giving far more consistent launch power.", launcherDefaults("category-metal-string-launchers", "Beyblade: Metal Fight"), PART_TEMPLATES),
      node("category-metal-ripcord-launchers", "Ripcord Launchers", "The entry-level ripcord launchers bundled with most starter sets.", launcherDefaults("category-metal-ripcord-launchers", "Beyblade: Metal Fight"), PART_TEMPLATES),
      node("category-metal-lr-launchers", "LR Launchers", "Dual-direction launchers that drive both right- and left-spin tops.", launcherDefaults("category-metal-lr-launchers", "Beyblade: Metal Fight"), PART_TEMPLATES),
    ]),
    branch("category-metal-stadiums", "Metal Fight Stadiums", "BeyStadiums of the Metal Fight era, including the rocking Zero-G dishes.", [
      node("category-metal-standard-stadiums", "Standard BeyStadiums", "The round Metal Fight dishes — BB-10 Attack Type and the Super Vortex family.", stadiumDefaults("category-metal-standard-stadiums", "Beyblade: Metal Fight"), SEALED_TEMPLATES),
      node("category-metal-zero-g-stadiums", "Zero-G Stadiums", "The rocking stadiums Shogun Steel tops were designed around — the floor itself moves.", stadiumDefaults("category-metal-zero-g-stadiums", "Beyblade: Shogun Steel"), SEALED_TEMPLATES),
    ]),
  ],
};

const BEYBLADE_BURST: CategoryTreeNode = {
  id: "category-beyblade-burst",
  name: "Beyblade Burst",
  description:
    "Beyblade Burst (2015–2023) by Takara Tomy and Hasbro — tops that burst apart on a hard enough hit, with swappable Layer, Disc and Driver parts across seven waves.",
  extra: {
    isFeatured: true,
    display: { icon: "💥", coverImage: cover("beyblade-burst"), color: "#059669", showInMenu: true, showInFooter: false },
    contentBody: `<p>Burst added the mechanic the franchise is now named for: hit a top hard enough and it comes apart, ending the battle immediately. That single rule changed how everything is priced and tuned, because burst <em>resistance</em> became as valuable as attack power.</p>
<p>A Burst top is three parts — a <strong>Layer</strong> on top, a <strong>Disc</strong> under it and a <strong>Driver</strong> at the floor — and all three are listed loose on our <a href="/categories/category-burst-parts">parts shelf</a>. Seven waves sit above, and they are not cosmetic revisions: <strong>Burst Classic</strong> (2015) was all plastic; <strong>God</strong> added spring-loaded Layers; <strong>Cho-Z</strong> put metal in the Layer and roughly doubled burst resistance; <strong>GT</strong> added a swappable chip; <strong>Superking</strong> introduced the five-sided Sparking ratchet; <strong>Dynamite Battle</strong> and <strong>Burst Ultimate</strong> closed the line with the heaviest Layers it ever shipped.</p>
<p>Prices climb almost monotonically with the wave, from around ₹300 for an early single-layer release to ₹1,500 and up for Burst Ultimate — which is a straightforward proxy for how much metal is in the Layer.</p>`,
    highlights: [
      "Tops that burst apart on a hard enough hit — the mechanic the franchise is named for",
      "Layers, Discs and Drivers all sold loose for build customisation",
      "The most actively traded generation on the platform, across all seven waves",
    ],
    faqs: [
      { question: "What is the difference between a Layer, a Disc and a Driver?", answer: "The Layer is the top piece and sets the attack profile and burst resistance; the Disc sits underneath and tunes weight and stamina; the Driver is the tip touching the stadium floor and decides how the top moves. Mixing them is the whole game." },
      { question: "Is bursting during a battle bad for the top?", answer: "No. Burst tops are designed to separate on hard impacts — it is the scoring mechanic, not a failure — and they click back together for the next round. Repeated bursting does wear the Layer's teeth over time, which is why condition matters on a used Burst Layer." },
      { question: "Are Takara Tomy and Hasbro Burst tops the same?", answer: "They are the same moulds under different names and often different colours — Lost Longinus is sold in the west as Lost Luinor L2. They are compatible with each other. Hasbro releases are generally cheaper and the plastic is slightly softer." },
      { question: "Which Burst wave should a beginner start with?", answer: "Cho-Z or later. Early single-layer plastic releases burst very easily against a modern top, which is frustrating rather than competitive — and they are cheap for exactly that reason." },
    ],
  },
  children: [
    branch("category-burst-tops", "Burst Tops", "Complete Burst-system Beyblades across every wave.", [
      line("category-burst-classic", "Burst Classic", "The original 2015–2017 single- and dual-layer waves, before any metal entered the Layer.", beyDefaults("category-burst-classic", "Beyblade Burst", "Burst System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-god", "Burst God", "The God Layer wave, which added spring-loaded Layers and the first real burst-resistance tuning.", beyDefaults("category-burst-god", "Beyblade Burst God", "God Layer System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-cho-z", "Cho-Z", "The metal-layer wave — heavier Layers and roughly double the burst resistance of what came before.", beyDefaults("category-burst-cho-z", "Beyblade Burst Cho-Z", "Cho-Z Layer System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-gt", "GT", "The Gatinko wave, with a swappable chip inside the Layer for a third tuning axis.", beyDefaults("category-burst-gt", "Beyblade Burst GT", "Gatinko Layer System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-superking", "Superking", "The Sparking / Superking wave and its five-sided ratchet, which changed launch dynamics entirely.", beyDefaults("category-burst-superking", "Beyblade Burst Superking", "Sparking Layer System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-db", "Dynamite Battle", "The DB wave — Armour Tips and the heaviest Layers Burst had shipped to that point.", beyDefaults("category-burst-db", "Beyblade Burst Dynamite Battle", "Dynamite Battle Layer System"), COLLECTIBLE_TEMPLATES),
      line("category-burst-bu", "Burst Ultimate", "The final Burst wave, closing the line in 2023 before Beyblade X replaced it.", beyDefaults("category-burst-bu", "Beyblade Burst Ultimate", "Burst Ultimate Layer System"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-burst-parts", "Burst Parts", "Layers, Discs, Drivers and the chips and armour that bolt onto them.", [
      node("category-burst-layers", "Layers", "The top piece — attack profile and burst resistance. The most expensive part of a Burst build.", partDefaults("category-burst-layers", "Layer"), PART_TEMPLATES),
      node("category-burst-discs", "Discs", "The middle weight component, tuning stamina against manoeuvrability.", partDefaults("category-burst-discs", "Disc"), PART_TEMPLATES),
      node("category-burst-drivers", "Drivers", "The floor-contact tip that decides whether a combo chases, holds centre or simply survives.", partDefaults("category-burst-drivers", "Driver"), PART_TEMPLATES),
      node("category-burst-chips-armour", "Chips & Armour", "Gatinko chips, Armour Tips and the bolt-on components the later waves introduced.", partDefaults("category-burst-chips-armour", "Chip or Armour"), PART_TEMPLATES),
    ]),
    branch("category-burst-launchers", "Burst Launchers", "String launchers, LR launchers and grips for Burst play.", [
      node("category-burst-string-launchers", "String Launchers", "The standard Burst launcher — a pull string with a winding spool, rebuildable when the string frays.", launcherDefaults("category-burst-string-launchers", "Beyblade Burst"), PART_TEMPLATES),
      node("category-burst-lr-launchers", "LR Launchers", "Dual-direction launchers for both right- and left-spin Burst tops.", launcherDefaults("category-burst-lr-launchers", "Beyblade Burst"), PART_TEMPLATES),
      node("category-burst-grips", "Launcher Grips", "Grips that bolt onto a launcher for a longer, more repeatable pull.", launcherDefaults("category-burst-grips", "Beyblade Burst"), PART_TEMPLATES),
    ]),
    branch("category-burst-stadiums", "Burst Stadiums", "BeyStadiums sized and shaped for Burst play.", [
      node("category-burst-standard-stadiums", "Standard BeyStadiums", "The round Burst dishes, including the tournament-standard Burst BeyStadium.", stadiumDefaults("category-burst-standard-stadiums", "Beyblade Burst"), SEALED_TEMPLATES),
      node("category-burst-stadium-variants", "Stadium Variants", "Themed and modified Burst stadiums — raised walls, pockets and multi-level dishes.", stadiumDefaults("category-burst-stadium-variants", "Beyblade Burst"), SEALED_TEMPLATES),
    ]),
  ],
};

const BEYBLADE_X: CategoryTreeNode = {
  id: "category-beyblade-x",
  name: "Beyblade X",
  description:
    "Beyblade X (2023–present) by Takara Tomy — the current generation, built on the Xtreme Gear system with Blade, Ratchet and Bit parts and the Xtreme Dash rail.",
  extra: {
    isFeatured: true,
    display: { icon: "💫", coverImage: cover("beyblade-x"), color: "#0d9488", showInMenu: true, showInFooter: false },
    contentBody: `<p>Beyblade X is the current generation and the first to put the stadium at the centre of the design. Its Xtreme Line stadiums have a raised rail, and an X top that hits that rail accelerates along it — the Xtreme Dash. Everything about an X build is tuned around whether it can reach and hold that rail.</p>
<p>The three-part system is renamed: <strong>Blade</strong> on top, <strong>Ratchet</strong> in the middle setting height, <strong>Bit</strong> at the floor. Functionally that mirrors Burst's Layer, Disc and Driver, and physically it is incompatible with all of them. A Ratchet is written as two numbers — <strong>3-60</strong> means three protrusions at a 6.0 mm height — and that notation is the fastest way to read what a build is doing.</p>
<p>Three retail lines sit above. <strong>Basic Line</strong> is the entry point; <strong>Unique Line (UX)</strong> adds gimmicked Blades; <strong>Custom Line (CX)</strong> splits the Blade itself into a Lock Chip, a Main Blade and an Assist Blade, which is the deepest customisation the franchise has shipped. The <strong>X-Over Project</strong> reissues classic designs on X hardware.</p>`,
    highlights: [
      "The current generation — Xtreme Gear, launched 2023 and still receiving new waves",
      "Custom Line (CX) splits the Blade into three swappable pieces, the deepest tuning the franchise has shipped",
      "An active tournament scene, so parts hold value rather than depreciating",
    ],
    faqs: [
      { question: "Do I need a new stadium for Beyblade X?", answer: "For serious play, yes. X tops are built around the Xtreme Line rail, and in a plain round dish they lose the Xtreme Dash that defines the generation. They will still spin in an older stadium." },
      { question: "What does the Blade / Ratchet / Bit naming mean?", answer: "Blade is the top piece, Ratchet the middle component that sets height, Bit the floor tip. It maps onto Burst's Layer / Disc / Driver in function but nothing is physically interchangeable between the two." },
      { question: "What do the numbers on a Ratchet mean, like 3-60?", answer: "The first number is how many protrusions the Ratchet has, the second is its height in tenths of a millimetre — 3-60 is three protrusions at 6.0 mm. Lower sits under an opponent; taller clears the stadium slope and reaches the rail." },
      { question: "What is the difference between Basic, Unique and Custom Line?", answer: "Basic Line is a standard three-part top. Unique Line (UX) adds a gimmick to the Blade. Custom Line (CX) splits the Blade into a Lock Chip, a Main Blade and an Assist Blade, so one CX purchase yields several distinct builds." },
    ],
  },
  children: [
    branch("category-x-tops", "Beyblade X Tops", "Complete Beyblade X tops — starters, boosters and the X-Over reissues.", [
      line("category-x-basic", "Basic Line", "Standard three-part X tops. The entry point into the format and the bulk of its catalogue.", beyDefaults("category-x-basic", "Beyblade X", "Xtreme Gear (Basic Line)"), COLLECTIBLE_TEMPLATES),
      line("category-x-unique-ux", "Unique Line (UX)", "UX releases, each Blade carrying a mechanical gimmick the Basic Line does not have.", beyDefaults("category-x-unique-ux", "Beyblade X", "Xtreme Gear (Unique Line)"), COLLECTIBLE_TEMPLATES),
      line("category-x-custom-cx", "Custom Line (CX)", "CX releases, whose Blade splits into a Lock Chip, a Main Blade and an Assist Blade.", beyDefaults("category-x-custom-cx", "Beyblade X", "Xtreme Gear (Custom Line)"), COLLECTIBLE_TEMPLATES),
      line("category-x-over", "X-Over Project", "Classic designs from earlier generations reissued on Beyblade X hardware.", beyDefaults("category-x-over", "Beyblade X", "Xtreme Gear (X-Over)"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-x-parts", "Beyblade X Parts", "Blades, Ratchets and Bits sold loose for custom X builds.", [
      node("category-x-blades", "Blades", "The upper piece that defines an X combo's attack shape and its ability to hold the rail.", partDefaults("category-x-blades", "Blade"), PART_TEMPLATES),
      node("category-x-ratchets", "Ratchets", "The middle component. Written as protrusions-height — 3-60, 4-60, 9-60 — and the fastest lever on a build.", partDefaults("category-x-ratchets", "Ratchet"), PART_TEMPLATES),
      node("category-x-bits", "Bits", "The floor-contact tip, the X-format equivalent of a Driver.", partDefaults("category-x-bits", "Bit"), PART_TEMPLATES),
    ]),
    branch("category-x-launchers", "Beyblade X Launchers", "String launchers, winders and grips for the X format.", [
      node("category-x-string-launchers", "String Launchers", "The standard X launcher, with a shot angle designed around reaching the Xtreme Line rail.", launcherDefaults("category-x-string-launchers", "Beyblade X"), PART_TEMPLATES),
      node("category-x-winders", "Winders", "Ripcord-style winders for the entry-level X launchers.", launcherDefaults("category-x-winders", "Beyblade X"), PART_TEMPLATES),
      node("category-x-grips", "Launcher Grips", "Grips for a longer, more repeatable X launch.", launcherDefaults("category-x-grips", "Beyblade X"), PART_TEMPLATES),
    ]),
    branch("category-x-stadiums", "Beyblade X Stadiums", "Xtreme Line stadiums and the plain dishes that predate them.", [
      node("category-x-xtreme-stadiums", "Xtreme Stadiums", "X-format stadiums with the Xtreme Line rail — the feature the whole generation is designed around.", stadiumDefaults("category-x-xtreme-stadiums", "Beyblade X"), SEALED_TEMPLATES),
      node("category-x-standard-stadiums", "Standard X Stadiums", "Plain round X dishes without the rail, for casual play and practice.", stadiumDefaults("category-x-standard-stadiums", "Beyblade X"), SEALED_TEMPLATES),
    ]),
  ],
};

/**
 * 🛑 Renamed from `category-battle-gear` in B5, and the id change is the point.
 *
 * The old node held every stadium from every generation plus storage, and a
 * stadium is generation-specific — so it has moved out to four per-generation
 * `*-stadiums` nodes above. What is left is the gear that genuinely is
 * cross-generation: a case holds any bey, a tool kit fits any screw. The node's
 * own description already said "accessories" before the rename.
 *
 * These are DOCUMENT IDS and `categorySlugs[]` stores the full chain by id, so
 * this is a reseed, not a find-replace: the five product fixtures that
 * referenced the old chain were updated in the same change, and
 * `deriveTaxonomy` rebuilds `categoryNames[]` on write.
 */
const ACCESSORIES: CategoryTreeNode = {
  id: "category-accessories",
  name: "Accessories",
  description:
    "Gear that works across every generation — storage cases, tool kits, counters and blank sticker sheets.",
  extra: {
    display: { icon: "🧰", coverImage: cover("accessories"), color: "#7c3aed", showInMenu: true, showInFooter: false },
    contentBody: `<p>Everything here is generation-agnostic, which is the whole reason it is one shelf rather than four. A hard case holds a Plastic Generation top and a Beyblade X top equally well; a tri-wing driver fits the screws on both.</p>
<p>Stadiums are deliberately <em>not</em> here. A stadium is generation-specific — a BX-10 Xtreme Stadium is a Beyblade X product and a BB-10 Attack Type is Metal Fight — so each generation has its own stadium shelf under <a href="/categories/category-spinning-tops">Spinning Tops</a>.</p>`,
    highlights: [
      "Storage built for part collections, not just complete tops",
      "Tool kits for the tri-wing and Phillips screws different generations use",
    ],
    faqs: [
      { question: "Why are stadiums not listed under Accessories?", answer: "Because a stadium is generation-specific. A Beyblade X Xtreme Line stadium and a Metal Fight BB-10 are different products for different tops, so each generation has its own stadium shelf and you are never filtering a list that is mostly not for your beys." },
      { question: "Which screwdriver do I need?", answer: "It depends on the generation. Most original-era and Metal Fight parts use a Phillips screw; several Burst and X components use a tri-wing. A counterfeit frequently uses the wrong one, which is itself a useful tell." },
    ],
  },
  children: [
    node("category-accessory-storage-cases", "Storage Cases & Trays", "Hard cases and compartment trays for complete tops and loose parts.", accessoryDefaults("category-accessory-storage-cases", "Storage case"), PART_TEMPLATES),
    node("category-accessory-tool-kits", "Tool Kits", "Tri-wing and Phillips drivers, picks and tweezers for part swaps and repairs.", accessoryDefaults("category-accessory-tool-kits", "Tool kit"), PART_TEMPLATES),
    node("category-accessory-counters", "Counters & BeyPointers", "Battle counters, BeyPointers and the scoring accessories tournaments use.", accessoryDefaults("category-accessory-counters", "Counter"), PART_TEMPLATES),
    node("category-accessory-sticker-sheets", "Sticker Sheets", "Replacement and blank sticker sheets — the first thing to wear out on a played top.", accessoryDefaults("category-accessory-sticker-sheets", "Sticker sheet"), PART_TEMPLATES),
  ],
};

const SPINNING_TOPS: CategoryTreeNode = {
  id: "category-spinning-tops",
  name: "Spinning Tops",
  description:
    "Collectible spinning tops and battle systems — Beyblade Original, Metal Fight, Burst and X, their loose parts, launchers and stadiums.",
  extra: {
    isFeatured: true,
    featuredPriority: 1,
    showOnHomepage: true,
    display: { icon: "🌀", coverImage: cover("spinning-tops"), color: "#0891b2", showInMenu: true, showInFooter: true },
    contentBody: `<p>Four generations of Beyblade, and they do not interchange. That single fact is why this section is organised by generation first and part family second: an original-era ripcord launcher drives nothing from Burst, a Burst Driver does not fit an X Ratchet, and a stadium built for the Xtreme Line rail is a different product from a plain round dish.</p>
<p><a href="/categories/category-beyblade-original">Beyblade Original</a> (1999–2003) moved through four part systems in four years and ends with HMS, the highest-value tier here. <a href="/categories/category-beyblade-metal">Metal Fight</a> (2008–2013) made it a tuning game, and is the only generation where loose parts outnumber complete tops. <a href="/categories/category-beyblade-burst">Burst</a> (2015–2023) added the bursting mechanic across seven waves. <a href="/categories/category-beyblade-x">Beyblade X</a> (2023–) puts the stadium rail at the centre of the design.</p>
<p>Each generation has its own tops, parts, launchers and stadiums. <a href="/categories/category-accessories">Accessories</a> — cases, tools, counters, sticker sheets — is the one shelf that genuinely spans all four.</p>`,
    highlights: [
      "Every era of Beyblade in one place — Original, Metal Fight, Burst and X",
      "Loose parts, launchers and stadiums shelved per generation, because none of them interchange",
      "Verified sellers, condition-graded listings, and authenticity stated on every one",
      "Auctions, pre-orders and prize draws alongside straightforward buy-now listings",
    ],
    faqs: [
      { question: "What is the difference between the four Beyblade generations?", answer: "Original (1999–2003) started the franchise with ripcord launchers and a four-part plastic system. Metal Fight (2008–2013) added metal-weighted wheels and deep part tuning. Burst (2015–2023) introduced tops that burst apart on hard hits. Beyblade X (2023–) uses the Xtreme Gear system and a stadium rail that accelerates a top along it." },
      { question: "Are used tops sold here safe to battle with?", answer: "Every listing carries a condition grade and sellers are expected to disclose chips, cracks and stripped teeth — check the condition badge and the photographs, which are of the actual item rather than a stock image." },
      { question: "Do parts interchange between generations?", answer: "No. Every generation changed the locking geometry, and launchers changed with them. Parts interchange freely within a generation and almost never across one, which is why this section is shelved by generation first." },
      { question: "How do I know a top is not a counterfeit?", answer: "Every listing states its authenticity — original, reproduction or unverified — and a reproduction is labelled as one rather than described as genuine. Price is the loudest signal: a current-generation top at a fifth of the usual price is not a bargain." },
    ],
    seo: {
      title: "Beyblade & Spinning Tops — Original, Metal Fight, Burst, X | LetItRip",
      description:
        "Buy Beyblade tops, parts, launchers and stadiums across all four generations — Original, Metal Fight, Burst and Beyblade X. Verified sellers, condition-graded listings, authenticity stated.",
      keywords: ["beyblade", "spinning tops", "beyblade x", "beyblade burst", "metal fight beyblade", "beyblade india"],
    },
  },
  children: [BEYBLADE_ORIGINAL, BEYBLADE_METAL, BEYBLADE_BURST, BEYBLADE_X, ACCESSORIES],
};

// ═════════════════════════════════════════════════════════════════════════════
// Root 2 — Trading Cards
//
// 🛑 THREE axes, and only one can be the tree. Game -> set is the tree, because
//    a card belongs to exactly one set and the set is what a buyer searches.
//    FORMAT gets a tier-2 split as well, because the price bands differ ~20×
//    (a single is ₹350–500, a booster box ₹7,000–14,500) and shoppers never
//    cross-shop them. LANGUAGE and GRADE are features, not nodes.
//
//    Expansion sets sit under SEALED only. A sealed product IS the set
//    ("Destined Rivals Booster Box"); a single is a card whose set is a
//    property of it, carried on `itemCode`. Duplicating ~14 set nodes under
//    every format would triple the branch for no new reachability.
// ═════════════════════════════════════════════════════════════════════════════

const POKEMON_SETS: CategoryTreeNode[] = [
  node("category-pokemon-set-destined-rivals", "Destined Rivals", "Sealed Destined Rivals product — booster boxes, ETBs, bundles and blisters.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-journey-together", "Journey Together", "Sealed Journey Together product.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-prismatic-evolutions", "Prismatic Evolutions", "Sealed Prismatic Evolutions product.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-surging-sparks", "Surging Sparks", "Sealed Surging Sparks product.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-stellar-crown", "Stellar Crown", "Sealed Stellar Crown product.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-twilight-masquerade", "Twilight Masquerade", "Sealed Twilight Masquerade product.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-151", "Pokémon 151", "Sealed Pokémon 151 product — the Kanto set, and the most consistently in-demand modern release.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
  node("category-pokemon-set-vintage-wotc", "Vintage (WotC era)", "Sealed and opened product from the Wizards of the Coast era — Base Set through Neo and e-Card.", tcgDefaults("category-pokemon-sealed", "Pokémon TCG", "Sealed"), SEALED_TEMPLATES),
];

const ONE_PIECE_SETS: CategoryTreeNode[] = [
  node("category-op-set-op09", "OP-09 Emperors in the New World", "Sealed OP-09 product.", tcgDefaults("category-one-piece-sealed", "One Piece Card Game", "Sealed"), SEALED_TEMPLATES),
  node("category-op-set-op10", "OP-10 Royal Blood", "Sealed OP-10 product.", tcgDefaults("category-one-piece-sealed", "One Piece Card Game", "Sealed"), SEALED_TEMPLATES),
  node("category-op-set-op11", "OP-11 A Fist of Divine Speed", "Sealed OP-11 product.", tcgDefaults("category-one-piece-sealed", "One Piece Card Game", "Sealed"), SEALED_TEMPLATES),
  node("category-op-set-prb01", "PRB-01 Premium Booster", "Sealed PRB-01 premium booster product.", tcgDefaults("category-one-piece-sealed", "One Piece Card Game", "Sealed"), SEALED_TEMPLATES),
  node("category-op-set-starter-decks", "Starter Decks", "Sealed One Piece starter decks across every colour.", tcgDefaults("category-one-piece-sealed", "One Piece Card Game", "Sealed"), SEALED_TEMPLATES),
];

const TRADING_CARDS: CategoryTreeNode = {
  id: "category-trading-cards",
  name: "Trading Cards",
  description:
    "Trading card games — Pokémon, One Piece, Weiss Schwarz, Yu-Gi-Oh and more. Singles, sealed product, graded slabs and the supplies to protect them.",
  extra: {
    display: { icon: "🃏", coverImage: cover("trading-cards"), color: "#d97706", showInMenu: true, showInFooter: true },
    contentBody: `<p>Trading cards split three ways and it pays to know which one you are shopping. <strong>Singles</strong> are individual cards, typically ₹350–500 and priced on condition and rarity. <strong>Sealed</strong> product is unopened — a booster pack is around ₹950, a booster box ₹7,000–14,500 — and is bought either to open or to hold. <strong>Graded</strong> slabs are cards sent to PSA, BGS or CGC, encapsulated with a numeric grade, and a PSA 10 of a card worth ₹500 raw can be worth twenty times that.</p>
<p>Within each game, sealed product is shelved by <strong>expansion set</strong>, because a sealed box is the set — "Destined Rivals Booster Box" names it exactly. Singles carry their set on the listing instead, since a single is a card first and a set member second.</p>
<p><strong>Language matters and is a separate filter.</strong> A Japanese print and an English print of the same card are different products with different print runs, different pull rates and often very different prices. It is recorded as a feature on every listing rather than buried in the title.</p>`,
    highlights: [
      "Singles, sealed and graded shelved separately — the price bands differ by 20×",
      "Sealed product organised by expansion set, because a sealed box is the set",
      "Language and grade recorded on every listing, not left in the title",
    ],
    faqs: [
      { question: "What is the difference between a booster box, an ETB and a bundle?", answer: "A booster box holds the most packs and has the best per-pack price; an Elite Trainer Box holds fewer packs plus accessories (sleeves, dice, a deck box) and is better value if you want those; a bundle is a small pack count at the lowest entry price. Per pack, box beats ETB beats bundle." },
      { question: "Why does a Japanese card cost differently from the English version?", answer: "Different print runs, different pull rates and a different collector base. Japanese sets often have higher card quality and smaller print runs; English sets have a larger market. Language is a filter here because they are genuinely different products." },
      { question: "What does a PSA 10 actually mean?", answer: "It is the top grade from Professional Sports Authenticator — centring, corners, edges and surface all judged near-perfect, and the card sealed in a tamper-evident slab. Grading is why an identical-looking card can be worth twenty times another: the slab certifies the condition rather than asking you to trust a photograph." },
      { question: "Are pulls guaranteed from sealed product?", answer: "No, and no seller here may claim they are. Sealed product is random by design. A listing promising a specific card from a sealed pack or box should be reported." },
    ],
    seo: {
      title: "Trading Cards — Pokémon, One Piece, Graded Slabs | LetItRip",
      description:
        "Buy trading cards in India — Pokémon and One Piece singles, sealed booster boxes and ETBs, PSA and BGS graded slabs, plus sleeves and binders. Language and grade on every listing.",
      keywords: ["pokemon tcg india", "one piece card game", "booster box india", "psa graded cards", "trading cards india"],
    },
  },
  children: [
    {
      id: "category-pokemon-tcg",
      name: "Pokémon TCG",
      description: "The Pokémon Trading Card Game — singles, sealed product by expansion, and graded slabs.",
      extra: {
        display: { icon: "⚡", coverImage: cover("pokemon-tcg"), color: "#eab308", showInMenu: true, showInFooter: false },
        faqs: [
          { question: "Which Pokémon sets hold value best?", answer: "Historically, sets with a short print run or an iconic chase card. Pokémon 151 and the WotC-era Base Set are the two most consistently in demand; modern sets with long reprints tend to soften after release." },
        ],
      },
      children: [
        node("category-pokemon-singles", "Singles", "Individual Pokémon cards, priced on rarity and condition. Set and language stated on every listing.", tcgDefaults("category-pokemon-singles", "Pokémon TCG", "Single"), SEALED_TEMPLATES),
        branch("category-pokemon-sealed", "Sealed Product", "Unopened Pokémon product, shelved by expansion set.", POKEMON_SETS),
        node("category-pokemon-graded", "Graded Slabs", "PSA, BGS and CGC graded Pokémon cards, with the certification number on the listing.", tcgDefaults("category-pokemon-graded", "Pokémon TCG", "Graded"), SEALED_TEMPLATES),
      ],
    },
    {
      id: "category-one-piece-tcg",
      name: "One Piece Card Game",
      description: "Bandai's One Piece Card Game — singles, sealed product by set, and graded cards.",
      extra: {
        display: { icon: "🏴‍☠️", coverImage: cover("one-piece-tcg"), color: "#dc2626", showInMenu: true, showInFooter: false },
      },
      children: [
        node("category-one-piece-singles", "Singles", "Individual One Piece cards — leaders, characters and events, with set codes on the listing.", tcgDefaults("category-one-piece-singles", "One Piece Card Game", "Single"), SEALED_TEMPLATES),
        branch("category-one-piece-sealed", "Sealed Product", "Unopened One Piece product, shelved by set code.", ONE_PIECE_SETS),
        node("category-one-piece-graded", "Graded Slabs", "Graded One Piece cards with their certification numbers.", tcgDefaults("category-one-piece-graded", "One Piece Card Game", "Graded"), SEALED_TEMPLATES),
      ],
    },
    branch("category-other-tcg", "Other Card Games", "Weiss Schwarz, Dragon Ball, Yu-Gi-Oh, Digimon, Union Arena, Gundam and Hololive.", [
      node("category-tcg-weiss-schwarz", "Weiss Schwarz", "Bushiroad's crossover card game, spanning dozens of anime licences.", tcgDefaults("category-tcg-weiss-schwarz", "Weiss Schwarz", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-dragon-ball", "Dragon Ball Super", "Bandai's Dragon Ball Super Card Game — singles and sealed.", tcgDefaults("category-tcg-dragon-ball", "Dragon Ball Super Card Game", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-yu-gi-oh", "Yu-Gi-Oh!", "Konami's Yu-Gi-Oh! Trading Card Game — structure decks, boosters and singles.", tcgDefaults("category-tcg-yu-gi-oh", "Yu-Gi-Oh!", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-digimon", "Digimon Card Game", "Bandai's Digimon Card Game.", tcgDefaults("category-tcg-digimon", "Digimon Card Game", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-union-arena", "Union Arena", "Bushiroad's Union Arena, another multi-licence crossover game.", tcgDefaults("category-tcg-union-arena", "Union Arena", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-gundam", "Gundam Card Game", "Bandai's Gundam Card Game.", tcgDefaults("category-tcg-gundam", "Gundam Card Game", "Sealed"), SEALED_TEMPLATES),
      node("category-tcg-hololive", "Hololive", "The Hololive Official Card Game.", tcgDefaults("category-tcg-hololive", "Hololive Official Card Game", "Sealed"), SEALED_TEMPLATES),
    ]),
    branch("category-card-supplies", "Card Supplies", "Sleeves, toploaders, binders, deck boxes and slab display — the cheapest tier on the site.", [
      node("category-card-sleeves-toploaders", "Sleeves & Toploaders", "Penny sleeves, perfect fits, art sleeves, toploaders and semi-rigids.", tcgDefaults("category-card-sleeves-toploaders", "Trading cards", "Supplies"), PART_TEMPLATES),
      node("category-card-binders-boxes", "Binders & Deck Boxes", "Zip binders, portfolios, deck boxes and storage for bulk.", tcgDefaults("category-card-binders-boxes", "Trading cards", "Supplies"), PART_TEMPLATES),
      node("category-card-slab-display", "Slab Display", "Stands, wall mounts and cases built for graded slabs rather than raw cards.", tcgDefaults("category-card-slab-display", "Trading cards", "Supplies"), PART_TEMPLATES),
    ]),
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// Root 3 — Collectible Figures
// ═════════════════════════════════════════════════════════════════════════════

const COLLECTIBLE_FIGURES: CategoryTreeNode = {
  id: "category-collectible-figures",
  name: "Collectible Figures",
  description:
    "Anime, comic and game figures — scale statues, articulated figures, prize figures and Nendoroids, with box condition stated separately from figure condition.",
  extra: {
    display: { icon: "🧍", coverImage: cover("collectible-figures"), color: "#db2777", showInMenu: true, showInFooter: true },
    contentBody: `<p>Figures are priced on three things: scale, maker and whether the box survived. <strong>Scale</strong> is the main axis — a 1/12 figure is around 15 cm and a 1/6 is around 30 cm, and the price roughly follows the volume. <strong>Prize figures</strong> are a separate tier entirely: made for Japanese arcade prize machines, usually unarticulated, and they start around ₹2,000 where a scale statue starts around ₹3,000 and runs well past ₹30,000.</p>
<p><strong>Box condition is graded separately from the figure</strong>, because collectors price it separately. A mint figure in a crushed box and the same figure boxed are different listings at different prices, and a "without box" listing says so in its title.</p>
<p>Bootlegs are common at scale and are identified by paint quality, seam finish and box printing rather than by price alone. Every listing here states its authenticity, and a seller listing a reproduction must label it as one.</p>`,
    highlights: [
      "Shelved by scale, because scale is what drives the price",
      "Box condition graded separately from the figure — collectors price the two differently",
      "Prize figures kept as their own tier rather than mixed into scale statues",
    ],
    faqs: [
      { question: "What does 1/7 scale actually mean?", answer: "It is the figure's size relative to the character at human scale — a 1/7 figure of a 175 cm character is about 25 cm tall. In practice: 1/12 is around 15 cm, 1/8 around 21 cm, 1/7 around 25 cm, 1/6 around 30 cm. Price tracks the volume closely." },
      { question: "What is a prize figure?", answer: "A figure produced for Japanese arcade prize machines rather than retail. They are usually unarticulated and simpler in finish, and they are genuinely cheaper rather than lower quality for the price — Banpresto's prize line is the best-known." },
      { question: "How do I spot a bootleg figure?", answer: "Paint bleed at colour boundaries, visible seam lines left unfinished, a box printed slightly out of register, and a missing or mis-sized licence mark. Price alone is not conclusive — a genuine figure can be discounted, and a good bootleg is not always cheap." },
      { question: "Does a damaged box affect the price much?", answer: "For a sealed collectible, substantially. That is why box condition is graded as its own field here rather than folded into the figure's condition." },
    ],
    seo: {
      title: "Collectible Figures — Anime, Marvel, Nendoroid | LetItRip",
      description:
        "Buy collectible figures in India — 1/12 to 1/6 scale anime statues, Marvel Legends, Nendoroids, Banpresto prize figures and vintage Toy Biz. Box condition stated separately.",
      keywords: ["anime figures india", "marvel legends india", "nendoroid", "banpresto", "collectible figures"],
    },
  },
  children: [
    branch("category-anime-figures", "Anime Figures", "Scale statues, prize figures and chibi lines from anime and manga licences.", [
      node("category-anime-scale-1-12", "1/12 Scale", "Around 15 cm. The articulated-figure standard — Figma, S.H.Figuarts and Mafex.", figureDefaults("category-anime-scale-1-12", "1/12 scale"), COLLECTIBLE_TEMPLATES),
      node("category-anime-scale-1-7-1-8", "1/7 & 1/8 Scale", "Around 21–25 cm. The most common scale-statue size and the broadest selection.", figureDefaults("category-anime-scale-1-7-1-8", "1/7 & 1/8 scale"), COLLECTIBLE_TEMPLATES),
      node("category-anime-scale-1-6", "1/6 Scale", "Around 30 cm. Large display statues, and the premium end of the anime-figure market.", figureDefaults("category-anime-scale-1-6", "1/6 scale"), COLLECTIBLE_TEMPLATES),
      node("category-anime-prize-figures", "Prize Figures", "Figures made for Japanese arcade prize machines — usually unarticulated, genuinely cheaper.", figureDefaults("category-anime-prize-figures", "Prize figure"), COLLECTIBLE_TEMPLATES),
      node("category-anime-nendoroid-chibi", "Nendoroid & Chibi", "Stylised small-scale figures with swappable faces and parts.", figureDefaults("category-anime-nendoroid-chibi", "Nendoroid / chibi"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-comic-figures", "Comic & Film Figures", "Marvel, DC and the vintage lines that preceded them.", [
      node("category-comic-marvel-legends", "Marvel Legends", "Hasbro's 6-inch articulated Marvel line, including Build-A-Figure waves.", figureDefaults("category-comic-marvel-legends", "Marvel Legends"), COLLECTIBLE_TEMPLATES),
      node("category-comic-dc", "DC Figures", "McFarlane DC Multiverse and the DC lines that came before it.", figureDefaults("category-comic-dc", "DC"), COLLECTIBLE_TEMPLATES),
      node("category-comic-vintage-toybiz", "Vintage Toy Biz", "Pre-Hasbro Toy Biz Marvel figures from the 1990s — a genuine vintage tier.", figureDefaults("category-comic-vintage-toybiz", "Toy Biz (vintage)"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-game-figures", "Game & Franchise Figures", "Figures from games and franchises outside the anime and comic lines.", [
      node("category-game-pokemon-figures", "Pokémon Figures", "Pokémon figures and statues, from Tomy minis to scale pieces.", figureDefaults("category-game-pokemon-figures", "Pokémon"), COLLECTIBLE_TEMPLATES),
      node("category-game-one-piece-figures", "One Piece Figures", "One Piece figures across Banpresto, MegaHouse and the scale lines.", figureDefaults("category-game-one-piece-figures", "One Piece"), COLLECTIBLE_TEMPLATES),
      node("category-game-vocaloid-figures", "Vocaloid Figures", "Hatsune Miku and the wider Vocaloid figure lines.", figureDefaults("category-game-vocaloid-figures", "Vocaloid"), COLLECTIBLE_TEMPLATES),
    ]),
    branch("category-figure-accessories", "Figure Accessories", "Stands, display cases, posters and prints.", [
      node("category-figure-stands-cases", "Stands & Display Cases", "Acrylic stands, dust cases and shelf risers for figure display.", accessoryDefaults("category-figure-stands-cases", "Display case"), PART_TEMPLATES),
      node("category-figure-posters-prints", "Posters & Prints", "Art prints, posters and wall art.", accessoryDefaults("category-figure-posters-prints", "Print"), PART_TEMPLATES),
    ]),
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// Root 4 — Hot Wheels
//
// 🛑 HOT WHEELS ONLY, and that is what makes the tree clean. Mainline is
//    essentially all 1:64, so SCALE stops being a tree axis and becomes a
//    feature — which removes the compromise an earlier draft had to make
//    between splitting by maker sub-line and splitting by scale. The tree is
//    Hot Wheels' own line structure, which is how collectors shop it and what
//    toycollectorsindia's 15,014-product catalogue encodes.
//
//    Twenty other marques the crawl surfaced (Matchbox, Tomica, Mini GT, M2,
//    Greenlight …) are deliberately out of scope; their data stays in
//    docs/research/ so adding one is a seed change, not another crawl.
// ═════════════════════════════════════════════════════════════════════════════

const HOT_WHEELS: CategoryTreeNode = {
  id: "category-hot-wheels",
  name: "Hot Wheels",
  description:
    "Hot Wheels die-cast at 1:64 — Mainline, Premium (Car Culture, Boulevard, Team Transport), Red Line Club, multipacks and track.",
  extra: {
    display: { icon: "🏎️", coverImage: cover("hot-wheels"), color: "#ea580c", showInMenu: true, showInFooter: true },
    contentBody: `<p>Hot Wheels is shelved by line, because line is what sets both the price and what a collector is actually looking for. <strong>Mainline</strong> is the ₹99–299 blister card you find in a supermarket, and it is where the chase variants hide. <strong>Premium</strong> — Car Culture, Boulevard, Team Transport, Fast &amp; Furious, Pop Culture — has metal bases, Real Riders rubber tyres and licensed liveries, typically ₹450–1,500. <strong>Red Line Club</strong> is members-only, produced in small numbers, and prices accordingly.</p>
<p><strong>Treasure Hunts are variants, not a line.</strong> A Treasure Hunt is a specific casting from a mainline wave carrying the flame-circle logo; a Super Treasure Hunt additionally has Spectraflame paint and Real Riders tyres. Because a THT is a variant <em>of</em> a mainline car, it is recorded as a feature on the listing rather than given its own shelf — and a listing claiming a chase without showing the markings should be reported.</p>
<p>One signal specific to this market: the <strong>Indian blister card</strong> differs from the US one, and collectors here price the two differently. It is called out on the listing rather than left for a buyer to spot.</p>`,
    highlights: [
      "Shelved by Hot Wheels' own line structure — Mainline, Premium, RLC, multipacks",
      "Treasure Hunt and Super Treasure Hunt identified on the listing, never inferred",
      "Indian-card releases flagged, because they are priced differently here",
    ],
    faqs: [
      { question: "What is a Treasure Hunt?", answer: "A specific casting within a mainline wave, marked with a flame-circle logo. A Super Treasure Hunt goes further: Spectraflame paint, Real Riders rubber tyres and the TH logo, usually one per case. Both are variants of a mainline car rather than a separate line." },
      { question: "What makes Premium different from Mainline?", answer: "Metal base rather than plastic, Real Riders rubber tyres, licensed liveries and a card designed for display. Typically ₹450–1,500 against Mainline's ₹99–299." },
      { question: "What is the Red Line Club?", answer: "Mattel's paid membership line — small-run castings sold directly to members. Production numbers are low, so RLC releases are the most expensive regular Hot Wheels product and the most counterfeited." },
      { question: "Why does the Indian card matter?", answer: "The Indian-market blister card is printed differently from the US release, and collectors here value the two differently. Listings state which card a car is on rather than leaving you to compare photographs." },
    ],
    seo: {
      title: "Hot Wheels India — Mainline, Premium, RLC, Treasure Hunts | LetItRip",
      description:
        "Buy Hot Wheels die-cast in India — Mainline singles, Premium Car Culture and Team Transport, Red Line Club, multipacks and track. Treasure Hunts and Indian-card releases flagged on the listing.",
      keywords: ["hot wheels india", "treasure hunt hot wheels", "car culture", "red line club", "diecast india"],
    },
  },
  children: [
    branch("category-hw-mainline", "Mainline", "The standard blister-card singles, and where the chase variants are found.", [
      node("category-hw-mainline-series", "Mainline Singles", "Standard Mainline cars by series and wave — the ₹99–299 tier.", diecastDefaults("category-hw-mainline-series", "Mainline"), PART_TEMPLATES),
      node("category-hw-treasure-hunt", "Treasure Hunts", "Treasure Hunt and Super Treasure Hunt castings, with the markings photographed.", diecastDefaults("category-hw-treasure-hunt", "Treasure Hunt"), PART_TEMPLATES),
    ]),
    branch("category-hw-premium", "Premium", "Metal-base, Real Riders, licensed-livery lines on display-oriented cards.", [
      node("category-hw-car-culture", "Car Culture", "The flagship Premium series, themed by car scene rather than by model.", diecastDefaults("category-hw-car-culture", "Car Culture"), PART_TEMPLATES),
      node("category-hw-boulevard", "Boulevard", "Premium singles on an oversized collector card.", diecastDefaults("category-hw-boulevard", "Boulevard"), PART_TEMPLATES),
      node("category-hw-team-transport", "Team Transport", "A Premium car paired with its transporter — two vehicles per release.", diecastDefaults("category-hw-team-transport", "Team Transport"), PART_TEMPLATES),
      node("category-hw-fast-and-furious", "Fast & Furious", "The licensed Fast & Furious Premium series.", diecastDefaults("category-hw-fast-and-furious", "Fast & Furious"), PART_TEMPLATES),
      node("category-hw-pop-culture", "Pop Culture", "Premium castings in licensed non-automotive liveries.", diecastDefaults("category-hw-pop-culture", "Pop Culture"), PART_TEMPLATES),
    ]),
    node("category-hw-rlc", "Red Line Club", "Members-only small-run releases sold directly by Mattel — the most expensive regular Hot Wheels tier.", diecastDefaults("category-hw-rlc", "Red Line Club"), PART_TEMPLATES),
    branch("category-hw-multipacks", "Multipacks", "Gift packs and multi-car sets.", [
      node("category-hw-gift-packs", "Gift Packs", "Themed boxed sets, often carrying an exclusive casting.", diecastDefaults("category-hw-gift-packs", "Gift pack"), SEALED_TEMPLATES),
      node("category-hw-5-packs", "5-Packs", "Five-car themed packs.", diecastDefaults("category-hw-5-packs", "5-pack"), SEALED_TEMPLATES),
      node("category-hw-10-packs", "10-Packs", "Ten-car bulk packs.", diecastDefaults("category-hw-10-packs", "10-pack"), SEALED_TEMPLATES),
    ]),
    node("category-hw-track-accessories", "Track & Accessories", "Track sets, connectors, loops, launchers and display cases.", accessoryDefaults("category-hw-track-accessories", "Track set"), SEALED_TEMPLATES),
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// Root 5 — Model Kits
// ═════════════════════════════════════════════════════════════════════════════

const MODEL_KITS: CategoryTreeNode = {
  id: "category-model-kits",
  name: "Model Kits",
  description:
    "Snap-fit and glue model kits — Gunpla across every grade, Pokémon kits, and the tools and paints to finish them.",
  extra: {
    display: { icon: "🔧", coverImage: cover("model-kits"), color: "#2563eb", showInMenu: true, showInFooter: false },
    contentBody: `<p>Gunpla is graded, and the grade tells you both the size and how much work is involved. <strong>High Grade (HG)</strong> is 1:144 and snap-fit in an afternoon. <strong>Real Grade (RG)</strong> is the same scale with an inner frame and far more parts. <strong>Master Grade (MG)</strong> is 1:100 with a full internal skeleton. Grade, not price, is the right thing to shop on first — an HG and an MG of the same suit are different projects, not different budgets.</p>
<p>Kits here are sold sealed. A started or part-built kit is listed as pre-owned with its sprue state described, because a kit missing one runner is not a kit.</p>`,
    highlights: [
      "Gunpla shelved by grade, because grade is the real difference between two kits of the same suit",
      "Tools and nippers listed alongside, since a snap-fit kit still needs a decent cutter",
    ],
    faqs: [
      { question: "What is the difference between HG, RG and MG?", answer: "High Grade is 1:144 and the simplest build. Real Grade is 1:144 with an articulated inner frame and many more parts. Master Grade is 1:100 with a full internal skeleton and the most detail. They are different projects at different part counts, not just different prices." },
      { question: "Do I need glue or paint for a Gunpla kit?", answer: "No. Gunpla is snap-fit and pre-coloured, and builds without glue or paint. A good pair of nippers is worth having — a blunt cutter leaves nub marks that no amount of care removes." },
      { question: "Can I buy a part-built kit?", answer: "Yes, listed as pre-owned with its sprue state described. Check it carefully: a kit missing a single runner cannot be completed, so the listing must say what is present." },
    ],
  },
  children: [
    branch("category-gundam-kits", "Gundam Kits (Gunpla)", "Bandai Gunpla across the grades.", [
      node("category-gunpla-hg", "High Grade (HG)", "1:144 snap-fit kits — the entry point, and the broadest selection.", tcgDefaults("category-gunpla-hg", "Gunpla", "Sealed"), SEALED_TEMPLATES),
      node("category-gunpla-rg", "Real Grade (RG)", "1:144 with an articulated inner frame and a much higher part count.", tcgDefaults("category-gunpla-rg", "Gunpla", "Sealed"), SEALED_TEMPLATES),
      node("category-gunpla-mg", "Master Grade (MG)", "1:100 with a full internal skeleton — the detail tier.", tcgDefaults("category-gunpla-mg", "Gunpla", "Sealed"), SEALED_TEMPLATES),
    ]),
    node("category-pokemon-model-kits", "Pokémon Model Kits", "Bandai's Pokémon Model Kit line — snap-fit, no paint required.", tcgDefaults("category-pokemon-model-kits", "Pokémon Model Kit", "Sealed"), SEALED_TEMPLATES),
    node("category-kit-tools", "Tools & Paints", "Nippers, files, panel liners, cement and paint for kit building.", accessoryDefaults("category-kit-tools", "Modelling tool"), PART_TEMPLATES),
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// Root 6 — Living Collectibles
//
// Deliberately off the collectibles theme. The `live` listing type's fields
// (species, sex, CITES, jurisdiction) only make sense for actual animals and
// plants, and its fixtures are explicitly off-catalogue demo content. They
// previously carried `categorySlugs: []`, which made them unreachable from
// every category and brand page.
// ═════════════════════════════════════════════════════════════════════════════

const LIVING_COLLECTIBLES: CategoryTreeNode = {
  id: "category-living-collectibles",
  name: "Living Collectibles",
  description:
    "Live animals and plants from vetted sellers — every listing carries jurisdiction and welfare information, and ships only where it is legal to do so.",
  extra: {
    display: { icon: "🌱", coverImage: cover("living-collectibles"), color: "#16a34a", showInMenu: true, showInFooter: false },
    highlights: [
      "Sellers must be verified before a live listing goes public",
      "Jurisdiction checks run at checkout — a listing that cannot legally ship to you will not let you buy it",
      "Species, age and provenance disclosed on every listing",
    ],
    faqs: [
      { question: "How are live animals shipped?", answer: "They generally are not. Most live listings are local-collection only and the listing states the collection area; where courier transport is lawful and appropriate, the seller arranges a specialist live-animal service." },
      { question: "What happens if a species is not allowed in my state?", answer: "Checkout blocks it. Each live listing records where it may lawfully go, and the jurisdiction check runs before payment rather than after." },
    ],
  },
  children: [
    branch("category-companion-animals", "Companion Animals", "Dogs, reptiles and other companion animals from verified sellers.", [
      node("category-animals-dogs", "Dogs", "Puppies and adult dogs from health-screened, vetted breeders.", livingDefaults(), undefined, [
        node("category-dogs-retrievers", "Retrievers", "Golden and Labrador retrievers.", livingDefaults()),
      ]),
      node("category-animals-reptiles", "Reptiles", "Captive-bred reptiles with documented provenance.", livingDefaults(), undefined, [
        node("category-reptiles-lizards", "Lizards", "Bearded dragons, geckos and other commonly kept lizards.", livingDefaults()),
      ]),
    ]),
    branch("category-live-plants", "Live Plants", "Cultivated plants, specimen trees and the tools to keep them.", [
      node("category-plants-bonsai", "Bonsai", "Trained bonsai specimens, sold with their age and training history.", livingDefaults(), undefined, [
        node("category-bonsai-juniper", "Juniper Bonsai", "Juniper specimens — the most widely grown bonsai species.", livingDefaults()),
      ]),
    ]),
  ],
};

export const CATEGORY_FOREST: CategoryTreeNode[] = [
  SPINNING_TOPS,
  TRADING_CARDS,
  COLLECTIBLE_FIGURES,
  HOT_WHEELS,
  MODEL_KITS,
  LIVING_COLLECTIBLES,
];

/*
 * Keeps `marketBand` honest: a band keyed on a leaf id that no longer exists is
 * dead weight that reads as coverage. Asserted by the seed, not here, because
 * this module must stay a pure literal.
 */
export { marketBand };
