/**
 * Events Firestore Document Types & Constants
 */

import type { MediaField } from "../../media/types";
import type { JsonValue } from "../../../schemas/types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { EventType, EventStatus, EntryReviewStatus, SaleConfig, OfferConfig, PollConfig, SurveyConfig, FeedbackConfig, RaffleType, SpinPrize } from "../types";
/*
 * A VALUE import, uniquely in this file's import block, and it is required:
 * `legacyEntryAutoApprove` below has to normalise the three pre-2026-10-31
 * type spellings or it silently answers "moderated" for every stored
 * `raffle`/`spin_wheel` document. `../types` imports only types itself, so
 * this introduces no cycle.
 */
import { normalizeEventType } from "../types";
import type { GiveawayConfig } from "../../giveaway/types";
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
  /**
   * Who may publish an entry: nobody (`"moderated"`) or the entrant
   * (`"auto"`). Set ON THE EVENT, per owner 2026-11-09.
   *
   * ## 🛑 This replaces a hardcoded type switch
   *
   * `enterEvent` decided this with:
   *
   *   const autoApprove =
   *     event.type === "poll" || event.type === "feedback" ||
   *     eventType === "giveaway" ||
   *     (event.type === "survey" && !surveyConfig?.entryReviewRequired);
   *
   * That is `event.type === …` branching, which the governing principle names
   * as a defect rather than a safeguard: *"a mechanism never asks what TYPE is
   * this — it asks what CAPABILITY does this have"*. It also meant a NEW event
   * type could not choose: `contest` is absent from that list, so contest
   * entries were moderated by accident rather than by decision, and changing
   * it would have required an appkit release.
   *
   * Now it is a value on the row. A moderated photo contest and an
   * auto-approving one are two seed rows, not two code paths.
   *
   * 🛑 OPEN union, deliberately — `(string & {})` keeps autocomplete while
   * allowing a mode this release has never heard of. `resolveEntryApproval`
   * treats anything unknown as MODERATED, which is the fail-closed direction:
   * an unrecognised setting must not publish unreviewed user content.
   *
   * Unset falls back to the type's default, then to the legacy expression, so
   * no existing event changes behaviour. See `resolveEntryApproval`.
   */
  entryApproval?: EntryApprovalMode;
  /**
   * How much media ONE entry may carry. Owner spec 2026-11-09: **up to 3
   * photos and 1 video, 4 items total.**
   *
   * 🛑 ON THE EVENT ROW, not in code, for the same reason `entryApproval` is:
   * *"for now block single entry only but later allow config changes for all
   * on the events"*. A second contest wanting 10 photos is a seed edit.
   *
   * The caps were already enforced — but as literals inside the submission
   * route's zod schema (`.min(1).max(4)` plus two `.refine`s). That works for
   * exactly one contest and cannot vary per event, which is the shape this
   * project keeps having to undo.
   *
   * ⚠ zod cannot express these statically once they are per-event, so the
   * schema keeps an ABSOLUTE ceiling (a sanity bound on request size) and the
   * handler enforces THIS event's numbers after loading it. Both run; the
   * schema is the cheap gate, the handler is the real one.
   */
  entryMedia?: EventEntryMediaLimits;
  /**
   * How many entries ONE participant may submit to this event.
   *
   * Owner, 2026-11-09: *"for now block single entry only"* — so the default
   * is 1, and an event that wants more sets its own number.
   *
   * 🛑 Enforced on the SERVER, not by hiding the form. A client that has
   * already submitted can still POST again; the check belongs where the write
   * happens.
   */
  entryLimit?: number;
  /**
   * This event's own `entryRanking` RULE-SET ID — the per-event override.
   *
   * ## 🛑 Why the field has to exist at all
   *
   * `event-types-seed-data.ts` binds `ruleSets.entryRanking: "ranking-most-likes"`
   * on the `contest` TYPE, which is the right default home for it. But a type
   * default is shared by every event of that type, so with only that binding a
   * second contest that wants net-score ranking could not be configured
   * without editing the type and changing the first contest with it. The
   * precedence chain the platform uses everywhere else needs a row-level slot,
   * and this is it.
   *
   * ⚠ It stores a rule-set ID (`"ranking-net-score"`), NOT a rule key
   * (`"net-score"`). The ID is what resolves to a row carrying `allowsDislike`
   * and `publicWording` as well as the rule, and those three have to travel
   * together — a contest whose copy says "most likes wins" while the resolver
   * computes a net score is the drift this indirection exists to prevent.
   *
   * 🛑 A plain `string`, not a union. Unknown IDs degrade in
   * `resolveEntryRankingRuleSet` (see `entry-ranking.ts`); they never throw,
   * because newer config against an older deploy must not take a public
   * gallery down.
   *
   * Unset falls back to the type's default, then to the platform default.
   */
  entryRanking?: string;
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
  /*
   * 🛑 BOUNDARY OF THE GIVEAWAY RENAME — stored FIELD names, left as-is.
   *
   * Every user-visible "raffle" string became "giveaway" on 2026-11-08. These
   * did not, and the reason is specific: they are field names on live event
   * documents AND there are query builders on them a few hundred lines below
   * (`withRaffle`, `raffleNotYetDrawn`). Renaming a field means every existing
   * document reads `undefined`, and renaming a QUERIED field additionally means
   * new Firestore composite indexes — so this is a migration, not an edit.
   *
   * The migration, when it is scheduled (plan §A19q): add the new field, write
   * both, backfill, switch reads, add the new indexes, drop the old field. Note
   * that `appkit-seed load` uses `set({merge:true})` and therefore CANNOT remove
   * a field from a live document — the drop step needs its own deliberate pass,
   * which is the same trap the deprecated coupon field below already documents.
   *
   * Until then: the vocabulary is correct everywhere a user, reviewer or
   * regulator can see it, and wrong only where Firestore can see it.
   */
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
  /** Full giveaway config including server-only price/weight fields. */
  giveawayConfig?: GiveawayConfig;
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
  /**
   * CONTEST entries — the media the participant submitted, in display order.
   *
   * Owner spec 2026-11-08 (Diwali photo contest): **at least one image, at most
   * four items in total, of which at most one may be a video.** Those three
   * limits are enforced together in `eventEntryMediaSchema`, not here — a type
   * cannot express "at least one of these is an image".
   *
   * 🛑 Order is meaningful: the FIRST item is the entry's cover everywhere —
   * the gallery card, the scoreboard row and the share image. Reordering is a
   * user action, not a sort.
   */
  media?: EventEntryMedia[];
  /**
   * An optional paragraph explaining the entry, capped at 100 WORDS.
   *
   * Optional by owner decision: a good photo should not lose to a better
   * caption. The cap is on words rather than characters because that is what
   * the rule was written as, and a word count is what the form shows.
   */
  note?: string;
  /**
   * Public like tally for this entry.
   *
   * 🛑 DECLARED 2026-11-10, having been WRITTEN since the vote route shipped.
   * `entry-votes.repository.ts` sets both counters inside its `cast`
   * transaction (`tx.update(entryRef, { likeCount, dislikeCount, … })`) and
   * neither appeared on this type — so a gallery could not read them without a
   * cast, and `tsc` could not see that the ranking key and the stored field
   * were the same thing. Same class as `createdAt` above: a field written but
   * undeclared is invisible to type-driven review.
   *
   * ⚠ OPTIONAL, and it must stay optional. Every entry submitted before its
   * first vote has no value at all, and `undefined` must stay interchangeable
   * with `0` — which is also why the entries read ranks IN MEMORY rather than
   * with a Firestore `orderBy likeCount`: an `orderBy` EXCLUDES documents that
   * lack the ordering field (Root Cause #100), so ordering on this would hide
   * every entry nobody has voted on yet — i.e. most of a contest on day one.
   */
  likeCount?: number;
  /**
   * Public dislike tally. Written by the same transaction as `likeCount`.
   *
   * ⚠ Present even on events whose `entryRanking` rule sets
   * `allowsDislike: false`, where it stays 0 — the vote route refuses a
   * dislike there, so the counter simply never moves. It is NOT conditional
   * on the rule, because the rule can be changed on a live event and the
   * stored shape must not have to change with it.
   */
  dislikeCount?: number;
  submittedAt: Date;
}

