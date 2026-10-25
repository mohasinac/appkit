/**
 * Events Firestore Document Types & Constants
 */

import type { MediaField } from "../../media/types";
import type { JsonValue } from "@mohasinac/appkit";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { EventType, EventStatus, EntryReviewStatus, SaleConfig, OfferConfig, PollConfig, SurveyConfig, FeedbackConfig, RaffleType, SpinPrize } from "../types";
import type { LotteryConfig } from "../../lottery/types";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

export const EVENTS_COLLECTION = "events" as const;
export const EVENT_ENTRIES_COLLECTION = "eventEntries" as const;

/**
 * Shared by both placements: which slide this event owns, and how prominent.
 *
 * `order` is the slide's position in the hero rail. `active` is what decides
 * whether it renders at all — and it is capped downstream, not here: the rail
 * shows at most `MAX_ACTIVE_SLIDES` (5), and `buildSlideFromEvent` refuses
 * loudly rather than emitting a sixth that would never be seen.
 */
interface EventCarouselBase {
  /** Slide order in the hero rail. Lower is earlier. */
  order?: number;
  /**
   * @deprecated Use the top-level `EventDocument.showOnCarousel` instead.
   *
   * 🛑 READ-ONLY LEGACY FALLBACK — DO NOT SET THIS ON NEW EVENTS.
   * This was the publish decision until `showOnCarousel` took that job, and it
   * is still read by `buildSlideFromEvent` for one reason only: every event
   * document already in Firestore carries it and carries no `showOnCarousel`.
   * A strict gate on the new flag would therefore pull every existing slide off
   * the live homepage the moment this shipped, with nothing in any log saying
   * why.
   *
   * The fallback is deliberately ONE-DIRECTIONAL: `showOnCarousel` wins
   * wherever it is present, and nothing ever writes back to this field. That
   * is what keeps it a migration shim rather than a second owner — a mirror
   * field that both sides write is Root Cause #42, and this one has no writer.
   *
   * REMOVE IT once every stored event carries `showOnCarousel`, which is true
   * after one `appkit-seed load` plus one `push-editorial-content.mjs` run.
   */
  active?: boolean;
  /**
   * Background image slug for the slide. Defaults to the event's own
   * `coverImage` when absent, which is usually what you want: the slide and
   * the page it links to then read as one promotion.
   *
   * 🛑 A cover is cropped at `banner` (1200x600) and a hero background wants
   * `hero` (1920x860). Naming a dedicated hero slug here is the difference
   * between a sharp full-bleed backdrop and a 1200px image upscaled across it.
   */
  backgroundMediaSlug?: string;
  /** Dim applied over the background so inverse ink stays readable. 0–1. */
  dimOpacity?: number;
}

/**
 * One headline, one line of copy, one button, centred over the background.
 * The right shape for a single offer with a single call to action.
 */
export interface EventCarouselOverlayConfig extends EventCarouselBase {
  placement: "overlay";
  /** Small uppercase line above the headline — a date, a status, a hook. */
  eyebrow?: string;
  /** The headline. Kept short: it renders at up to 6rem on a wide screen. */
  title: string;
  description?: string;
  buttonText?: string;
}

/**
 * Up to six independently-linked tiles in a 2x3 grid.
 *
 * This is what makes one slide able to advertise several deals at once —
 * each card is its own background, its own copy and its own destination, so
 * three sale events can share a single slide instead of consuming three of
 * the five available.
 */
export interface EventCarouselCardsConfig extends EventCarouselBase {
  placement: "cards";
  /**
   * 🛑 Max SIX. Zones are 1–6 over a 2-row x 3-column grid (row 1 = 1·2·3,
   * row 2 = 4·5·6) and `HeroCarousel` slices to 6 — a seventh card is
   * silently dropped, so it is refused at build time instead.
   */
  cards: EventCarouselCard[];
}

/** One tile. Mirrors `CarouselCard` but without the stored-slide plumbing. */
export interface EventCarouselCard {
  /** 1–3 is the top row, 4–6 the bottom. Desktop only — a phone lays these
   *  out in document order, one per row. */
  zone: 1 | 2 | 3 | 4 | 5 | 6;
  /** Background image slug for this tile. */
  mediaSlug?: string;
  dimOpacity?: number;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Where the tile's button goes. Absent uses the event's own detail page. */
  href?: string;
  buttonText?: string;
}

