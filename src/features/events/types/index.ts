import type { MediaField } from "../../media/types/index";
import type { JsonValue } from "@mohasinac/appkit";
import type { ClientLotteryConfig } from "../../lottery/types";

// --- Enums / union types ------------------------------------------------------

export type EventType =
  | "sale"
  | "offer"
  | "poll"
  | "survey"
  | "feedback"
  | "raffle"
  | "spin_wheel"
  | "lottery";

/**
 * Every event type, in canonical iteration order — the single array every
 * filter chip group, tab bar and dropdown derives from.
 *
 * Declared as `Record<EventType, true>` rather than a plain array on purpose:
 * adding a member to the union without adding it here is then a COMPILE error,
 * not a silent omission. It exists because there were THREE hand-written
 * enumerations of this union and all three had drifted — the admin chips
 * offered `contest`/`giveaway`/`flash-sale` (values `EventType` never had, so
 * they matched zero rows) while omitting five real types, the public filter
 * omitted `lottery`, and `EVENT_FIELDS.TYPE_VALUES` omitted it too. Same shape
 * as `ALL_LISTING_TYPES_MAP`; same reason (Root Cause #61).
 */
const ALL_EVENT_TYPES_MAP: Record<EventType, true> = {
  sale: true,
  offer: true,
  poll: true,
  survey: true,
  feedback: true,
  raffle: true,
  spin_wheel: true,
  lottery: true,
};

export const ALL_EVENT_TYPES = Object.keys(ALL_EVENT_TYPES_MAP) as EventType[];

/**
 * Display labels for the admin/seller dashboards, which are not i18n-wrapped.
 * Public surfaces use the `filters.eventType*` message keys instead.
 *
 * `Record<EventType, string>` so a new union member is a compile error here too.
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sale: "Sale",
  offer: "Offer",
  poll: "Poll",
  survey: "Survey",
  feedback: "Feedback",
  raffle: "Raffle",
  spin_wheel: "Spin the Wheel",
  lottery: "Lottery",
};

export type RaffleType =
  | "top_n_scorers"
  | "top_n_participants"
  | "open_raffle"
  | "spin_wheel";

/**
 * A spin prize as STORED on the event document. `weight` IS the odds and
 * `couponId` is an internal document id — neither may reach a browser.
 *
 * Authored by the admin editor, read by `assignSpinPrize`. For anything that
 * renders, use `DisplaySpinPrize` below.
 */
export interface SpinPrize {
  id: string;
  label: string;
  couponId?: string;
  weight: number;
  isActive: boolean;
}

/**
 * A spin prize as a VIEW may see it: what it is, not what it is worth.
 *
 * 🛑 This exists because `SpinWheelView.prizes` was typed `SpinPrize[]`, which
 * made `weight` and `couponId` REQUIRED of every caller — so handing the public
 * wheel the full stored prize, odds included, was the only way to satisfy the
 * compiler. The participate page duly cast the stored array straight into a
 * `"use client"` prop and published the odds of every wheel (Root Cause #70).
 *
 * A rendering surface that demands the secret will be given the secret. The
 * structural subset is the fix: `SpinPrize` is assignable to this, so the admin
 * editor keeps passing stored prizes, while a client payload narrowed by
 * `toClientSpinPrize` now satisfies it too — and re-adding `weight` to a
 * client-bound type becomes a deliberate act rather than the path of least
 * resistance.
 */
export interface DisplaySpinPrize {
  id: string;
  label: string;
  isActive?: boolean;
}
export type EventStatus = "draft" | "active" | "paused" | "ended" | "cancelled";

/** Every event status, in lifecycle order. Compile-checked like `ALL_EVENT_TYPES`. */
const ALL_EVENT_STATUSES_MAP: Record<EventStatus, true> = {
  draft: true,
  active: true,
  paused: true,
  ended: true,
  cancelled: true,
};

export const ALL_EVENT_STATUSES = Object.keys(
  ALL_EVENT_STATUSES_MAP,
) as EventStatus[];

/** Dashboard display labels — see `EVENT_TYPE_LABELS`. */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
  cancelled: "Cancelled",
};
export type EntryReviewStatus = "pending" | "approved" | "flagged";
export type PollResultsVisibility = "always" | "after_vote" | "after_end";

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "date"
  | "rating"
  | "file";

// --- Config sub-types ---------------------------------------------------------

export interface SurveyFormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  order: number;
}

export interface SaleConfig {
  discountPercent: number;
  bannerText?: string;
  affectedCategories?: string[];
}

export interface OfferConfig {
  couponId: string;
  displayCode: string;
  bannerText?: string;
}