/**
 * One submitted item on a contest entry.
 *
 * 🛑 A `type` alias, not an `interface`. An interface has no implicit index
 * signature, so `EventEntryCreateInput` carrying one stops being assignable to
 * `FirestoreDocument` (`Record<string, JsonValue>`) and `encryptPiiFields`
 * fails to compile. The alias keeps the document JSON-shaped, which it has to
 * be anyway to round-trip through Firestore.
 */
export type EventEntryMedia = {
  url: string;
  type: "image" | "video";
  /**
   * Alt text. Required for images by the same rule the catalogue applies —
   * accessibility is a floor, and an entry gallery is nothing but images.
   */
  alt?: string;
};

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
  /*
   * 🛑 Listed so Sieve may `orderBy` them (see `SIEVE_FIELDS` in
   * `event-entry.repository.ts`), NOT because the public gallery uses that
   * sort. It deliberately does not: a Firestore `orderBy` drops every document
   * missing the ordering field, and an entry with no votes has no `likeCount`
   * — so a sort-by-likes query would omit exactly the entries a new contest is
   * made of. The gallery reads a bounded window ordered by `submittedAt` (an
   * index that already exists) and ranks in memory through
   * `resolveEntryRanking`, which is also the only way a CONFIGURED rule —
   * net-score, most-votes, earliest, jury — can be honoured at all.
   *
   * ⚠ An admin surface that does want the raw sort needs the composite
   * `(eventId, reviewStatus, likeCount DESC)` deployed; it is in
   * `firestore.indexes.json`.
   */
  "likeCount",
  "dislikeCount",
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
   * Every `EventType`. The random-draw entry was missing until 2026-08-24,
   * which is why `events-seed-data.ts` — which imports EVENT_FIELDS from
   * HERE, not from `constants/field-names.ts` — had to write the type as a raw
   * string literal while every other row used this map.
   *
   * Renamed 2026-10-31: `RAFFLE` -> `GIVEAWAY`, `SPIN_WHEEL` -> `BONUS_SPIN`,
   * `GIVEAWAY` -> `RANDOM_DRAW`.
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
    GIVEAWAY: "giveaway" as EventType,
    BONUS_SPIN: "bonus-spin" as EventType,
    RANDOM_DRAW: "random-draw" as EventType,
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
  /** Vote counters — written by `entry-votes.repository.ts`'s transaction. */
  LIKE_COUNT: "likeCount",
  DISLIKE_COUNT: "dislikeCount",
  MEDIA: "media",
  NOTE: "note",
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
  // SB9 giveaway/spin helpers. 🛑 These match the CURRENT spellings only —
  // a document still holding `raffle`/`spin_wheel` is invisible to them until
  // the rename migration has run.
  giveaways: () => ["type", "==", "giveaway" as EventType] as const,
  bonusSpins: () => ["type", "==", "bonus-spin" as EventType] as const,
  withRaffle: () => ["hasRaffle", "==", true] as const,
  raffleNotYetDrawn: () => ["raffleWinnerUserId", "==", null] as const,
} as const;