export type EventCarouselConfig =
  | EventCarouselOverlayConfig
  | EventCarouselCardsConfig;
export interface EventDocument extends BaseDocument {
  /** Normalized edge-n-gram search field — see appkit/src/utils/search-txt.ts. */
  searchTxt?: string[];

  slug?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;

  /**
   * Lift this event to the top of `/events` and the homepage rail, ahead of
   * the `startsAt` ASC default.
   *
   * 🛑 DELIBERATELY NOT IN `EVENT_INDEXED_FIELDS` AND NOT SORTABLE IN SIEVE.
   * A Firestore `orderBy` EXCLUDES every document that lacks the ordering
   * field (Root Cause #100), and `isPinned` is absent from all 1 live event
   * and every seeded row that is not pinned — so ordering by it would empty
   * the events page entirely while answering HTTP 200. The ordering is
   * applied in memory by `sortPinnedFirst`; see the bound stated there.
   *
   * Absent means not pinned. Do not default it to `false` on write — a
   * written `false` and an absent field must stay interchangeable, because
   * every event that predates this field has the latter.
   */
  isPinned?: boolean;

  /** Test-data flag — set on the shared admin-seeded test event; swept by testDataCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testDataCleanup deletes this doc. */
  testDataExpiresAt?: Date;
  startsAt: Date;
  endsAt: Date;
  coverImage?: MediaField | null;
  coverImageUrl?: string;
  eventImages?: MediaField[];
  winnerImages?: MediaField[];
  additionalImages?: MediaField[];
  tags?: string[];
  /**
   * PROMOTIONAL coupons shown on the event page for a reader to copy.
   *
   * 🛑 Not a prize, and not the same field as `rafflePrizeCouponIds` below.
   * These are advertised to everyone who opens the page; those are awarded to
   * one winner. The two were deliberately kept apart rather than overloaded,
   * because every reader of a prize field asks "who won it" and every reader
   * of a promo field asks "can I use it", and one array cannot answer both.
   *
   * Capped at `ATTACHED_COUPON_MAX` by the write schemas AND re-clamped by
   * `couponsRepository.findByIds`. Resolved for display by
   * `getAttachedCoupons`, which drops expired and inactive entries so a page
   * never advertises a code the till will refuse.
   *
   * Mirrors `BlogPostDocument.couponIds` — same name, same shape, same
   * renderer, on purpose.
   */
  couponIds?: string[];

  /**
   * How this event presents itself as a homepage carousel slide.
   *
   * An event is the natural owner of its own promo artwork: authoring the
   * slide here rather than in a separate `carouselSlides` document means the
   * two cannot drift, which they did — the live Diwali slide and its event
   * page carried different headline copy for weeks because each was edited
   * separately.
   *
   * `buildSlideFromEvent()` is the one function that turns this into a
   * `CarouselSlideDocument`; both the seed and `push-editorial-content.mjs`
   * call it, so there is no second rendering of the same intent.
   *
   * 🛑 A DISCRIMINATED UNION ON `placement`, NOT TWO OPTIONAL ARRAYS. A slide's
   * overlay and its cards are sibling `POSITION_FILL` elements — they stack on
   * exactly the same pixels, so a slide carrying both renders its text twice,
   * overlapping. Making that unrepresentable is why this is a union;
   * `push-editorial-content.mjs` had to enforce the same rule imperatively by
   * nulling the opposite field on every merge-write, which only works for as
   * long as everyone remembers to do it.
   */
  carouselConfig?: EventCarouselConfig;

  /**
   * Whether this event is published to the homepage hero rail.
   *
   * 🛑 SEPARATE FROM `carouselConfig`, AND THAT SEPARATION IS THE POINT.
   * `carouselConfig` is the slide's CONTENT — its artwork, headline, zones and
   * copy. This is the DECISION TO PUBLISH it. Before this field the two were
   * the same boolean (`carouselConfig.active`), which made three ordinary
   * things impossible:
   *
   *  1. Authoring a slide ahead of time without it going live. An editor had
   *     to either publish immediately or leave the event with no slide at all.
   *  2. Pulling an event off the rail without touching its artwork. Flipping a
   *     nested field inside a discriminated union is a content edit, and it
   *     reads as one in the audit log.
   *  3. Seeing, from the events LIST, which events are on the rail — a nested
   *     boolean inside an optional union is not something a list column or a
   *     Sieve filter can reach.
   *
   * Absent means NOT on the rail — opt in, never opt out. Every event that
   * predates this field therefore stays off it until someone says otherwise,
   * which is the safe direction for a field that controls what the homepage
   * shows.
   *
   * 🛑 BOTH are required for a slide to exist: this flag says "publish it" and
   * `carouselConfig` says "publish WHAT". `buildSlideFromEvent` returns `null`
   * unless it has both, rather than inventing a slide out of the event's bare
   * title — a slide with no authored artwork is a grey rectangle on the first
   * screen of the site.
   */
  showOnCarousel?: boolean;

