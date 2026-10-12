/**
 * D1 — SECTION templates, each carrying a TYPED builder state.
 *
 * 🛑 WHY A TEMPLATE IS NOT A `SectionConfig`, which is the whole design.
 *
 * `SectionConfig` is a NON-discriminated union of 25 untagged interfaces — the
 * tag lives on the parent `HomepageSectionDocument.type` — and
 * `section-renderer.tsx` narrows it by unchecked cast at every one of its 25
 * arms (`config as CarouselSectionConfig`). So a template written as a raw
 * config gets no compile-time checking at all, and `section-renderer`'s silent
 * `default: return null` means a wrong `type` renders NOTHING rather than
 * erroring.
 *
 * Every section type already has a typed triple —
 * `DEFAULT_<TYPE>_BUILDER` / `build<Type>Config()` / `parse<Type>Builder()`,
 * 25 of each. A template declared as a union discriminated on `sectionType`
 * and carrying the matching `…BuilderState` is therefore checked end to end,
 * and the config is produced by the existing `build…Config` rather than
 * hand-written.
 *
 * That is not hypothetical. `DEFAULT_FAQ_BUILDER.categories` carried
 * `["general", "shipping", "returns"]` — **two of the three were values no FAQ
 * document has ever had** — and collapsing the `FAQCategory` union is what
 * surfaced it. A typed template is the kind of thing that catches.
 *
 * 🛑 NOT a whole-page layout. The plan's earlier `HomepageLayoutRecord` was
 * replaced for four reasons: applying a page is all-or-nothing and discards
 * per-row admin edits; sections are already independent documents, so the
 * section is the natural unit of reuse and the page is not; we do not want any
 * competitor's homepage wholesale (BAS's 5,540 words is the honest benchmark
 * while TCI's article-inlining is an anti-pattern, and the SEO leader has the
 * FEWEST products and words); and `AdminSectionsView` — 2,755 lines with
 * drag-drop, a 30-deep undo stack and revert-to-server — stays untouched
 * because a template becomes *create-with-preset*, which is a dropdown and a
 * spread.
 *
 * 🛑 And deliberately NO `siteSettings.homepageLayout`. `homepageSections`
 * stays the single source of truth for what renders; a second place a section
 * could come from is how the page and the admin label end up disagreeing with
 * no way to tell which lied.
 */

import type { SectionType } from "../../../homepage/schemas/firestore";
import {
  type CategoriesBuilderState,
  type TrustIndicatorsBuilderState,
  type FAQBuilderState,
  type BlogBuilderState,
  type ProductsBuilderState,
  type CustomCardsBuilderState,
  DEFAULT_CATEGORIES_BUILDER,
  DEFAULT_TRUST_INDICATORS_BUILDER,
  DEFAULT_FAQ_BUILDER,
  DEFAULT_BLOG_BUILDER,
  DEFAULT_PRODUCTS_BUILDER,
  DEFAULT_CUSTOM_CARDS_BUILDER,
} from "./adminSectionsTypes";

/** Shared metadata every arm carries. */
interface SectionTemplateBase {
  id: string;
  label: string;
  /** Which `CompetitorProfile` the shape came from. */
  sourceProfileId?: string;
  /** What makes it work, from the crawl — shown beside the picker. */
  notes?: string;
}

/**
 * 🛑 Discriminated on `sectionType`, so `builder` is narrowed to exactly the
 * right state type. This is the property a raw-config template cannot have.
 *
 * Only the types that have a shipped template appear here. A type with no
 * template is simply absent — the picker renders nothing for it, which is
 * correct and is why this is a union rather than a
 * `Record<SectionType, Template>` that would oblige a template per type.
 */
export type SectionTemplate =
  | (SectionTemplateBase & { sectionType: "categories"; builder: CategoriesBuilderState })
  | (SectionTemplateBase & { sectionType: "trust-indicators"; builder: TrustIndicatorsBuilderState })
  | (SectionTemplateBase & { sectionType: "faq"; builder: FAQBuilderState })
  | (SectionTemplateBase & { sectionType: "blog-articles"; builder: BlogBuilderState })
  | (SectionTemplateBase & { sectionType: "products"; builder: ProductsBuilderState })
  | (SectionTemplateBase & { sectionType: "custom-cards"; builder: CustomCardsBuilderState });