/**
 * How an event decides whether a submitted entry is published immediately.
 *
 * 🛑 OPEN, not a closed enum. The platform ships two modes; a deployment
 * that needs a third ("auto below N entries", "auto for verified buyers")
 * writes its own slug and a resolver rule rather than waiting for a release.
 */
export type EntryApprovalMode = "auto" | "moderated" | (string & {});

/**
 * Resolve the approval mode for one entry submission.
 *
 * Order, most specific first:
 *   1. `event.entryApproval`      — this event's own decision
 *   2. `typeDefault`              — the event TYPE's default, from seed config
 *   3. the legacy expression      — see below
 *
 * 🛑 FAILS CLOSED. Anything not recognised as `"auto"` resolves to
 * moderated. An unknown mode arriving from newer config against an older
 * deploy must not start publishing unreviewed user content — degrading to a
 * review queue is recoverable, publishing is not.
 *
 * ⚠ The third fallback is a MIGRATION PATH, not a design. It reproduces the
 * hardcoded type switch this field replaced so that events already in the
 * database keep behaving exactly as they did. It should be deleted once every
 * event type declares its own default in `event-types-seed-data.ts`.
 */
export function resolveEntryApproval(
  event: { entryApproval?: EntryApprovalMode; type?: string; surveyConfig?: unknown },
  typeDefault?: EntryApprovalMode,
  legacyAutoApprove?: boolean,
): "auto" | "moderated" {
  const chosen = event.entryApproval ?? typeDefault;
  if (chosen !== undefined) return chosen === "auto" ? "auto" : "moderated";
  return legacyAutoApprove ? "auto" : "moderated";
}

