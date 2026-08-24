/*
 * WHY: The category tree the seed shipped was two levels deep with a single
 *      root — so `categoryType:"sublisting"` (documented as "tier-4 leaf groups
 *      under a parent category") was structurally unreachable, no page ever
 *      exercised a mid-tier rollup, and the three live-item products had no
 *      category at all because nothing in a Beyblade-only tree fit them.
 * WHAT: The authoring literal for a 4-level, TWO-root forest. Structural fields
 *       (parentIds/ancestors/tier/path/position/subtreeSize/…) are derived by
 *       `buildCategoryTree`, never written here.
 *
 * EXPORTS:
 *   CATEGORY_FOREST — nested CategoryTreeNode[] consumed by categories-seed-data
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:derived
 * @tag access:server-only
 * @tag consumers:seed/categories-seed-data.ts
 * @tag sideEffects:none
 */

import type { CategoryTreeNode } from "./category-tree";
import { seedExtMedia } from "./media";

const cover = (slug: string) =>
  seedExtMedia(`https://picsum.photos/seed/category-image-${slug}-20260101/1200/600`);

// ─────────────────────────────────────────────────────────────────────────────
// Root 1 — Spinning Tops. The Beyblade catalogue, four generations deep:
//   generation -> part-family -> specific line
// ─────────────────────────────────────────────────────────────────────────────
const SPINNING_TOPS: CategoryTreeNode = {
  id: "category-spinning-tops",
  name: "Spinning Tops",
  description:
    "Collectible spinning tops and battle systems — Beyblade Original, Metal Fight, Burst, X, and the gear that goes with them.",
  extra: {
    isFeatured: true,
    featuredPriority: 1,
    showOnHomepage: true,
    display: { icon: "🌀", coverImage: cover("spinning-tops"), color: "#0891b2", showInMenu: true, showInFooter: true },
    highlights: [
      "Every era of Beyblade in one place — Original, Metal Fight, Burst, and X",
      "Verified sellers with condition-graded listings",
      "Auctions, pre-orders, and prize draws alongside straightforward buy-now listings",
    ],
    faqs: [
      { question: "What's the difference between the four Beyblade generations?", answer: "Original (1999-2003) started the franchise with ripcord launchers; Metal Fight (2008-2013) added metal-weighted tops; Burst (2015-present) introduced tops that burst apart on hard hits; X (2023-present) uses the new Xtreme Gear system with clip-on parts." },
      { question: "Are used tops sold here safe to battle with?", answer: "Every listing shows a condition rating (New/Like New/Good/Used) and sellers are expected to disclose any chips or cracks — check the condition badge and item photos before buying." },
    ],
    seo: { title: "Spinning Tops | LetItRip", description: "Buy Beyblade and spinning tops — Original, Metal Fight, Burst, X, and accessories.", keywords: ["beyblade", "spinning tops", "beyblade x", "beyblade burst"] },
  },
  children: [
    {
      id: "category-beyblade-original",
      name: "Beyblade Original",
      description:
        "The original Beyblade series (1999–2003) by Takara — Plastic Generation tops, Engine Gear, HMS, and the launchers that started the franchise.",
      extra: {
        display: { icon: "🪀", coverImage: cover("beyblade-original"), color: "#b45309", showInMenu: true, showInFooter: false },
        highlights: [
          "The tops that started it all in 1999",
          "Ripcord launcher compatible with the full original-series lineup",
          "A favourite among vintage collectors — sealed pieces command a premium",
        ],
        faqs: [
          { question: "Will an original-series top work with a Burst or X launcher?", answer: "No — each generation uses its own launcher and ripcord system. Original-series tops need an original-series launcher." },
          { question: "How do I tell a genuine Takara release from a reprint?", answer: "Check the sticker finish and base stamp under good lighting — sellers with vintage-collectible tagged listings usually note authentication details in the description." },
        ],
      },
      children: [
        {
          id: "category-original-tops",
          name: "Original Tops",
          description: "Complete original-series Beyblades, from the first Plastic Generation releases through HMS.",
          children: [
            { id: "category-original-plastic-gen", name: "Plastic Generation", description: "The 1999–2002 plastic-series tops — the first four seasons of the franchise." },
            { id: "category-original-hms", name: "Heavy Metal System", description: "The 2003 HMS line, the last and heaviest of the original generation." },
          ],
        },
        {
          id: "category-original-launchers",
          name: "Original Launchers",
          description: "Ripcord launchers, grips and winders for original-series tops.",
          children: [
            { id: "category-original-ripcord-launchers", name: "Ripcord Launchers", description: "The classic pull-cord launchers used across the original series." },
          ],
        },
      ],
    },
    {
      id: "category-beyblade-metal",
      name: "Beyblade Metal Fight",
      description:
        "The Metal Fight era — Metal Fusion, Metal Masters, Metal Fury and Zero-G. Metal-weighted tops and their swappable part system.",
      extra: {
        display: { icon: "⚙️", coverImage: cover("beyblade-metal"), color: "#64748b", showInMenu: true, showInFooter: false },
        highlights: [
          "Metal-weighted tops for serious attack and defense power",
          "Covers all four Metal Fight sub-generations: Fusion, Masters, Fury, Zero-G",
          "Popular with tournament players for their heavier base weight",
        ],
        faqs: [
          { question: "What does the code after a top's name mean (e.g. \"105RF\")?", answer: "It's the track height and bottom type — 105RF means a 105-height track with a Rubber Flat bottom. Swapping tracks and bottoms lets you tune stamina vs. attack." },
          { question: "Can Metal Fight tops battle Burst tops in the same stadium?", answer: "Physically yes if the stadium size matches, but they don't burst apart on impact the way Burst tops do — most local groups keep the generations separate for fair play." },
        ],
      },
      children: [
        {
          id: "category-metal-tops",
          name: "Metal Fight Tops",
          description: "Complete Metal Fight Beyblades across all four sub-generations.",
          children: [
            { id: "category-metal-fusion", name: "Metal Fusion", description: "The 2008 debut wave that introduced the metal-wheel system." },
            { id: "category-metal-masters", name: "Metal Masters", description: "The 4D-precursor wave, with heavier fusion wheels and tighter tolerances." },
            { id: "category-metal-fury", name: "Metal Fury", description: "The 4D System wave — multi-mode wheels and switchable bottoms." },
          ],
        },
        {
          id: "category-metal-parts",
          name: "Metal Fight Parts",
          description: "Individual face bolts, energy rings, tracks and tips for building custom Metal Fight combos.",
          children: [
            { id: "category-metal-energy-rings", name: "Energy Rings", description: "The clear upper ring that sets a Metal Fight top's spin balance." },
            { id: "category-metal-tracks-tips", name: "Tracks & Tips", description: "Spin tracks and performance tips — the height and floor contact of a build." },
          ],
        },
      ],
    },
    {
      id: "category-beyblade-burst",
      name: "Beyblade Burst",
      description:
        "Beyblade Burst by Takara-Tomy and Hasbro — tops that burst apart on impact, with swappable Layer / Disc / Driver parts.",
      extra: {
        isFeatured: true,
        display: { icon: "💥", coverImage: cover("beyblade-burst"), color: "#059669", showInMenu: true, showInFooter: false },
        highlights: [
          "Tops that burst apart on a hard enough hit — a whole new battle mechanic",
          "Swappable Layer / Disc / Driver parts for build customization",
          "The most actively traded generation on the platform",
        ],
        faqs: [
          { question: "What's the difference between a Layer, Disc and Driver?", answer: "Layer is the top piece (attack profile), Disc sits underneath it (weight/stamina), Driver is the tip that touches the stadium floor (spin behaviour). Mixing and matching lets you build custom combos." },
          { question: "Is a burst during battle bad for the top?", answer: "No — Burst tops are designed to separate on hard impacts as the game's core mechanic, then click back together for the next battle." },
        ],
      },
      children: [
        {
          id: "category-burst-tops",
          name: "Burst Tops",
          description: "Complete Burst-system Beyblades across every Burst wave.",
          children: [
            { id: "category-burst-classic", name: "Burst Classic", description: "The original 2015–2017 Burst waves, before the Cho-Z metal upgrade." },
            { id: "category-burst-cho-z", name: "Cho-Z", description: "The metal-layer Cho-Z wave — heavier layers and much higher burst resistance." },
            { id: "category-burst-superking", name: "Superking", description: "The Sparking / Superking wave with its five-sided ratchet and chip system." },
          ],
        },
        {
          id: "category-burst-parts",
          name: "Burst Parts",
          description: "Individual Layers, Discs and Drivers for building custom Burst combos.",
          children: [
            { id: "category-burst-layers", name: "Layers", description: "The top piece — sets a Burst combo's attack profile and burst resistance." },
            { id: "category-burst-discs", name: "Discs", description: "The middle weight component, tuning stamina and balance." },
            { id: "category-burst-drivers", name: "Drivers", description: "The floor-contact tip that decides how a Burst combo moves." },
          ],
        },
      ],
    },
    {
      id: "category-beyblade-x",
      name: "Beyblade X",
      description:
        "Beyblade X by Takara-Tomy — the current generation, built around the Xtreme Gear system and its Blade / Ratchet / Bit parts.",
      extra: {
        isFeatured: true,
        display: { icon: "💫", coverImage: cover("beyblade-x"), color: "#0d9488", showInMenu: true, showInFooter: false },
        highlights: [
          "The newest generation — Xtreme Gear system launched in 2023",
          "Faster clip-on part swaps than any previous generation",
          "Actively growing tournament scene with new waves releasing regularly",
        ],
        faqs: [
          { question: "Do I need new stadiums for Beyblade X?", answer: "X-format tops battle best in the wider X-format stadiums, though many X tops still spin in older round stadiums — check a listing's description for stadium compatibility notes." },
          { question: "What does the Blade / Ratchet / Bit naming mean?", answer: "Beyblade X renamed the part system — Blade (top piece), Ratchet (middle, sets height), Bit (bottom tip) — functionally similar to Burst's Layer/Disc/Driver but not physically interchangeable with them." },
        ],
      },
      children: [
        {
          id: "category-x-tops",
          name: "Beyblade X Tops",
          description: "Complete Beyblade X tops — starters and boosters.",
          children: [
            { id: "category-x-starters", name: "Starter Sets", description: "Top plus launcher — the entry point into the X format." },
            { id: "category-x-boosters", name: "Boosters", description: "Top-only releases for players who already own a launcher." },
          ],
        },
        {
          id: "category-x-parts",
          name: "Beyblade X Parts",
          description: "Individual Blades, Ratchets and Bits for custom X builds.",
          children: [
            { id: "category-x-blades", name: "Blades", description: "The upper piece that defines an X combo's attack shape." },
            { id: "category-x-ratchets", name: "Ratchets", description: "The middle component that sets height and weight distribution." },
            { id: "category-x-bits", name: "Bits", description: "The floor-contact tip — the X-format equivalent of a Driver." },
          ],
        },
      ],
    },
    {
      id: "category-battle-gear",
      name: "Battle Gear",
      description:
        "Everything that isn't a top — stadiums, storage and the accessories that make a battle setup work.",
      extra: {
        display: { icon: "🏟️", coverImage: cover("battle-gear"), color: "#7c3aed", showInMenu: true, showInFooter: false },
        highlights: [
          "Tournament-legal stadiums for every generation",
          "Storage and transport built for part collections, not just complete tops",
        ],
        faqs: [
          { question: "Is one stadium enough for all four generations?", answer: "Mostly — older round stadiums handle Original through Burst fine. Beyblade X's Xtreme Line stadiums add a rail feature X tops are designed around, so serious X play wants an X-format stadium." },
        ],
      },
      children: [
        {
          id: "category-gear-stadiums",
          name: "Stadiums",
          description: "Battle stadiums, from pocket-sized to tournament-grade.",
          children: [
            { id: "category-stadiums-standard", name: "Standard Stadiums", description: "Round stadiums suiting Original, Metal Fight and Burst play." },
            { id: "category-stadiums-xtreme", name: "Xtreme Stadiums", description: "X-format stadiums with the Xtreme Line rail feature." },
          ],
        },
        {
          id: "category-gear-storage",
          name: "Storage & Care",
          description: "Cases, trays and maintenance gear for a growing collection.",
          children: [
            { id: "category-storage-cases", name: "Cases & Trays", description: "Hard cases and compartment trays for tops and loose parts." },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Root 2 — Living Collectibles.
//
// Deliberately off the Beyblade theme, for two reasons. First, the `live`
// listing type's fields (species, sex, CITES/jurisdiction) only make sense for
// actual animals and plants, and its three seed fixtures are explicitly
// off-catalogue demo content. They previously carried `categorySlugs: []` and
// no brand, which made them unreachable from every category and brand page —
// and, once empty tabs hide, would have meant the Live Items tab never appeared
// anywhere at all. Second, the seed had only ever had ONE root, so no page had
// ever exercised a multi-root tree.
// ─────────────────────────────────────────────────────────────────────────────
const LIVING_COLLECTIBLES: CategoryTreeNode = {
  id: "category-living-collectibles",
  name: "Living Collectibles",
  description:
    "Live animals and plants from vetted sellers — every listing carries jurisdiction and welfare information, and ships only where it is legal to do so.",
  extra: {
    display: { icon: "🌱", coverImage: cover("living-collectibles"), color: "#16a34a", showInMenu: true, showInFooter: false },
    highlights: [
      "Sellers must be verified before a live listing goes public",
      "Jurisdiction checks run at checkout — a listing that can't legally ship to you won't let you buy it",
      "Species, age and provenance disclosed on every listing",
    ],
    faqs: [
      { question: "How are live animals shipped?", answer: "They generally aren't — most live listings are local-collection only, and the listing states the collection area. Where courier transport is legal and appropriate, the seller arranges a specialist live-animal service." },
      { question: "What happens if a species isn't allowed in my state?", answer: "Checkout blocks it. Each live listing records where it may lawfully go, and the jurisdiction check runs before payment rather than after." },
    ],
  },
  children: [
    {
      id: "category-companion-animals",
      name: "Companion Animals",
      description: "Dogs, reptiles and other companion animals from verified sellers.",
      children: [
        {
          id: "category-animals-dogs",
          name: "Dogs",
          description: "Puppies and adult dogs from health-screened, vetted breeders.",
          children: [
            { id: "category-dogs-retrievers", name: "Retrievers", description: "Golden and Labrador retrievers." },
          ],
        },
        {
          id: "category-animals-reptiles",
          name: "Reptiles",
          description: "Captive-bred reptiles with documented provenance.",
          children: [
            { id: "category-reptiles-lizards", name: "Lizards", description: "Bearded dragons, geckos and other commonly kept lizards." },
          ],
        },
      ],
    },
    {
      id: "category-live-plants",
      name: "Live Plants",
      description: "Cultivated plants, specimen trees and the tools to keep them.",
      children: [
        {
          id: "category-plants-bonsai",
          name: "Bonsai",
          description: "Trained bonsai specimens, sold with their age and training history.",
          children: [
            { id: "category-bonsai-juniper", name: "Juniper Bonsai", description: "Juniper specimens — the most widely grown bonsai species." },
          ],
        },
      ],
    },
  ],
};

export const CATEGORY_FOREST: CategoryTreeNode[] = [
  SPINNING_TOPS,
  LIVING_COLLECTIBLES,
];