/**
 * What the crawl actually measured, so a template can say WHY its shape works
 * rather than asserting that it does.
 *
 * Seeded from `docs/research/competitor-crawl-2026-10/` — the numbers already
 * exist and are already attributed, so this is a reference rather than a new
 * claim.
 */
export interface CompetitorProfile {
  id: string;
  label: string;
  platform: string;
  measured: {
    products: number;
    soldOutShare: number;
    medianPrice: number | null;
    homepageWords: number | null;
    uniqueInternalLinks: number | null;
    jsonLdTypes: number | null;
  };
  takeaway: string;
}

export const COMPETITOR_PROFILES: readonly CompetitorProfile[] = [
  {
    id: "worldhobbyshop",
    label: "worldhobbyshop.in",
    platform: "WooCommerce",
    measured: {
      products: 1195,
      soldOutShare: 0.885,
      medianPrice: 899,
      homepageWords: 1816,
      uniqueInternalLinks: 79,
      jsonLdTypes: 8,
    },
    takeaway:
      "The SEO leader of the fifteen, and it has the FEWEST products and words on its homepage — 8 product cards and one rail. Its advantage is taxonomy routing (6 generation tiles plus a 25-link systems matrix) and a 10-question FAQ, not merchandising volume.",
  },
  {
    id: "beybladeartshop",
    label: "beybladeartshop.com",
    platform: "Shopify",
    measured: {
      products: 1914,
      soldOutShare: 0.811,
      medianPrice: 1599,
      homepageWords: 5540,
      uniqueInternalLinks: 57,
      jsonLdTypes: 3,
    },
    takeaway:
      "The honest benchmark for curated homepage copy at 5,540 words, and the best product prose of the fifteen (2,814 descriptions, median 346 chars). Runs anti-counterfeit copy as hero slide 5.",
  },
  {
    id: "toycollectorsindia",
    label: "toycollectorsindia.com",
    platform: "Shopify",
    measured: {
      products: 15014,
      soldOutShare: 0.87,
      medianPrice: 899,
      homepageWords: 7430,
      uniqueInternalLinks: null,
      jsonLdTypes: 4,
    },
    takeaway:
      "🛑 The word-count leader is NOT the benchmark: 3,926 of its 7,430 words are four blog posts inlined whole, duplicating its own canonical URLs. Strip those and it sits below BAS. It IS the checkout-breadth benchmark — three gateways, gift wrap, compare, express checkout.",
  },
  {
    id: "tcgindia",
    label: "tcgindia.in",
    platform: "custom Next.js",
    measured: {
      products: 272,
      soldOutShare: 0,
      medianPrice: null,
      homepageWords: null,
      uniqueInternalLinks: null,
      jsonLdTypes: 9,
    },
    takeaway:
      "The best SEO architecture of the fifteen — 15 city landing pages, a game→set hierarchy, 28 rules posts, and a per-product FAQPage. Nobody else emits per-product FAQ markup.",
  },
] as const;

/**
 * The shipped templates.
 *
 * 🛑 Each one is a shape the crawl MEASURED, not a guess — and each is an
 * independent pick. We want WHS's generation tiles, BAS's trust strip and
 * their FAQ density separately, which is exactly what per-section templating
 * allows and a whole-page layout does not.
 */