  saleConfig?: SaleConfig;
  offerConfig?: OfferConfig;
  pollConfig?: PollConfig;
  surveyConfig?: SurveyConfig;
  feedbackConfig?: FeedbackConfig;
  hasRaffle?: boolean;
  raffleType?: RaffleType;
  raffleTopN?: number;
  rafflePrize?: string;
  /**
   * @deprecated Legacy single raffle-prize coupon. READ-ONLY — kept because
   * `appkit-seed load` writes with `set({merge:true})` and therefore CANNOT
   * remove a field from a live document (§ Seed API Reference), so events
   * written before this widening still carry it and a reader that stops
   * looking silently stops awarding their prize.
   *
   * 🛑 Never write this from new code. Resolve both through
   * `rafflePrizeCouponIdsOf(event)`, which folds the legacy scalar into the
   * array — the reader-side fallback Root Cause #42 prescribes, so no data
   * migration is required and a forgotten write path cannot strand a prize.
   */
  rafflePrizeCouponId?: string;
  /**
   * Coupons awarded to the raffle winner. Replaces the single
   * `rafflePrizeCouponId` above; a raffle may now hand over several.
   */
  rafflePrizeCouponIds?: string[];
  rafflePrizeProductIds?: string[];
  raffleGithubFunctionUrl?: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  raffleWinnerEntryId?: string;
  /**
   * The prize coupon CODES, resolved and frozen at draw time by
   * `triggerEventRaffle` so the prize survives a later edit of the event's
   * coupon list — the same reason an entry stores `spinPrizeCouponCode`
   * instead of re-deriving it.
   *
   * 🛑 Both were WRITTEN by the raffle job and declared on no interface until
   * this change. An undeclared field is invisible to every type-driven review
   * and to `audit-public-projection-parity`, which is how five settings fields
   * ended up publicly readable in Root Cause #70. Declared now, even though
   * both are already public by design (a winner announcement is a public page).
   */
  rafflePrizeCouponCode?: string;
  rafflePrizeCouponCodes?: string[];
  raffleTriggeredAt?: Date;
  raffleEntryCount?: number;
  spinPrizes?: SpinPrize[];
  spinMaxPerUser?: number;
  spinWindowStart?: Date;
  spinWindowEnd?: Date;
  /**
   * Per-event admin toggle — when true, `enterEvent()` (and the spin-prize
   * find-or-create step) allow an unauthenticated caller to participate,
   * identified by a hashed IP instead of a `userId`. Default/undefined
   * preserves the prior per-type login rules (poll/survey require login;
   * non-anonymous feedback requires login; raffle/spin_wheel now also
   * require login unless this flag is set — see Root Cause callout in
   * CLAUDE.md "SSR Architecture" era docs / event-actions.ts `enterEvent`).
   */
  allowGuestParticipation?: boolean;
  /** Full lottery config including server-only price/weight fields. */
  lotteryConfig?: LotteryConfig;
  stats: {
    totalEntries: number;
    approvedEntries: number;
    flaggedEntries: number;
    /**
     * Likes. The public social signal, shown on the card and the detail hero
     * in place of the entry count — nobody "enters" a cashback code, so
     * `totalEntries` was structurally 0 on every `offer` and `sale` event
     * while still being rendered as "0 entries".
     *
     * 🛑 OPTIONAL, and readers must treat absent as 0. Every event written
     * before this field existed has no value for it, so a Firestore
     * `orderBy("stats.likeCount")` would EXCLUDE all of them (Root Cause
     * #100) — sort likes in memory, never in the query.
     *
     * Written only by `eventLikesRepository.toggle`, inside the same
     * transaction that creates or deletes the like row, so the count and the
     * membership cannot disagree.
     */
    likeCount?: number;
  };
  createdBy: string;
}