/** The shape every approval-mode reader needs off an event document. */
export interface EntryApprovalEventFields {
  entryApproval?: EntryApprovalMode;
  type?: string;
  surveyConfig?: unknown;
  feedbackConfig?: unknown;
}

/**
 * The LEGACY `event.type ===` expression, in one place.
 *
 * ⚠ MIGRATION PATH, not a design — the governing principle names type
 * branching as a defect. It survives only so events already in the database
 * behave exactly as they did before `entryApproval` existed, and
 * {@link resolveEntryApproval} consults it last. Delete it once every event
 * type declares its own default in `event-types-seed-data.ts`.
 *
 * 🛑 It lives HERE rather than inside `enterEvent` because two surfaces now
 * need the answer: the write path, and the UI that has to tell a participant
 * whether their entry will be published or reviewed. A second copy in the
 * reading app would be a second owner of the rule, and the two would say
 * different things to the same person about the same entry.
 *
 * 🛑 Do NOT add a type to this expression.
 */
export function legacyEntryAutoApprove(event: EntryApprovalEventFields): boolean {
  const normalized = normalizeEventType(event.type);
  return (
    event.type === "poll" ||
    event.type === "feedback" ||
    normalized === "giveaway" ||
    (event.type === "survey" &&
      !(event.surveyConfig as { entryReviewRequired?: boolean } | undefined)
        ?.entryReviewRequired)
  );
}

/**
 * The complete chain, for one event document: its own `entryApproval`, then
 * the type's default, then the legacy expression. Fails closed to
 * `"moderated"`.
 *
 * This is what a PAGE calls. `enterEvent` calls it too, so the message a
 * participant reads before submitting and the `reviewStatus` actually written
 * are produced by the same function rather than by two that agree today.
 */
export function resolveEventEntryApproval(
  event: EntryApprovalEventFields,
  typeDefault?: EntryApprovalMode,
): "auto" | "moderated" {
  return resolveEntryApproval(event, typeDefault, legacyEntryAutoApprove(event));
}

/**
 * Participant-facing copy for one approval mode — the DEFAULT TEMPLATE.
 *
 * ## 🛑 Why wording belongs beside the resolver and not in a view
 *
 * `entryApproval` had ZERO readers (the fifth instance of the
 * declared-but-unwired class CLAUDE.md tracks). The contest is `"moderated"`,
 * which is enforced on the write path: the entry is stored `pending` and the
 * public gallery shows only `approved` rows. So a participant submitted, saw a
 * bare green "Entry submitted", and then could not find their photo — which
 * reads as a lost upload and generates exactly the support ticket a review
 * notice exists to prevent.
 *
 * Returning the copy from the same module that resolves the mode means a host
 * cannot render "live now" over a `pending` write. A consumer is free to
 * override the strings — they are a default template, per CLAUDE.md's "we ship
 * the mechanism and the default templates; the user overrides them" — but it
 * has to do so deliberately rather than by forgetting the branch exists.
 *
 * 🛑 Keyed on the resolved MODE, never on `event.type`.
 */
export interface EntryApprovalWording {
  /** Short status chip, e.g. over a submit-confirmation panel. */
  badge: string;
  /** Panel heading. */
  heading: string;
  /** One sentence telling the participant what happens next. */
  body: string;
}

export const ENTRY_APPROVAL_WORDING: Record<"auto" | "moderated", EntryApprovalWording> = {
  auto: {
    badge: "Published",
    heading: "Entry submitted",
    body: "Your entry is live and visible to everyone right away.",
  },
  moderated: {
    badge: "Awaiting review",
    heading: "Entry received — awaiting review",
    body:
      "Entries for this event are checked by a moderator before they appear publicly, so yours is not visible in the gallery yet. Nothing more is needed from you.",
  },
};