export interface PollConfig {
  allowMultiSelect: boolean;
  allowComment: boolean;
  options: { id: string; label: string }[];
  resultsVisibility: PollResultsVisibility;
  requireLogin?: boolean;
}

export interface SurveyConfig {
  requireLogin: boolean;
  maxEntriesPerUser: number;
  hasLeaderboard: boolean;
  hasPointSystem: boolean;
  pointsLabel?: string;
  entryReviewRequired: boolean;
  formFields: SurveyFormField[];
}

export interface FeedbackConfig {
  formFields: SurveyFormField[];
  anonymous: boolean;
}

// --- Documents ----------------------------------------------------------------

export interface EventItem {
  id: string;
  slug?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  coverImage?: MediaField | null;
  coverImageUrl?: string;
  eventImages?: MediaField[];
  winnerImages?: MediaField[];
  additionalImages?: MediaField[];
  saleConfig?: SaleConfig;
  offerConfig?: OfferConfig;
  pollConfig?: PollConfig;
  surveyConfig?: SurveyConfig;
  feedbackConfig?: FeedbackConfig;
  /** Promotional coupons shown on the page — see `EventDocument.couponIds`. */
  couponIds?: string[];
  hasRaffle?: boolean;
  raffleType?: RaffleType;
  raffleTopN?: number;
  rafflePrize?: string;
  /** @deprecated legacy scalar — resolve via `rafflePrizeCouponIdsOf`. */
  rafflePrizeCouponId?: string;
  rafflePrizeCouponIds?: string[];
  rafflePrizeProductIds?: string[];
  raffleGithubFunctionUrl?: string;
  raffleWinnerUserId?: string;
  raffleWinnerDisplayName?: string;
  raffleTriggeredAt?: string;
  raffleEntryCount?: number;
  spinPrizes?: SpinPrize[];
  spinMaxPerUser?: number;
  spinWindowStart?: string;
  spinWindowEnd?: string;
  /** Per-event admin toggle — unauthenticated visitors may participate when true. */
  allowGuestParticipation?: boolean;
  /** Lottery config — slots have price/weight stripped for client consumption. */
  lotteryConfig?: ClientLotteryConfig;
  stats: {
    totalEntries: number;
    approvedEntries: number;
    flaggedEntries: number;
    /**
     * Likes — the public social signal the card and hero render in place of
     * the entry count. OPTIONAL: every event written before the field has
     * no value, so readers must treat absent as 0 and must never sort on it
     * in Firestore (an orderBy excludes documents lacking the field).
     */
    likeCount?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventEntryItem {
  id: string;
  eventId: string;
  userId?: string;
  userDisplayName?: string;
  userEmail?: string;
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, JsonValue>;
  reviewStatus: EntryReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  points?: number;
  raffleEligible?: boolean;
  spinUsed?: boolean;
  spinPrizeId?: string;
  spinWonAt?: string;
  submittedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userDisplayName: string;
  /** Sum of all approved entry points for this user in the event */
  totalPoints: number;
  entryCount: number;
}

/**
 * Tallied vote count for a single poll option — used in place of
 * LeaderboardEntry for event.type === "poll" (a voter-ranked leaderboard is
 * meaningless for a poll; this is a per-option result instead).
 */
export interface PollResultEntry {
  optionId: string;
  label: string;
  count: number;
  percent: number;
}

/**
 * One row of the public "Last 10 Spin Results" feed for a spin_wheel event.
 * `userDisplayName` is undefined for guest spins (`isGuest: true`) — callers
 * should render a generic "Guest" label in that case, never a raw hash.
 */
export interface SpinResultEntry {
  id: string;
  userDisplayName?: string;
  isGuest: boolean;
  spinPrizeId?: string;
  spinPrizeTitle?: string;
  spinWonAt?: string;
  /**
   * The coupon code the spin awarded, for the caller's OWN results only.
   *
   * 🛑 `getEventSpinResults` — the PUBLIC masked feed of everyone's recent
   * spins — must never populate this. A coupon code is a bearer token: anyone
   * who can read it can redeem it. Only `getUserSpinResultsForEvent`, which
   * takes a `userId` the server supplies from a verified session, sets it.
   */
  spinPrizeCouponCode?: string;
}

// --- List response ------------------------------------------------------------

export interface EventListResponse {
  items: EventItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface EventEntryListResponse {
  items: EventEntryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// --- Inputs -------------------------------------------------------------------

export interface CreateEventEntryInput {
  eventId: string;
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, JsonValue>;
}

export interface EventListParams {
  q?: string;
  status?: EventStatus;
  type?: EventType;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: string;
}