/**
 * `EventEntryDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type EventEntryPlain = Plaintext<EventEntryDocument>;

export type EventEntryDocument = {
  id: string;
  eventId: string;
  userId?: string;
  /*
   * 🛑 Declared 2026-10-17. `BaseRepository.create` writes `createdAt` and
   * `EVENT_ENTRY_FIELDS.CREATED_AT` names it, so it has always been a real
   * stored field — it was simply absent from this type, and every seed record
   * carried an `as EventEntryDocument` cast that silenced the mismatch. A
   * field written but undeclared is invisible to type-driven review, which is
   * Root Cause #70's shape; it surfaced only when the brand forced the casts
   * out.
   */
  createdAt?: Date;
  updatedAt?: Date;
  userDisplayName?: Encrypted<string>;
  userEmail?: Encrypted<string>;
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, JsonValue>;
  reviewStatus: EntryReviewStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  /** RSVP-style status, distinct from `reviewStatus` (moderation workflow). Drives raffle eligibility + admin confirm/waitlist/cancel actions. */
  status?: "CONFIRMED" | "WAITLISTED" | "CANCELLED";
  points?: number;
  raffleEligible?: boolean;
  spinUsed?: boolean;
  /** Count of spins consumed by this identity, enforced against `EventDocument.spinMaxPerUser`. `spinUsed` is kept as a cheap boolean mirror (count > 0) for existing readers. */
  spinCount?: number;
  spinPrizeId?: string;
  spinPrizeCouponCode?: string | null;
  spinWonAt?: Date;
  ipAddress?: Encrypted<string>;
  /**
   * HMAC-SHA256 blind index of a guest (non-logged-in) participant's IP,
   * scoped per event — `hmacBlindIndex(eventId + ":" + rawIp)`. Set only
   * when `userId` is absent and the event's `allowGuestParticipation` is
   * true. Never the raw IP — see `ipAddress` above, which is a separate,
   * currently-unused field; do not repurpose it for this hash.
   */
  guestIpHash?: string;
  submittedAt: Date;
}

export const EVENT_INDEXED_FIELDS = [
  "searchTxt",
  "type",
  "status",
  "startsAt",
  "endsAt",
  "createdAt",
] as const;
export const EVENT_ENTRY_INDEXED_FIELDS = [
  "eventId",
  "userId",
  "guestIpHash",
  "reviewStatus",
  "status",
  "submittedAt",
  "points",
  "spinWonAt",
] as const;

export const EVENT_FIELDS = {
  /** Word-prefix search tokens. Derived on write by `buildSearchTxtFor`. */
  SEARCH_TXT: "searchTxt",
  ID: "id",
  SLUG: "slug",
  TYPE: "type",
  TITLE: "title",
  DESCRIPTION: "description",
  STATUS: "status",
  STARTS_AT: "startsAt",
  ENDS_AT: "endsAt",
  COVER_IMAGE_URL: "coverImageUrl",
  COVER_IMAGE: "coverImage",
  EVENT_IMAGES: "eventImages",
  WINNER_IMAGES: "winnerImages",
  ADDITIONAL_IMAGES: "additionalImages",
  TAGS: "tags",
  COUPON_IDS: "couponIds",
  RAFFLE_PRIZE_COUPON_IDS: "rafflePrizeCouponIds",
  IS_PINNED: "isPinned",
  ALLOW_GUEST_PARTICIPATION: "allowGuestParticipation",
  CREATED_BY: "createdBy",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  STATUS_VALUES: {
    DRAFT: "draft" as EventStatus,
    ACTIVE: "active" as EventStatus,
    PAUSED: "paused" as EventStatus,
    ENDED: "ended" as EventStatus,
    CANCELLED: "cancelled" as EventStatus,
  },
  /**
   * Every `EventType`. `LOTTERY` was missing until 2026-08-24, which is why
   * `events-seed-data.ts` — which imports EVENT_FIELDS from HERE, not from
   * `constants/field-names.ts` — had to write `type: "lottery"` as a raw string
   * literal while every other row used this map.
   *
   * NB. there are two `EVENT_FIELDS` constants (this one and the one in
   * `constants/field-names.ts`) and they drifted independently. Same shape as
   * the two competing `OrderStatus` types in Root Cause #36. Keep both in step
   * with the `EventType` / `EventStatus` unions until one of them is retired.
   */
  TYPE_VALUES: {
    SALE: "sale" as EventType,
    OFFER: "offer" as EventType,
    POLL: "poll" as EventType,
    SURVEY: "survey" as EventType,
    FEEDBACK: "feedback" as EventType,
    RAFFLE: "raffle" as EventType,
    SPIN_WHEEL: "spin_wheel" as EventType,
    LOTTERY: "lottery" as EventType,
  },
  STATS: {
    TOTAL_ENTRIES: "stats.totalEntries",
    APPROVED_ENTRIES: "stats.approvedEntries",
    FLAGGED_ENTRIES: "stats.flaggedEntries",
  },
} as const;

