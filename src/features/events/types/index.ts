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

export interface SpinPrize {
  id: string;
  label: string;
  couponId?: string;
  weight: number;
  isActive: boolean;
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
  hasRaffle?: boolean;
  raffleType?: RaffleType;
  raffleTopN?: number;
  rafflePrize?: string;
  rafflePrizeCouponId?: string;
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