/** The copy for an event's resolved mode. Unknown modes get the moderated copy. */
export function describeEntryApproval(
  mode: "auto" | "moderated",
): EntryApprovalWording {
  return ENTRY_APPROVAL_WORDING[mode] ?? ENTRY_APPROVAL_WORDING.moderated;
}

/**
 * Participant-facing copy for the state ONE of their entries is in.
 *
 * ⚠ The stored vocabulary is `pending | approved | flagged`
 * (`EntryReviewStatus`), NOT "rejected" — there is no rejected state in the
 * data, and inventing one in the UI would describe a status the moderation
 * tools cannot produce. `flagged` is what an admin sets when an entry is
 * removed from consideration, so that is what this reports, in the
 * participant's language rather than the moderator's.
 */
export const ENTRY_REVIEW_STATUS_WORDING: Record<
  EntryReviewStatus,
  { label: string; tone: "pending" | "approved" | "rejected"; body: string }
> = {
  pending: {
    label: "Awaiting review",
    tone: "pending",
    body: "A moderator has not looked at this entry yet. It is not in the public gallery.",
  },
  approved: {
    label: "Approved",
    tone: "approved",
    body: "This entry is published and visible to everyone.",
  },
  flagged: {
    label: "Not accepted",
    tone: "rejected",
    body: "This entry was removed from the event by a moderator. Contact support if you think that is wrong.",
  },
};

/** Copy for a stored `reviewStatus`. Unknown values degrade to the pending copy. */
export function describeEntryReviewStatus(
  status: string | undefined,
): { label: string; tone: "pending" | "approved" | "rejected"; body: string } {
  return (
    ENTRY_REVIEW_STATUS_WORDING[status as EntryReviewStatus] ??
    ENTRY_REVIEW_STATUS_WORDING.pending
  );
}


/**
 * Per-entry media caps. All optional — an unset field falls back to the
 * platform default in `resolveEntryMediaLimits`.
 */
export interface EventEntryMediaLimits {
  /** Max images in one entry. Platform default: 3. */
  maxImages?: number;
  /** Max videos in one entry. Platform default: 1. */
  maxVideos?: number;
  /** Max items overall. Platform default: 4. */
  maxTotal?: number;
  /** Require at least one image. Platform default: true. */
  requireImage?: boolean;
  /**
   * The FRAME entry media is displayed in. Platform default: `"square"`.
   *
   * Owner, 2026-11-10, carried here from the cover-orientation ask: *"later
   * add support for portrait or landscape flags for the events instances
   * config"*. This is that flag, at the event level — how a cover renders is
   * machinery, WHICH shape this event's media is, is config.
   */
  aspect?: "square" | "portrait" | "wide" | "video";
  /**
   * Whether media FILLS the frame (cropping the overflow) or FITS inside it.
   *
   * 🛑 Platform default is `"contain"`, deliberately unlike the product
   * galleries. Owner, 2026-11-11: *"just properly contain the image inside the
   * box not trim it"* — a 1199x1312 portrait poster in a square frame was
   * losing the word "Diwali" off both edges. Entrants submit whatever shape
   * their camera produced, so cropping an entry destroys the thing being
   * judged; a product catalogue, where uniform tiles are the point, keeps
   * `"cover"`.
   */
  fit?: "cover" | "contain";
}

/**
 * The platform defaults, stated once. Owner spec 2026-11-09 for the Diwali
 * photo/video contest: 3 photos + 1 video, 4 total.
 *
 * 🛑 `maxTotal` is NOT `maxImages + maxVideos`. It is a separate cap on
 * purpose: 3 + 1 = 4 today, but an event allowing 5 images and 2 videos may
 * still want a 5-item ceiling. Deriving it would silently remove that choice.
 */
export const DEFAULT_ENTRY_MEDIA_LIMITS: Required<EventEntryMediaLimits> = {
  maxImages: 3,
  maxVideos: 1,
  maxTotal: 4,
  requireImage: true,
  aspect: "square",
  fit: "contain",
};

/** The frames an event may ask for. Anything else degrades to the default. */
const ENTRY_MEDIA_ASPECTS: readonly NonNullable<EventEntryMediaLimits["aspect"]>[] =
  ["square", "portrait", "wide", "video"];
