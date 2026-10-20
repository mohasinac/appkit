/**
 * The `beys` and `beyProducts` collections — the BEY reference database.
 *
 * Extracted from a crawled corpus by committed scripts and generated into the
 * seed; nothing here is hand-typed. 1,988 beys and 366 products.
 *
 * ── 🛑 WHY THIS MIRRORS `partGlossary` RATHER THAN INVENTING A SHAPE ───────
 *
 * Parts already do all three halves of this and have for months: a
 * `partGlossary` collection, a category leaf per part, and a
 * `/parts/{classification}/{code}` reference page. Beys get the same three,
 * so every decision that was already argued out there is inherited rather
 * than re-litigated:
 *
 *   · the ID IS THE SLUG, shared with the category leaf (`category-{slug}`),
 *     because one key across two collections is what keeps a reference page
 *     and a commerce shelf pointing at the same thing;
 *   · measured data lives HERE, not on `categories`, because
 *     `handleCategoryWrite` calls `notifyRevalidate` unconditionally — so a
 *     reseed of bey facts would drop every bey page's ISR entry on a project
 *     that has already been paused at 15.5x its ISR cap;
 *   · and a bey page is a REFERENCE surface, so it carries no money. Prices
 *     are gated for signed-out visitors, which would make the page a client
 *     component (see `PartDetailPageView`'s header).
 *
 * ── 🛑 NO `searchTxt` FIELD, DELIBERATELY ─────────────────────────────────
 *
 * `partGlossary` had one and it was REMOVED; the collection is declared
 * `INDEX_ARTIFACT_ONLY` in `audit-searchtxt-migration`, whose rule is that a
 * member must not declare the field. Beys are the same kind of collection —
 * discovery happens through the category leaf, which has its own `searchTxt`
 * built from the leaf's name and aliases.
 */
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const BEYS_COLLECTION = "beys" as const;
export const BEY_PRODUCTS_COLLECTION = "beyProducts" as const;

/**
 * One slot of a bey's build.
 *
 * 🛑 `partName` is kept EVEN WHEN `partId` resolves, and that is not
 * redundancy. The join reaches 88.9% of 7,688 links, so ~850 entries name a
 * part we hold no row for — and a slot that renders nothing reads as a bey
 * with an incomplete build rather than as a missing part page. The name is
 * what the source stated; the id is what we managed to resolve.
 */
export interface BeyCompositionEntry {
  /** Our canonical slot key — `fusion-wheel`, `performance-tip`, `driver`. */
  slot: string;
  /** The part as the source names it, which is sometimes an abbreviation. */
  partName: string;
  /** `partGlossary` id, when the name or one of its aliases resolved. */
  partId?: string;
  /**
   * The raw infobox key this came from.
   *
   * 🛑 Load-bearing for Synchrome, where `WarriorWheel2=Behemoth` is the
   * OTHER HALF of a two-wheel combination rather than a duplicate key to
   * dedupe. Two entries can share a `slot` and still be distinct parts.
   */
  infoboxKey?: string;
}

/** The 0-100 rating vector. Same axes as `PartRatings`, same scale. */
export interface BeyRatings {
  attack?: number;
  defense?: number;
  stamina?: number;
  weight?: number;
  speed?: number;
  burst?: number;
  burstResistance?: number;
  dash?: number;
  power?: number;
  height?: number;
  runTime?: number;
}

/**
 * How much of a derived figure is actually measured.
 *
 * 🛑 This rides WITH every derived value and is not optional decoration. A
 * vector built from 2 of 5 parts is a different claim from one built from 5 of
 * 5, and a mass summed from 3 weighed parts out of 5 is a floor rather than a
 * total. Without this a consumer cannot tell them apart, and the honest
 * rendering ("≈", or nothing at all) becomes impossible.
 */
export interface BeyDerivationCoverage {
  /** Parts contributing a value. */
  rated?: number;
  weighed?: number;
  /** Parts in the composition. */
  total: number;
  /** True only when every part contributed. */
  complete?: boolean;
}

export interface BeyDocument extends BaseDocument {
  /** `id === slug`, and the same slug the category leaf uses. */
  id: string;
  slug: string;
  name: string;

  /** Battle type as stated — `Attack`, `Balance`, `Defense`, `Stamina`. */
  type?: string;
  /** `Right-Spin` / `Left-Spin` / `Dual-Spin`. */
  spinDirection?: string;
  /**
   * The hardware generation — `4D System`, `Hybrid Wheel System`, `Basic
   * Line`. 1,893 of 1,988.
   *
   * 🛑 This is the within-generation assembly key. No bey can be built across
   * generations, and Plastic and HMS do not interchange either, so a build
   * validator needs it. It is also what files the bey under a forest line
   * (`scripts/lib/bey-system-to-line.mjs`).
   */
  system?: string;
  /** A second system, for the handful of releases that span two. */
  system2?: string;
  /** The retail series — `Beyblade Burst QuadStrike`. */
  series?: string;
  series2?: string;

  /** The build, top to bottom. 1,911 of 1,988 carry one. */
  composition?: BeyCompositionEntry[];

