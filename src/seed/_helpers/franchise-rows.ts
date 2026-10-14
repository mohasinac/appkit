/*
 * WHY: a product's BRAND is who made it (Takara-Tomy); its FRANCHISE is what
 *      it is from (Beyblade). The site had no way to express the second, while
 *      `CharacterHotspot` shipped eighteen `/franchise/*` links to a route that
 *      did not exist. This is that unit, modelled on brands per the explicit
 *      instruction — "like brands make franchise its own separate unit".
 *
 * WHAT: one factory plus eight declarations.
 *
 * EXPORTS:
 *   FRANCHISE_ROWS       — Partial<CategoryDocument>[], categoryType:"franchise"
 *   FRANCHISE_ROW_COUNT  — asserted by the seed so a silent drop is loud
 *
 * ── 🛑 THE DEAD-FACET RULE, AND HOW THESE OBEY IT ─────────────────────────
 *
 * `brand-rows.ts` trap 3 states it exactly: *"A brand row with no product is a
 * DEAD FACET, and worse than absent — it renders as a card in the grid that
 * opens an empty page."* Seven of the eight rows below have no stock today,
 * because this catalogue sells Beyblade.
 *
 * So they are seeded **`isActive: false`**. That is not a soft delete — the row
 * exists, it is editable in the admin category editor, its page resolves, and
 * `/franchise/marvel` stops being a 404. It is excluded from the grid and from
 * search until it has something to sell, at which point one flag flips.
 *
 * The alternative readings were both worse: omitting them leaves eighteen links
 * broken, and seeding them active puts seven empty shopfronts on a live grid.
 *
 * 🛑 `isActive` is therefore load-bearing here, not boilerplate. A future
 * franchise row should be `false` until a product carries its `franchiseSlug`.
 *
 * ── Why tier-0 and outside the forest ─────────────────────────────────────
 *
 * Same as brands: `position` is NOT set, because these live outside the
 * category forest's DFS numbering and a position inside it would corrupt the
 * ranges `onCategoryWrite` shifts on insert.
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:shared-literal
 * @tag access:server-only
 * @tag consumers:seed/categories-seed-data.ts
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../../features/categories/schemas";
/* 🛑 `constants/field-names`, NOT the schema copy — there are two
 * `CATEGORY_FIELDS` and only this one carries `CATEGORY_TYPE_VALUES`.
 * `categories-seed-data.ts` imports this one; matching it is what keeps the
 * discriminator a single spelling. Same reasoning as `brand-rows.ts`. */
import { CATEGORY_FIELDS } from "../../constants/field-names";
import { seedPhoto } from "./media";

export interface FranchiseSeedInput {
  /** Without the `franchise-` prefix. Products match on this, never the name. */
  slug: string;
  name: string;
  description: string;
  /** Live only when real stock exists — see the dead-facet rule above. */
  active: boolean;
  featured?: boolean;
  keywords: string[];
  seoDescription: string;
}

export function franchiseRow(
  input: FranchiseSeedInput,
  order: number,
  stamps: { createdBy: string; createdAt: Date; updatedAt: Date },
): Partial<CategoryDocument> {
  const id = `franchise-${input.slug}`;
  return {
    id,
    slug: id,
    name: input.name,
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.FRANCHISE,
    description: input.description,
    rootId: id,
    parentIds: [],
    childrenIds: [],
    ancestors: [],
    tier: 0,
    path: id,
    isLeaf: true,
    order,
    /* `icon` deliberately unset — the brands grid reads `display.icon` first
     * and an emoji there would beat a real cover image (brand-rows trap 2). */
    display: {
      coverImage: seedPhoto(`franchise-cover-${input.slug}-20261014`, 800, 800),
      showInMenu: false,
      showInFooter: false,
    },
    isFeatured: input.featured ?? false,
    isActive: input.active,
    isSearchable: input.active,
    createdBy: stamps.createdBy,
    createdAt: stamps.createdAt,
    updatedAt: stamps.updatedAt,
    seo: {
      title: `${input.name} | LetItRip`,
      description: input.seoDescription,
      keywords: input.keywords,
    },
  };
}