const ENTRY_MEDIA_FITS: readonly NonNullable<EventEntryMediaLimits["fit"]>[] =
  ["cover", "contain"];

/** This event's caps, with every unset field filled from the platform default. */
export function resolveEntryMediaLimits(
  limits?: EventEntryMediaLimits,
): Required<EventEntryMediaLimits> {
  return {
    maxImages: limits?.maxImages ?? DEFAULT_ENTRY_MEDIA_LIMITS.maxImages,
    maxVideos: limits?.maxVideos ?? DEFAULT_ENTRY_MEDIA_LIMITS.maxVideos,
    maxTotal: limits?.maxTotal ?? DEFAULT_ENTRY_MEDIA_LIMITS.maxTotal,
    requireImage: limits?.requireImage ?? DEFAULT_ENTRY_MEDIA_LIMITS.requireImage,
    /*
     * 🛑 Validated against the allowed set, not passed through. A stored value
     * this deploy has never heard of — newer config against an older build —
     * must fall back to the default, never reach a className as-is and never
     * throw. Same rule as every other open slug in this codebase.
     */
    aspect: ENTRY_MEDIA_ASPECTS.includes(
      limits?.aspect as NonNullable<EventEntryMediaLimits["aspect"]>,
    )
      ? (limits!.aspect as NonNullable<EventEntryMediaLimits["aspect"]>)
      : DEFAULT_ENTRY_MEDIA_LIMITS.aspect,
    fit: ENTRY_MEDIA_FITS.includes(
      limits?.fit as NonNullable<EventEntryMediaLimits["fit"]>,
    )
      ? (limits!.fit as NonNullable<EventEntryMediaLimits["fit"]>)
      : DEFAULT_ENTRY_MEDIA_LIMITS.fit,
  };
}

/**
 * Check one submission's media against an event's caps.
 *
 * Returns a human-readable reason, or `null` when it passes. A string rather
 * than a boolean because the caller surfaces it to the participant — "At most
 * 3 photos" is actionable; "invalid" is not.
 */
export function checkEntryMedia(
  media: ReadonlyArray<{ type: string }> | undefined,
  limits?: EventEntryMediaLimits,
): string | null {
  const l = resolveEntryMediaLimits(limits);
  const items = media ?? [];
  if (!items.length) {
    return l.requireImage ? "Add at least one photo" : null;
  }
  if (items.length > l.maxTotal) return `At most ${l.maxTotal} items in total`;
  const images = items.filter((m) => m.type === "image").length;
  const videos = items.filter((m) => m.type === "video").length;
  if (images > l.maxImages) return `At most ${l.maxImages} photos`;
  if (videos > l.maxVideos) return `At most ${l.maxVideos} video${l.maxVideos === 1 ? "" : "s"}`;
  if (l.requireImage && images < 1) return "At least one photo is required";
  return null;
}

/** How many entries one participant may submit. Platform default: 1. */
export const DEFAULT_ENTRY_LIMIT = 1;

/**
 * The PLATFORM ceiling on `entryLimit` — owner, 2026-11-10: *"a user can
 * submit only 1 entry or max 5 entries based on the value set by the event
 * instance"*.
 *
 * 🛑 A named platform constant, NOT a number typed into a form or a route. The
 * per-event CHOICE is `event.entryLimit`; this is the ceiling the platform
 * imposes on that choice, and it is the same object as the `platform.disabled`
 * half of CLAUDE.md's config-precedence rule — an event may pick any value
 * inside it and cannot exceed it.
 *
 * ⚠ A stored `entryLimit` ABOVE this clamps rather than throwing. Newer config
 * against an older deploy must not take a public contest page down, and
 * clamping errs toward refusing an extra entry — the recoverable direction.
 */
export const ENTRY_LIMIT_MAX = 5;

/**
 * This event's per-participant entry limit, clamped to the platform ceiling.
 *
 * 🛑 ONE owner for this number. The write path (`enterEvent`), the participate
 * form, the slot allocator in `createEntry` and the inline card controls all
 * call this — a second expression anywhere is how a form offers an entry the
 * server then refuses.
 */
