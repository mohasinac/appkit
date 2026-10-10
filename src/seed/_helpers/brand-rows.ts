/*
 * WHY: The seed carried FOUR brand rows for a catalogue that was about to span
 *      Beyblade, trading cards, figures and die-cast. A product's `brand`
 *      string that matches no brand row is invisible on every brand page, and
 *      the four existing rows cover none of the three new verticals.
 * WHAT: One factory plus 28 compact declarations. The boilerplate every brand
 *       row needs — tier-0 coordinates, isBrand, searchability, the seo block —
 *       is written once; each brand declares only what differs.
 *
 * EXPORTS:
 *   BRAND_ROWS       — Partial<CategoryDocument>[], categoryType:"brand"
 *   BRAND_ROW_COUNT  — asserted by the seed so a silent drop is loud
 *
 * ## 🛑 Three traps, all of them live
 *
 * 1. **`BrandDetailPageView` filters products on the brand's DISPLAY NAME**
 *    (`sieveFilter("brand", EQ, brandName)`), not on `brandSlug`. So renaming
 *    a brand silently orphans its entire catalogue — which is why
 *    `Takara-Tomy` keeps its existing hyphenated spelling even though the
 *    company writes it "Takara Tomy". Keep `brand` and `brandSlug` in lockstep
 *    on the product side.
 *
 * 2. **`display.icon` BEATS `display.coverImage`.** `BrandsSection` reads
 *    `brand.display?.icon` first and only falls back to `coverImage`. The
 *    existing seed uses `icon` for EMOJI, so an emoji left there wins over a
 *    real logo. Every row here leaves `icon` unset.
 *
 * 3. **A brand row with no product is a DEAD FACET, and worse than absent** —
 *    it renders as a card in the brands grid that opens an empty page. That is
 *    the whole reason there is no standalone `Tomy` row: Takara is the
 *    pre-merger Beyblade maker and Takara Tomy is the merged entity, while
 *    Tomy's own pre-merger role is established by NO source we hold (zero
 *    `Tomy`-only brand values across all fifteen crawls, and the local corpus
 *    never attributes a product code to Tomy alone). Every row below is one
 *    B6 can put at least one real product behind.
 *
 * ## 🛑 Why these are seedPhoto tiles and not 28 committed logo SVGs
 *
 * The plan recommended committing `public/images/brands/<slug>.svg` to avoid
 * `seedExtMedia`, which persists an `/api/media/ext?url=…` into Firestore and
 * costs a lambda plus a third-party fetch plus a full sharp encode PER IMAGE
 * PER RENDER — Root Cause #104, the thing that took Fast Origin Transfer to
 * 52.52 GB against a 10 GB cap.
 *
 * That reasoning is right and the conclusion has moved, because `seedPhoto`
 * now resolves to one of six STATIC LOCAL SVG tiles served `immutable` from
 * `/images/`. It already has the property the recommendation was reaching for:
 * no proxy, no third-party fetch, no per-render cost.
 *
 * And it avoids a question committing the files would raise — 26 of these are
 * marques we do not own, so shipping drawn approximations of their logos is
 * trademark reproduction for commercial use. A neutral tile is honest about
 * being a placeholder. Real logos are a licensed-asset task, not a seed task.
 *
 * @tag domain:categories
 * @tag layer:seed
 * @tag pattern:shared-literal
 * @tag access:server-only
 * @tag consumers:seed/categories-seed-data.ts
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../../features/categories/schemas";
/*
 * 🛑 `constants/field-names`, NOT `features/categories/schemas/firestore`.
 * There are TWO `CATEGORY_FIELDS` constants in this codebase and they have
 * drifted — only this one carries `CATEGORY_TYPE_VALUES`, and the schema copy
 * carries `PRODUCT_DEFAULTS_TAX_CODE_ID`, which this one does not.
 * `categories-seed-data.ts` imports this copy; matching it is what keeps the
 * brand discriminator a single spelling.
 */
import { CATEGORY_FIELDS } from "../../constants/field-names";
import { seedPhoto } from "./media";