export const SECTION_TEMPLATES: readonly SectionTemplate[] = [
  {
    id: "categories-generation-tiles",
    label: "Shop by generation (worldhobbyshop)",
    sectionType: "categories",
    sourceProfileId: "worldhobbyshop",
    notes:
      "Taxonomy routing, not merchandising — WHS's single biggest SEO asset. Six tiles, no autoscroll: a tile grid is a navigation aid and a moving one is harder to use, not more engaging.",
    builder: {
      ...DEFAULT_CATEGORIES_BUILDER,
      title: "Shop by generation",
      viewMoreLabel: "All categories →",
      maxCategories: 6,
      autoScroll: false,
      loop: false,
    },
  },
  {
    id: "trust-strip-four",
    label: "Four-item trust strip (beybladeartshop)",
    sectionType: "trust-indicators",
    sourceProfileId: "beybladeartshop",
    notes:
      "BAS's hero strip. Each item is a claim this platform can actually keep — the fourth is authenticity, which is the one competitors with no labelling system cannot say.",
    builder: {
      ...DEFAULT_TRUST_INDICATORS_BUILDER,
      title: "",
      indicators: [
        { id: "trust-originals", icon: "shield-check", title: "Authenticity, labelled", description: "Original, reproduction or unverified on every listing — never a silent claim." },
        { id: "trust-escrow", icon: "lock", title: "Money held until delivery", description: "We hold payment in escrow, so a claim pays from funds we already have." },
        { id: "trust-india", icon: "truck", title: "India-wide shipping", description: "Delhivery, Blue Dart, DTDC and India Post, with tracking on every order." },
        { id: "trust-rare", icon: "search", title: "Rare and pre-owned", description: "Four generations of Beyblade, including the lines that are long out of production." },
      ],
    },
  },
  {
    id: "faq-ten-question",
    label: "Ten-question FAQ (worldhobbyshop)",
    sectionType: "faq",
    sourceProfileId: "worldhobbyshop",
    notes:
      "The densest single SEO win on the page and an answer-engine surface — it feeds faqJsonLd. 🛑 `categories` is left EMPTY on purpose: it is only a fallback TAB list, and a hand-written one drifts out from under the priority-ordered slice, which is how all three homepage FAQ tabs came to render empty panels.",
    builder: {
      ...DEFAULT_FAQ_BUILDER,
      title: "Frequently Asked Questions",
      subtitle: "The questions new buyers ask most.",
      displayCount: 10,
      showOnHomepage: true,
      linkToFullPage: true,
      viewMoreLabel: "View all FAQs →",
      categories: [],
    },
  },
  {
    id: "blog-four-excerpts",
    label: "Four article excerpts (beybladeartshop)",
    sectionType: "blog-articles",
    sourceProfileId: "beybladeartshop",
    notes:
      "🛑 EXCERPTS, never bodies. toycollectorsindia inlines 3,926 words of full article text into its homepage, duplicating its own canonical blog URLs — which is why its 7,430-word homepage is not the benchmark and BAS's 5,540 is.",
    builder: {
      ...DEFAULT_BLOG_BUILDER,
      title: "From the collector blog",
      viewMoreLabel: "All articles →",
      maxArticles: 4,
      showReadTime: true,
      showAuthor: true,
      showThumbnails: true,
    },
  },
  {
    id: "products-recently-added",
    label: "One 'recently added' rail (worldhobbyshop)",
    sectionType: "products",
    sourceProfileId: "worldhobbyshop",
    notes:
      "WHS runs exactly ONE product rail on the page and leads the fifteen on SEO. The temptation is four rails; the evidence says one, with the taxonomy tiles doing the routing.",
    builder: {
      ...DEFAULT_PRODUCTS_BUILDER,
      title: "Recently added",
      viewMoreLabel: "Browse everything →",
      maxItems: 8,
      status: "published",
      featuredOnly: false,
      inStockOnly: true,
      autoScroll: false,
    },
  },
  {
    id: "custom-cards-systems-matrix",
    label: "Systems matrix — 29 internal links (worldhobbyshop)",
    sectionType: "custom-cards",
    sourceProfileId: "worldhobbyshop",
    notes:
      "Most of why WHS has 79 unique internal links against BAS's 57. 🛑 `custom-cards`, NOT `collection-cards` — the latter caps at COLLECTION_CARDS_MAX_ENTRIES = 3 and its entries are live-content queries, so it cannot express a link matrix at all. Fill the cards from the real category ids; `audit-section-config-links` fails the build on a dead one.",
    builder: {
      ...DEFAULT_CUSTOM_CARDS_BUILDER,
      title: "Every system, every part family",
    },
  },
] as const;

/** Templates offered for one section type — empty when none is shipped. */
export function templatesForType(type: SectionType): readonly SectionTemplate[] {
  return SECTION_TEMPLATES.filter((t) => t.sectionType === type);
}

export function templateById(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((t) => t.id === id);
}

export function profileById(id: string | undefined): CompetitorProfile | undefined {
  return id ? COMPETITOR_PROFILES.find((p) => p.id === id) : undefined;
}