export function resolveEntryLimit(entryLimit?: number): number {
  if (typeof entryLimit !== "number" || !Number.isFinite(entryLimit)) {
    return DEFAULT_ENTRY_LIMIT;
  }
  const floored = Math.floor(entryLimit);
  if (floored < 1) return DEFAULT_ENTRY_LIMIT;
  return Math.min(floored, ENTRY_LIMIT_MAX);
}

/**
 * The entrant's own words — the "~100 word note" the owner asked for.
 *
 * 🛑 ONE owner for the cap, because there are now THREE callers: the submit
 * schema, the edit route, and the form that counts words as you type. The
 * number used to live only in a `.refine()` inside the POST route's zod schema,
 * which is why no form could display it.
 *
 * ⚠ Words, not characters — that is how the rule was written. The character
 * bound is a separate backstop against one pathological "word" and is enforced
 * by the request schemas, which also have to bound the document.
 */
export const ENTRY_NOTE_MAX_WORDS = 100;

/** Words in a note, by the same split the cap is enforced with. */
export function countNoteWords(note: string | undefined): number {
  return (note ?? "").split(/\s+/).filter(Boolean).length;
}

/**
 * Check a note against the word cap. Returns the reason, or `null` to pass.
 *
 * A string rather than a boolean for the same reason `checkEntryMedia` returns
 * one: the caller shows it to the participant.
 */
export function checkEntryNote(note: string | undefined): string | null {
  if (!note) return null;
  return countNoteWords(note) > ENTRY_NOTE_MAX_WORDS
    ? `Keep it to ${ENTRY_NOTE_MAX_WORDS} words`
    : null;
}

/**
 * The live word counter beside a note field.
 *
 * ## 🛑 `"18 / 100 words"` READ AS A TARGET, AND THAT WAS THE DEFECT
 *
 * Owner, 2026-11-12: *"the site also says optional but makes them write 100
 * words — it means 1-100 words, not like 100 exact."*
 *
 * The rule was always a CEILING: `checkEntryNote` only refuses a note ABOVE
 * the cap, an empty note is valid, and the POST schemas agree. Nothing
 * enforced a minimum anywhere. What went wrong was entirely the PRESENTATION
 * — a progress-bar grammar (`n / max`) in front of a maximum. A participant
 * reads "18 / 100" as 82 words still owed, and the word "Optional" was only in
 * the placeholder, which disappears on the first keystroke.
 *
 * ⚠ So this is a copy fix for a rule that was already correct, and it is worth
 * naming as its own class: a correct validator with a misleading counter is
 * indistinguishable, to the person filling the form, from a wrong validator.
 * No typecheck and no audit can see it.
 *
 * 🛑 ONE owner, because there are two note fields — the submit form on the
 * participate page and the inline EDIT form on the entry card — and they sat
 * in different repositories rendering the same hand-written string. Two copies
 * of one sentence is how a fix lands on one of them.
 *
 * Three states, all phrased as a maximum:
 *   0        -> "Optional — up to 100 words"
 *   1..100   -> "18 words · 100 max"
 *   over     -> "118 words · 18 over the 100-word limit"
 */
export function describeEntryNoteCount(words: number): string {
  if (words <= 0) return `Optional — up to ${ENTRY_NOTE_MAX_WORDS} words`;
  if (words <= ENTRY_NOTE_MAX_WORDS) {
    return `${words} ${words === 1 ? "word" : "words"} · ${ENTRY_NOTE_MAX_WORDS} max`;
  }
  const over = words - ENTRY_NOTE_MAX_WORDS;
  return `${words} words · ${over} over the ${ENTRY_NOTE_MAX_WORDS}-word limit`;
}

/**
 * The note field's label, with its optionality IN the label.
 *
 * 🛑 Not in the placeholder. A placeholder is gone the moment someone types,
 * so "Optional" lived exactly as long as it took to stop being readable — and
 * the field a participant was looking at while deciding how much to write
 * carried no statement about it at all.
 */
export const ENTRY_NOTE_LABEL = "Tell us about your entry (optional)";

/** The note field's placeholder. States the cap as a cap. */
export const ENTRY_NOTE_PLACEHOLDER =
  `A few words about your entry — anything up to ${ENTRY_NOTE_MAX_WORDS}. You can leave this blank.`;