export const EVENT_ENTRY_FIELDS = {
  ID: "id",
  EVENT_ID: "eventId",
  USER_ID: "userId",
  REVIEW_STATUS: "reviewStatus",
  REVIEWED_BY: "reviewedBy",
  REVIEWED_AT: "reviewedAt",
  SUBMITTED_AT: "submittedAt",
  POINTS: "points",
  GUEST_IP_HASH: "guestIpHash",
  SPIN_USED: "spinUsed",
  SPIN_COUNT: "spinCount",
  SPIN_PRIZE_ID: "spinPrizeId",
  SPIN_PRIZE_COUPON_CODE: "spinPrizeCouponCode",
  SPIN_WON_AT: "spinWonAt",
  REVIEW_STATUS_VALUES: {
    PENDING: "pending" as EntryReviewStatus,
    APPROVED: "approved" as EntryReviewStatus,
    FLAGGED: "flagged" as EntryReviewStatus,
  },
} as const;

export type EventCreateInput = Omit<
  EventDocument,
  "id" | "createdAt" | "updatedAt" | "stats"
>;
export type EventUpdateInput = Partial<
  Omit<EventDocument, "id" | "createdAt" | "createdBy">
>;
/*
 * 🛑 Derived from the PLAIN shape. The caller holds a real name/email and the
 * repository encrypts on write; deriving from the document would demand
 * `Encrypted<string>` nobody has, and `asEncrypted(value)` to satisfy it is
 * the misuse that helper's docstring forbids.
 */
export type EventEntryCreateInput = Omit<
  EventEntryPlain,
  "id" | "submittedAt"
>;

/**
 * Every coupon this event awards its raffle winner, folding the deprecated
 * single `rafflePrizeCouponId` into the array.
 *
 * 🛑 EVERY reader goes through this — never touch either field directly.
 * `appkit-seed load` merge-writes, so it cannot remove a field from a live
 * document: events created before the widening still carry only the scalar,
 * and a reader that looks solely at `rafflePrizeCouponIds` hands those
 * winners nothing while erroring nowhere. Making the READER resilient is the
 * fix Root Cause #42 prescribes, and it means this change needs no migration
 * and no backfill script.
 *
 * Deduped because an admin who edits an old event through the new picker ends
 * up with the same id in both fields, and awarding it twice would double the
 * prize.
 */
export function rafflePrizeCouponIdsOf(
  event: Pick<EventDocument, "rafflePrizeCouponId" | "rafflePrizeCouponIds">,
): string[] {
  const ids = [
    ...(event.rafflePrizeCouponIds ?? []),
    ...(event.rafflePrizeCouponId ? [event.rafflePrizeCouponId] : []),
  ].filter(Boolean);
  return Array.from(new Set(ids));
}

export const eventQueryHelpers = {
  active: () => ["status", "==", "active" as EventStatus] as const,
  byType: (type: EventType) => ["type", "==", type] as const,
  byStatus: (status: EventStatus) => ["status", "==", status] as const,
  upcoming: (date: Date) => ["startsAt", ">", date] as const,
  past: (date: Date) => ["endsAt", "<", date] as const,
  // SB9 raffle/spin helpers
  raffles: () => ["type", "==", "raffle" as EventType] as const,
  spinWheels: () => ["type", "==", "spin_wheel" as EventType] as const,
  withRaffle: () => ["hasRaffle", "==", true] as const,
  raffleNotYetDrawn: () => ["raffleWinnerUserId", "==", null] as const,
} as const;
