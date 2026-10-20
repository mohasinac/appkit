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

/**
 * One configuration a bey can be set to, or settles into.
 *
 * ── 🛑 THERE IS NO THRESHOLD FIELD, AND THAT IS DELIBERATE ────────────────
 *
 * Mode data exists only in the local case-study corpus (the wiki carries ZERO:
 * 0 `Modes=` fields across 2,248 part pages and 2,011 bey pages), and every
 * numeric threshold cross-checked there DISAGREED across sources. Cosmic
 * Pegasus F:D is documented twice with the transition running in opposite
 * directions and three different thresholds between the two cases and the plan.
 *
 * So a `thresholdRadPerSec` does not exist here. A field that is absent cannot
 * be filled with a contested number by someone who assumes the gap was an
 * oversight — which is why this is a schema decision and not a convention.
 *
 * 🛑 `trigger` is FREE TEXT, not an enum. The three authored shapes are
 * already a pre-launch setting, passive spin decay, and what surface the tip
 * is running on — and a three-value enum written before the fourth case was
 * read would have forced the next one into the wrong bucket.
 */
/**
 * How a mode is selected.
 *
 * ── 🛑 THIS ENUM IS THE OWNER'S TAXONOMY, NOT MY GUESS ────────────────────
 *
 * Owner, 2026-10-21: *"most mode switches are either flips, config 1, 2 or 3
 * and more."* Everything beyond that set is a mode that changes WITHOUT the
 * owner doing anything, and those divide cleanly by what drives them.
 *
 * I deliberately did NOT define this when the first four modes were authored,
 * because at that point I had seen two kinds and an enum built from two would
 * have forced the next two into the wrong value. It is defined now that the
 * real set is known — which is the difference between a taxonomy and a guess.
 */
export const BEY_MODE_SWITCH_KINDS = [
  /** Turn the part over. Two states by definition. */
  "flip",
  /** An indexed assembly position — config 1, 2, 3… See `configIndex`. */
  "config",
  /** Swap in a different piece (Delta Drive's three tips). */
  "swap",
  /** Changes on its own as spin speed falls. Nothing to set. */
  "speed",
  /** Fires when the bey is struck (Kreis' halves slipping). */
  "impact",
  /*
   * 🛑 There is deliberately NO "surface" kind. Its only candidate was the
   * claim that Bandit Genbu's TB tip runs on a ball or a cylinder rim
   * depending on the floor — and TB is "Tapered Ball", a FIXED SHAPE with no
   * modes at all (owner, 2026-10-21). An enum value whose only instance turned
   * out not to exist is the speculative infra this project forbids.
   */
] as const;
export type BeyModeSwitchKind = (typeof BEY_MODE_SWITCH_KINDS)[number];

/** One configuration a bey can be set to, or settles into. */
export interface BeyMode {
  /** "Attack", "Stamina", "Barrage". The part's own vocabulary where it has one. */
  name: string;
  /** What it does, in a sentence a buyer can read. No formulae. */
  behaviour: string;
  /**
   * How it comes about, in prose. 🛑 Kept ALONGSIDE `switchKind` rather than
   * replaced by it: the kind is what a filter or a game reads, the sentence is
   * what a person reads, and "Assemble the wheel for six contact points" is
   * not recoverable from `"config"`.
   */
  trigger: string;
  /** Which of the six selection mechanisms this is. */
  switchKind?: BeyModeSwitchKind;
  /** 1-based, for `switchKind: "config"` / `"swap"`. */
  configIndex?: number;
  /**
   * The part that provides the mode — a fusion wheel or a tip in every case
   * confirmed so far.
   *
   * 🛑 Modes are authored against the PART and fanned out to every bey whose
   * composition uses it, so one wheel is described once rather than copied per
   * bey (Root Cause #75). This field keeps that origin visible on the bey, and
   * is what would let a later pass lift modes onto `partGlossary` mechanically.
   */
  appliesToPart?: string;
  /**
   * A second part the mode depends on, when it is an ALIGNMENT between two.
   *
   * 🛑 Not every mode belongs to one part. Lightning and Meteo L-Drago change
   * mode by how the energy ring's dragon heads line up with the wheel's teeth
   * — a property of the PAIR. Without this the data would claim the wheel
   * alone does it.
   */
  requiresPart?: string;
  /**
   * Who or what the claim rests on — `"owner-<date>"` for a confirmed one.
   *
   * 🛑 LOAD-BEARING, not metadata. The generator emits ONLY modes carrying
   * this, because the case-study corpus's mode prose was wrong in four of four
   * claims reviewed. See `scripts/lib/bey-modes-authored.mjs`.
   */
  confirmed?: string;
  /** The case-study case number, where one was read. A claim nobody can trace is a claim nobody can correct. */
  sourceCase?: number;
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

  /**
   * The paired tier-4 category leaf — where this model's LISTINGS live.
   *
   * 🛑 NOT derivable from `slug`. The leaf id comes from the bey's NAME with
   * the trailing parenthetical stripped, so `…-press-hasbro` pairs with
   * `category-…-press`; guessing would 404 on every vendor-qualified bey.
   * Resolved by the generator with the leaf generator's own helper and then
   * CHECKED against the leaves it emitted, so this is present only when the
   * page really exists — 116 beys have no leaf because their `system` is
   * deliberately unmapped.
   */
  categoryId?: string;
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

  /**
   * Configurations this bey can be set to. **4 of 1,988 carry this.**
   *
   * 🛑 ABSENT, NEVER `[]`. An empty array says "this bey has no modes" to
   * every consumer; absent says "unknown", which is the truth for 1,984 of
   * them. Do not default it, and do not treat its absence as a gap to fill
   * mechanically — see `scripts/lib/bey-modes-authored.mjs` for what the
   * corpus can and cannot support, including the one bey excluded because its
   * two sources contradict each other outright.
   *
   * Most of the corpus's mode content is about PARTS, not beys (135 of 147
   * candidates were part-level analyses), so the bulk of it belongs on
   * `partGlossary` if it is ever modelled at all.
   */
  modes?: BeyMode[];

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
  /**
   * Every resolved `beys` id in `assortment`, flat.
   *
   * 🛑 A denormalised MIRROR of `assortment[].beyId`, and it exists for one
   * reason: Firestore cannot `array-contains` a field nested inside objects
   * in an array, so "which products contain this bey" is otherwise
   * unanswerable. Derived by the generator in the same pass that resolves the
   * ids — never hand-maintained, because a mirror somebody can edit
   * independently is the drift in Root Cause #42.
   */
  assortmentBeyIds?: string[];
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