export interface BrandSeedInput {
  /** Without the `brand-` prefix. */
  slug: string;
  /** 🛑 The display name products match on. Changing it orphans the catalogue. */
  name: string;
  description: string;
  country: string;
  founded?: number;
  website?: string;
  highlights: string[];
  faqs?: { question: string; answer: string }[];
  /** Shows in the footer brand list. Reserved for the few with real breadth. */
  footer?: boolean;
  featured?: boolean;
  keywords: string[];
  seoDescription: string;
}

export function brandRow(
  input: BrandSeedInput,
  order: number,
  stamps: { createdBy: string; createdAt: Date; updatedAt: Date },
): Partial<CategoryDocument> {
  const id = `brand-${input.slug}`;
  return {
    id,
    slug: id,
    name: input.name,
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: input.description,
    ...(input.website ? { brandWebsite: input.website } : {}),
    brandCountry: input.country,
    ...(input.founded ? { brandFounded: input.founded } : {}),
    highlights: input.highlights,
    ...(input.faqs ? { faqs: input.faqs } : {}),
    rootId: id,
    parentIds: [],
    childrenIds: [],
    ancestors: [],
    tier: 0,
    path: id,
    isLeaf: true,
    order,
    /*
     * 🛑 `icon` deliberately UNSET — see trap 2. A cover image only.
     * `position` is NOT set here: brand rows live outside the category
     * forest's DFS numbering, and giving them a position inside it would
     * corrupt the ranges `onCategoryWrite` shifts on insert.
     */
    display: {
      coverImage: seedPhoto(`brand-logo-${input.slug}-20260101`, 800, 800),
      showInMenu: false,
      showInFooter: input.footer ?? false,
    },
    isFeatured: input.featured ?? false,
    isBrand: true,
    isActive: true,
    isSearchable: true,
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

// ─────────────────────────────────────────────────────────────────────────────
// Beyblade — EIGHT rows, and the count is the interesting part
//
// Takara is the pre-2006 maker (beybladeshopindia's Brand field is literally
// `Takara` on 2,011 products, and the local corpus attributes Gen-1 codes to
// `(Takara)` while BX-era codes carry `(TT)`). Takara Tomy is the merged
// entity. There is NO standalone Tomy row — see trap 3.
//
// `Beyblade` itself stays a row because the existing seed has it and products
// reference it; it is the FRANCHISE rather than a manufacturer, the same
// precedent `Hot Wheels` follows on the die-cast side.
// ─────────────────────────────────────────────────────────────────────────────
const BEYBLADE_BRANDS: BrandSeedInput[] = [
  {
    slug: "takara-tomy",
    // 🛑 Hyphenated, matching what products already carry. The company writes
    // it "Takara Tomy"; renaming to match them orphans the catalogue.
    name: "Takara-Tomy",
    description:
      "The Japanese toy company behind every Beyblade generation since the 2006 merger, plus Tomica, Transformers (Japan) and Duel Masters. Known for premium tooling and Japan-exclusive releases.",
    country: "Japan",
    founded: 2006,
    website: "https://www.takaratomy.co.jp",
    highlights: [
      "Manufactures every Beyblade generation from 2006 onward",
      "Also behind Tomica, Transformers (Japan region) and Duel Masters",
      "Japan-exclusive releases and the tighter tolerances competitive players prefer",
    ],
    faqs: [
      { question: "Is Takara-Tomy the same company as Hasbro's Beyblade line?", answer: "No. Takara-Tomy manufactures and sells Beyblade in Japan and most of Asia; Hasbro licenses and distributes a separate — sometimes genuinely different — product line internationally, primarily in North America." },
      { question: "Are Takara-Tomy imports compatible with Hasbro Beyblade parts?", answer: "Within the same generation, almost always yes. Across generations, no: the launcher and locking systems changed every time." },
    ],
    footer: true,
    featured: true,
    keywords: ["takara tomy", "takara tomy beyblade", "tomica takara", "beyblade japan"],
    seoDescription: "Shop Takara-Tomy collectibles — Beyblade across every generation, plus Tomica and Transformers Japan releases.",
  },
  {
    slug: "takara",
    name: "Takara",
    description:
      "The pre-merger company that created Beyblade in 1999 and made every Plastic Generation, Spin Gear, Magnacore, Engine Gear and HMS release until it merged with Tomy in 2006.",
    country: "Japan",
    founded: 1955,
    highlights: [
      "Created Beyblade in 1999 — every original-generation top is a Takara product",
      "The marque on Gen-1 product codes (A-xx, MA-xx) before the 2006 merger",
      "Vintage Takara pieces in playable condition are the scarcest Beyblade tier",
    ],
    faqs: [
      { question: "What is the difference between Takara and Takara-Tomy?", answer: "Takara made Beyblade alone from 1999 until it merged with Tomy in 2006 to form Takara Tomy. A top with an A-xx or MA-xx code is a Takara release; a BB-xx, B-xx or BX-xx code is Takara Tomy." },
      { question: "Is a Takara-era top still usable?", answer: "Yes, though plastic from 1999–2003 has aged. Check the listing for stress marks around the Blade Base and for a clean spin gear — a cracked base is not repairable." },
    ],
    featured: true,
    keywords: ["takara", "takara beyblade", "plastic generation", "vintage beyblade"],
    seoDescription: "Shop Takara-era Beyblade — the original 1999–2003 generations, from Spin Gear through HMS.",
  },
  {
    slug: "beyblade",
    name: "Beyblade",
    description:
      "The spinning-top battle franchise itself, by Takara-Tomy in Japan and Hasbro internationally — spanning the Original series, Metal Fight, Burst and Beyblade X.",
    country: "Japan",
    founded: 1999,
    website: "https://beyblade.takaratomy.co.jp",
    highlights: [
      "Four generations since 1999, all of them traded here",
      "One of the best-selling spinning-top toy lines in the world",
      "A live competitive tournament scene alongside collecting",
    ],
    faqs: [
      { question: "What age range is Beyblade designed for?", answer: "Most sets are labelled 8+ for small parts and launcher spring mechanisms. Check the age rating on the listing before buying for a younger child." },
      { question: "Where can I find official tournament rules?", answer: "Takara-Tomy and Hasbro each publish rules for their own regions, and the World Beyblade Organization runs the community formats most Indian events use. The manufacturer link on this page goes to the current official rulebook." },
    ],
    footer: true,
    featured: true,
    keywords: ["beyblade", "beyblade x", "beyblade burst", "spinning top battle", "beyblade india"],
    seoDescription: "Shop Beyblade in India — Original, Metal Fight, Burst and Beyblade X tops, parts, launchers and stadiums.",
  },
  {
    slug: "hasbro",
    name: "Hasbro",
    description:
      "The international Beyblade licensee. Hasbro distributes its own product line outside Japan with different packaging, different part names and occasionally different mould tolerances from the Takara-Tomy originals.",
    country: "United States",
    founded: 1923,
    website: "https://shop.hasbro.com",
    highlights: [
      "The Beyblade line most collectors outside Japan grew up with",
      "Widely available and generally cheaper than Japanese imports",
      "Same-generation parts are usually cross-compatible with Takara-Tomy",
    ],
    faqs: [
      { question: "Is a Hasbro Beyblade worse than the Takara-Tomy version?", answer: "Not worse, but often different. Hasbro releases can use softer plastics and slightly looser tolerances, which competitive players notice and casual players generally do not." },
      { question: "Why does my Hasbro top have a different name?", answer: "Hasbro renames most releases for western markets — Lost Longinus is sold as Lost Luinor L2, Spriggan as Spryzen. They are the same mould. Both names are indexed here, so either one finds the listing." },
    ],
    keywords: ["hasbro", "hasbro beyblade", "beyblade burst hasbro", "luinor"],
    seoDescription: "Shop Hasbro Beyblade — the international product line, with both Hasbro and Takara-Tomy names searchable.",
  },
  {
    slug: "sonokong",
    name: "Sonokong",
    description:
      "The South Korean Beyblade licensee, distributing localised releases across Korea with its own packaging and occasional market-exclusive colourways.",
    country: "South Korea",
    founded: 1979,
    highlights: [
      "Korean-market releases, including colourways sold nowhere else",
      "Same moulds as the Takara-Tomy originals under Korean packaging",
    ],
    keywords: ["sonokong", "korean beyblade", "sonokong beyblade"],
    seoDescription: "Shop Sonokong Beyblade — Korean-market releases and market-exclusive colourways.",
  },
  {
    slug: "funskool",
    name: "Funskool",
    description:
      "The Indian licensee for several Hasbro lines, including locally packaged Beyblade releases — the version many Indian collectors owned first.",
    country: "India",
    founded: 1987,
    highlights: [
      "Indian-market packaging, and the release many local collectors started with",
      "Locally distributed, so no import duty in the original purchase price",
    ],
    faqs: [
      { question: "Is a Funskool Beyblade genuine?", answer: "Yes. Funskool is a licensed Indian distributor, not a reproduction — the product inside is the licensed release under Indian packaging." },
    ],
    keywords: ["funskool", "funskool beyblade", "beyblade india original"],
    seoDescription: "Shop Funskool Beyblade — the licensed Indian-market releases.",
  },
  {
    slug: "young-toys",
    name: "Young Toys",
    description:
      "A Korean toy manufacturer and regional Beyblade licensee, also known for its own spinning-top lines.",
    country: "South Korea",
    highlights: ["Korean regional releases", "Also produces its own spinning-top lines"],
    keywords: ["young toys", "young toys beyblade", "korean spinning tops"],
    seoDescription: "Shop Young Toys releases — Korean regional Beyblade and spinning-top lines.",
  },
  {
    slug: "newboy",
    name: "NewBoy",
    description:
      "The Middle East regional licensee, distributing Beyblade across the Gulf states with localised packaging.",
    country: "United Arab Emirates",
    highlights: ["Gulf-market packaging", "Licensed regional distribution, not a reproduction"],
    keywords: ["newboy", "newboy beyblade", "middle east beyblade"],
    seoDescription: "Shop NewBoy Beyblade — licensed Middle East regional releases.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Trading card publishers — FIVE
//
// 🛑 Nintendo and Creatures Inc. are deliberately absent despite co-owning
// Pokémon. Their names appear on no card a buyer searches by, so a row for
// either is trap 3: a card in the brands grid that opens an empty page.
// ─────────────────────────────────────────────────────────────────────────────
const TCG_BRANDS: BrandSeedInput[] = [
  {
    slug: "pokemon-company",
    name: "The Pokémon Company",
    description:
      "Publisher of the Pokémon Trading Card Game, and the marque on every modern Japanese and English set since Wizards of the Coast's licence ended in 2003.",
    country: "Japan",
    founded: 1998,
    website: "https://www.pokemon.co.jp",
    highlights: [
      "Publishes every modern Pokémon TCG set in both Japanese and English",
      "Japanese print runs are smaller and card stock is generally better regarded",
    ],
    faqs: [
      { question: "Why do Japanese and English Pokémon cards differ in price?", answer: "Different print runs, different pull rates and a different collector base. Japanese sets often have higher card quality and smaller runs; English sets have the larger market. They are genuinely different products, which is why language is a filter here." },
    ],
    footer: true,
    featured: true,
    keywords: ["pokemon company", "pokemon tcg", "pokemon cards india", "pokemon japanese"],
    seoDescription: "Shop Pokémon Trading Card Game product — singles, sealed boxes and ETBs in Japanese and English.",
  },
  {
    slug: "wizards-of-the-coast",
    name: "Wizards of the Coast",
    description:
      "Held the English-language Pokémon TCG licence from 1999 to 2003, and publishes Magic: The Gathering. WotC-era Pokémon cards are the vintage tier of the game.",
    country: "United States",
    founded: 1990,
    website: "https://company.wizards.com",
    highlights: [
      "The 1999–2003 English Pokémon sets — Base Set through e-Card",
      "A WotC copyright line on the card is the single fastest vintage check",
    ],
    faqs: [
      { question: "How do I tell a WotC-era Pokémon card from a modern reprint?", answer: "The copyright line at the bottom names Wizards of the Coast and the year. A modern reprint of the same artwork carries The Pokémon Company instead, and the two are priced very differently." },
    ],
    keywords: ["wizards of the coast", "wotc pokemon", "base set", "vintage pokemon cards"],
    seoDescription: "Shop Wizards of the Coast-era Pokémon — the 1999–2003 English vintage sets.",
  },
  {
    slug: "bandai",
    name: "Bandai",
    description:
      "Publisher of the One Piece Card Game, Digimon Card Game and Gundam Card Game, and — through Bandai Spirits — one of the largest collectible figure and model-kit makers in the world.",
    country: "Japan",
    founded: 1950,
    website: "https://www.bandai.com",
    highlights: [
      "One Piece, Digimon and Gundam card games",
      "Bandai Spirits figures and the entire Gunpla model-kit range",
      "The broadest single catalogue of any publisher here",
    ],
    footer: true,
    featured: true,
    keywords: ["bandai", "one piece card game", "gunpla", "digimon tcg", "bandai spirits"],
    seoDescription: "Shop Bandai — One Piece and Digimon card games, Gunpla model kits and Bandai Spirits figures.",
  },
  {
    slug: "konami",
    name: "Konami",
    description: "Publisher of the Yu-Gi-Oh! Trading Card Game worldwide.",
    country: "Japan",
    founded: 1969,
    website: "https://www.konami.com",
    highlights: ["Yu-Gi-Oh! TCG structure decks, boosters and singles"],
    keywords: ["konami", "yu-gi-oh", "yugioh cards india"],
    seoDescription: "Shop Konami's Yu-Gi-Oh! Trading Card Game — structure decks, boosters and singles.",
  },
  {
    slug: "bushiroad",
    name: "Bushiroad",
    description:
      "Publisher of Weiss Schwarz and Union Arena — crossover card games that license dozens of anime properties into one playable system.",
    country: "Japan",
    founded: 2007,
    website: "https://bushiroad.com",
    highlights: [
      "Weiss Schwarz and Union Arena",
      "Crossover sets licensing dozens of anime properties into one game",
    ],
    keywords: ["bushiroad", "weiss schwarz", "union arena"],
    seoDescription: "Shop Bushiroad card games — Weiss Schwarz and Union Arena sealed product and singles.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Figure makers — THIRTEEN, ordered by their measured tag counts in the crawl
// ─────────────────────────────────────────────────────────────────────────────
const FIGURE_BRANDS: BrandSeedInput[] = [
  {
    slug: "banpresto",
    name: "Banpresto",
    description:
      "A Bandai Spirits label producing prize figures for Japanese arcade machines — the largest single figure line in the crawl, and the entry price point for collecting at scale.",
    country: "Japan",
    founded: 1977,
    highlights: [
      "Prize figures made for Japanese arcade machines, not retail",
      "Usually unarticulated and genuinely cheaper rather than lower value",
      "The broadest anime-figure selection at the ₹1,200–2,200 tier",
    ],
    faqs: [
      { question: "Are Banpresto prize figures lower quality?", answer: "They are simpler — fewer parts, no articulation, less complex paint — and priced accordingly. For display they hold up well, which is why prize figures are a tier rather than a compromise." },
    ],
    footer: true,
    featured: true,
    keywords: ["banpresto", "prize figure", "anime figure india"],
    seoDescription: "Shop Banpresto prize figures — the broadest anime-figure selection at the entry tier.",
  },
  {
    slug: "tamashii-nations",
    name: "Tamashii Nations",
    description:
      "Bandai Spirits' collector label, best known for S.H.Figuarts — highly articulated 1/12-scale figures aimed at adult collectors.",
    country: "Japan",
    founded: 2008,
    highlights: ["S.H.Figuarts and the Tamashii collector lines", "The articulation benchmark at 1/12 scale"],
    keywords: ["tamashii nations", "s.h.figuarts", "shf", "articulated figures"],
    seoDescription: "Shop Tamashii Nations — S.H.Figuarts and the Bandai Spirits collector lines.",
  },
  {
    slug: "max-factory",
    name: "Max Factory",
    description:
      "Japanese figure maker behind the Figma articulated line and a large catalogue of scale statues.",
    country: "Japan",
    founded: 1987,
    highlights: ["The Figma articulated line", "Scale statues across a wide anime licence range"],
    keywords: ["max factory", "figma", "anime figures"],
    seoDescription: "Shop Max Factory — Figma articulated figures and scale statues.",
  },
  {
    slug: "good-smile-company",
    name: "Good Smile Company",
    description:
      "Creator of the Nendoroid line — stylised chibi figures with swappable faces and parts — alongside a premium scale-statue catalogue.",
    country: "Japan",
    founded: 2001,
    highlights: ["Nendoroid, the definitive chibi collectible line", "Swappable faces and parts on every Nendoroid"],
    keywords: ["good smile company", "nendoroid", "chibi figure"],
    seoDescription: "Shop Good Smile Company — Nendoroid chibi figures and premium scale statues.",
  },
  {
    slug: "megahouse",
    name: "MegaHouse",
    description: "A Bandai Namco figure label known for its One Piece and Gundam scale statues.",
    country: "Japan",
    founded: 2001,
    highlights: ["One Piece Portrait.Of.Pirates and Gundam scale lines"],
    keywords: ["megahouse", "portrait of pirates", "one piece figure"],
    seoDescription: "Shop MegaHouse figures — One Piece Portrait.Of.Pirates and Gundam scale statues.",
  },
  {
    slug: "furyu",
    name: "FuRyu",
    description: "Japanese prize-figure and scale-figure maker across a broad anime licence range.",
    country: "Japan",
    founded: 2007,
    highlights: ["Prize and scale figures at the mid tier"],
    keywords: ["furyu", "anime prize figure"],
    seoDescription: "Shop FuRyu figures — prize and scale anime collectibles.",
  },
  {
    slug: "taito",
    name: "Taito",
    description: "Arcade operator and prize-figure maker, whose figures come from its own crane machines.",
    country: "Japan",
    founded: 1953,
    highlights: ["Arcade prize figures from Taito's own machines"],
    keywords: ["taito", "taito prize figure"],
    seoDescription: "Shop Taito prize figures — arcade-exclusive anime collectibles.",
  },
  {
    slug: "medicom-toy",
    name: "Medicom Toy",
    description:
      "Japanese maker behind Mafex — highly articulated 1/12-scale comic and film figures — and the Be@rbrick line.",
    country: "Japan",
    founded: 1996,
    highlights: ["The Mafex articulated line", "Be@rbrick designer collectibles"],
    keywords: ["medicom", "mafex", "bearbrick"],
    seoDescription: "Shop Medicom Toy — Mafex articulated figures and Be@rbrick collectibles.",
  },
  {
    slug: "toy-biz",
    name: "Toy Biz",
    description:
      "The pre-Hasbro Marvel licensee. Its 1990s figures are a genuine vintage tier, and an unopened Toy Biz card is one of the scarcer things in this catalogue.",
    country: "United States",
    founded: 1990,
    highlights: [
      "1990s Marvel figures — the vintage tier of comic collecting",
      "Carded examples are scarce and priced well above loose ones",
    ],
    faqs: [
      { question: "Why are Toy Biz figures collectible?", answer: "They are the Marvel figures a generation grew up with, they predate Hasbro's licence, and the cards were rarely kept. Condition of the blister and card drives most of the price." },
    ],
    keywords: ["toy biz", "vintage marvel figures", "1990s marvel"],
    seoDescription: "Shop Toy Biz — vintage 1990s Marvel figures, carded and loose.",
  },
  {
    slug: "mcfarlane-toys",
    name: "McFarlane Toys",
    description:
      "Holder of the DC figure licence, producing the DC Multiverse line alongside sports and game properties.",
    country: "United States",
    founded: 1994,
    highlights: ["DC Multiverse — the current DC figure line", "Sports and video-game licences alongside it"],
    keywords: ["mcfarlane", "dc multiverse", "dc figures"],
    seoDescription: "Shop McFarlane Toys — DC Multiverse figures and licensed sports and game lines.",
  },
  {
    slug: "mattel",
    name: "Mattel",
    description:
      "American toy company behind Hot Wheels, the Pixar Cars die-cast line and a long history of licensed action figures.",
    country: "United States",
    founded: 1945,
    website: "https://shop.mattel.com",
    highlights: ["Hot Wheels and Pixar Cars", "A deep back catalogue of licensed figures"],
    keywords: ["mattel", "pixar cars", "mattel figures"],
    seoDescription: "Shop Mattel — Pixar Cars die-cast and licensed figure lines.",
  },
  {
    slug: "hot-toys",
    name: "Hot Toys",
    description:
      "Hong Kong maker of 1/6-scale film collectibles with tailored fabric costumes and portrait likenesses — the premium ceiling of this catalogue.",
    country: "Hong Kong",
    founded: 2000,
    highlights: ["1/6-scale film figures with fabric costumes", "The premium end of collectible figures"],
    keywords: ["hot toys", "1/6 scale", "movie masterpiece"],
    seoDescription: "Shop Hot Toys — 1/6-scale premium film collectibles.",
  },
  {
    slug: "mezco",
    name: "Mezco Toyz",
    description: "American maker of the One:12 Collective — 1/12-scale figures with fabric costumes.",
    country: "United States",
    founded: 1999,
    highlights: ["The One:12 Collective line at 1/12 scale with fabric costumes"],
    keywords: ["mezco", "one 12 collective"],
    seoDescription: "Shop Mezco Toyz — One:12 Collective figures.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Die-cast — ONE
//
// 🛑 Hot Wheels only, and it is the LINE rather than its parent company —
// matching the precedent `Beyblade` already set. The twenty other marques the
// crawl surfaced (Matchbox, Tomica, Mini GT, M2, Greenlight, Maisto, Kyosho …)
// are out of scope; their data stays in docs/research/ so re-adding one is a
// seed change and not another crawl.
// ─────────────────────────────────────────────────────────────────────────────
const DIECAST_BRANDS: BrandSeedInput[] = [
  {
    slug: "hot-wheels",
    name: "Hot Wheels",
    description:
      "Mattel's 1:64 die-cast line since 1968 — Mainline blister singles, Premium series with metal bases and Real Riders tyres, and the members-only Red Line Club.",
    country: "United States",
    founded: 1968,
    website: "https://creations.mattel.com",
    highlights: [
      "Mainline, Premium and Red Line Club, all at 1:64",
      "Treasure Hunt and Super Treasure Hunt chase variants identified on every listing",
      "Indian-card releases flagged, because collectors here price them differently",
    ],
    faqs: [
      { question: "What is a Super Treasure Hunt?", answer: "A chase variant within a mainline wave carrying Spectraflame paint, Real Riders rubber tyres and the TH logo — usually one per case. A regular Treasure Hunt has the flame-circle logo without the premium paint and tyres." },
      { question: "Why does the Indian blister card matter?", answer: "It is printed differently from the US release and collectors here value the two differently, so listings state which card a car is on rather than leaving you to compare photographs." },
    ],
    footer: true,
    featured: true,
    keywords: ["hot wheels", "hot wheels india", "treasure hunt", "car culture", "diecast 1:64"],
    seoDescription: "Shop Hot Wheels in India — Mainline, Premium, Red Line Club and chase variants at 1:64.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Living collectibles — ONE
// ─────────────────────────────────────────────────────────────────────────────
const LIVING_BRANDS: BrandSeedInput[] = [
  {
    slug: "independent-keepers",
    name: "Independent Keepers",
    description:
      "Live animals and plants come from individual keepers, breeders and growers rather than a manufacturer. This entry groups those listings so they are reachable from brand browsing like everything else.",
    country: "India",
    highlights: [
      "Every seller is verified before a live listing can go public",
      "Provenance, age and health information disclosed per listing",
    ],
    faqs: [
      { question: "Why is there a \"brand\" for living things at all?", answer: "Purely so live listings behave like every other listing in browse and search. It identifies the class of seller, not a manufacturer." },
    ],
    keywords: ["independent keepers", "breeders", "live plants"],
    seoDescription: "Live animals and plants from verified independent keepers and growers.",
  },
];

/** Declaration order is display order; `order` is assigned from it. */
export const BRAND_SEED_INPUTS: BrandSeedInput[] = [
  ...BEYBLADE_BRANDS,
  ...TCG_BRANDS,
  ...FIGURE_BRANDS,
  ...DIECAST_BRANDS,
  ...LIVING_BRANDS,
];

export function buildBrandRows(stamps: {
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}): Partial<CategoryDocument>[] {
  const seen = new Set<string>();
  return BRAND_SEED_INPUTS.map((input, i) => {
    const id = `brand-${input.slug}`;
    /*
     * 🛑 Fatal, not last-write-wins. A brand id derives from the slug, so two
     * rows at one id write the first and SILENTLY overwrite it — and
     * `appkit-seed status` cannot see it, because it counts ids and the id
     * exists either way.
     */
    if (seen.has(id)) throw new Error(`duplicate brand id ${id}`);
    seen.add(id);
    return brandRow(input, i + 1, stamps);
  });
}

/** Asserted by the seed so a silently dropped row is loud. */
export const BRAND_ROW_COUNT = BRAND_SEED_INPUTS.length;