/*
 * The eight. Beyblade is the catalogue; the other seven are the IPs
 * `CharacterHotspot` already links to, seeded inactive so those links resolve
 * without advertising an empty shop.
 */
const INPUTS: FranchiseSeedInput[] = [
  {
    slug: "beyblade",
    name: "Beyblade",
    description:
      "The spinning-top battling franchise — every generation from the original Spin Gear tops through Metal Fight, Burst and Beyblade X. Complete tops, loose parts, stadiums and accessories.",
    active: true,
    featured: true,
    keywords: ["beyblade", "spinning tops", "burst", "metal fight", "beyblade x"],
    seoDescription:
      "Shop Beyblade across every generation — tops, parts, stadiums and spares, new and pre-owned.",
  },
  {
    slug: "marvel",
    name: "Marvel",
    description:
      "Figures, collectibles and merchandise from the Marvel universe.",
    active: false,
    keywords: ["marvel", "comics", "superhero", "figures"],
    seoDescription: "Marvel collectibles and figures.",
  },
  {
    slug: "dc-comics",
    name: "DC Comics",
    description: "Figures, collectibles and merchandise from the DC universe.",
    active: false,
    keywords: ["dc", "dc comics", "superhero", "figures"],
    seoDescription: "DC Comics collectibles and figures.",
  },
  {
    slug: "dragon-ball",
    name: "Dragon Ball",
    description: "Figures and collectibles from the Dragon Ball series.",
    active: false,
    keywords: ["dragon ball", "anime", "figures", "shonen"],
    seoDescription: "Dragon Ball collectibles and figures.",
  },
  {
    slug: "naruto",
    name: "Naruto",
    description: "Figures and collectibles from the Naruto series.",
    active: false,
    keywords: ["naruto", "anime", "figures", "shonen"],
    seoDescription: "Naruto collectibles and figures.",
  },
  {
    slug: "bleach",
    name: "Bleach",
    description: "Figures and collectibles from the Bleach series.",
    active: false,
    keywords: ["bleach", "anime", "figures", "shonen"],
    seoDescription: "Bleach collectibles and figures.",
  },
  {
    slug: "one-piece",
    name: "One Piece",
    description: "Figures and collectibles from the One Piece series.",
    active: false,
    keywords: ["one piece", "anime", "figures", "shonen"],
    seoDescription: "One Piece collectibles and figures.",
  },
  {
    slug: "one-punch-man",
    name: "One Punch Man",
    description: "Figures and collectibles from the One Punch Man series.",
    active: false,
    keywords: ["one punch man", "anime", "figures"],
    seoDescription: "One Punch Man collectibles and figures.",
  },
];

export function buildFranchiseRows(stamps: {
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): Partial<CategoryDocument>[] {
  return INPUTS.map((input, i) => franchiseRow(input, i + 1, stamps));
}

export const FRANCHISE_ROW_COUNT = INPUTS.length;

/** The slugs a product's `franchiseSlug` may point at. */
export const FRANCHISE_SLUGS: readonly string[] = INPUTS.map((i) => `franchise-${i.slug}`);

/**
 * Category ROOT -> the franchise everything beneath it belongs to.
 *
 * Derived rather than stamped per product: a product already carries its full
 * ancestor chain, so the root is free and cannot drift from the taxonomy the
 * way a hand-written field would (Root Cause #42).
 *
 * 🛑 Deliberately PARTIAL. `category-living-collectibles` is absent because a
 * juniper bonsai and a leucistic axolotl are not from an IP — they are living
 * things. Mapping every root for completeness' sake would assert a franchise
 * that does not exist, and "no franchise" is the correct answer for 4 of the
 * 1,308 seeded products. A root with no entry yields no franchise, not a
 * fallback.
 */
export const FRANCHISE_BY_CATEGORY_ROOT: Readonly<
  Record<string, { slug: string; name: string }>
> = {
  "category-spinning-tops": { slug: "franchise-beyblade", name: "Beyblade" },
};