  /**
   * 🛑 DERIVED AND AVERAGED, never summed, and never the raw source numbers.
   *
   * Two rating scales live in the part data — Beyblade X rates 0-100 and
   * everything before it rates 0-6 — so these are averaged over each part's
   * NORMALISED vector. A sum would make a five-part bey look five times
   * stronger than a three-part one, which is backwards: more parts is not
   * more attack.
   */
  ratingsFromParts?: BeyRatings;
  ratingsFromPartsCoverage?: BeyDerivationCoverage;

  /** Mass as the source states it. Only 248 of 1,988 do. */
  weightG?: number;
  /**
   * Mass SUMMED from the parts — 1,593 beys, 775 from a complete set.
   *
   * 🛑 A DIFFERENT KIND OF CLAIM from the ratings above, and the difference is
   * why it is safe: mass is physically additive, so a sum is a measurement.
   * Held-out validated against the 164 beys that state their own mass —
   * median absolute error 0.00 g, 99% within 2 g.
   *
   * 🛑 Never scaled up from partial coverage. 3 of 5 parts weighed gives the
   * mass of those three; inflating it by 5/3 would invent a figure that reads
   * exactly like a measured one. And a stated `weightG` always wins.
   */
  weightGFromParts?: number;
  weightGFromPartsCoverage?: BeyDerivationCoverage;

  /** Box codes. `productCodes[0]` is the one printed on the box. */
  productCodes?: string[];
  /**
   * Every other name this bey ships under — 1,327 of 1,988.
   *
   * 🛑 This is the Hasbro ↔ Takara-Tomy map, stated by the source rather than
   * inferred: Valkyrie/Valtryek, Spriggan/Spryzen. It must NOT be used to
   * merge two rows — `Dead` and `Dread` are two real Gatinko bases one
   * character apart, so any name-similarity join on this corpus is
   * disqualified.
   */
  aka?: string[];

  jpName?: string;
  romaji?: string;
  kanjiName?: string;
  krName?: string;

  releaseJP?: string;
  releaseUS?: string;
  releaseCA?: string;
  releaseKR?: string;
  /** As stated, in the source's own currency and formatting. */
  price?: string;

  /** The owner string verbatim, qualifiers and all. */
  owner?: string;
  /** Each person named, cleaned and split. */
  ownerNames?: string[];
  /**
   * Character slugs that resolved exactly — 661 of the 733 with an owner.
   *
   * 🛑 Resolved by stripping a stated qualifier and matching EXACTLY, never
   * approximately. `owner` keeps the raw string because "(manga)" is a real
   * distinction: that bey belongs to that character in the manga continuity
   * only.
   */
  ownerCharacters?: string[];
  creator?: string;

  specialMoves?: string[];
  /** First anime appearance, as the source names the episode. */
  appearAnime?: string;
  appearManga?: string;
  animeDebut?: string;
  /** Beyblade-X-only attribute. 45 of 1,988 — not worth a facet. */
  element?: string;
  avatar?: string;
  toyline?: string;

  /** Image filenames, resolved to `/media/<shortId>` at upload time. */
  images?: { file: string; label?: string | null }[];

  /** Our own prose, composed from the facts above. */
  seoDescription?: string;

  /**
   * The source page.
   *
   * 🛑 REQUIRED, and it must reach the UI. The corpus is CC-BY-SA, and the
   * two things that keep us clear of share-alike are taking facts only and
   * linking back. It was stored on ~5,500 rows and rendered on NONE of them
   * until the credits work; storing it is not discharging the obligation.
   */
  sourceUrl: string;
  /** How the row was obtained — `fandom-infobox`. */
  source?: string;
  /** Community discussion thread, where the source links one. */
  wboThreadUrl?: string;
}

/** One assortment slot of a product — a bey a buyer might get. */
export interface BeyProductAssortmentEntry {
  /** The bey as the source names it. */
  bey: string;
  /** Resolved `beys` id, when the name matched. */
  beyId?: string;
  /** A prize bey is not purchasable — it is drawn. */
  isPrize?: boolean;
  /** Stated pull odds, where the source gives them. */
  odds?: string;
}

export interface BeyProductDocument extends BaseDocument {
  id: string;
  slug: string;
  name: string;
  /** `Random Booster`, `Battle Set`, `Starter`, `Stadium`. */
  productType?: string;
  productCodes?: string[];
  price?: string;
  releaseJP?: string;
  jpName?: string;
  romaji?: string;
  /** What is in the box, or what can be pulled from it. */
  assortment?: BeyProductAssortmentEntry[];
  /** Pull-odds breakdown, on the 24 products that state one. */
  breakdown?: Record<string, string>;
  boxImage?: string;
  gallery?: string[];
  seoDescription?: string;
  /** CC-BY-SA link-back — see `BeyDocument.sourceUrl`. */
  sourceUrl: string;
  source?: string;
}

/**
 * The document id for a bey.
 *
 * 🛑 The ONE place this is composed, mirroring `partGlossaryId`. The id is
 * also the slug, the public URL and a `searchTxt` source on the paired
 * category leaf, so a second spelling of this rule is a second set of URLs.
 */
export function beyId(slug: string): string {
  return slug;
}
