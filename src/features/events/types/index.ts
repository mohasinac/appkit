import type { MediaField } from "../../media/types/index";
import type { JsonValue } from "@mohasinac/appkit";

// --- Enums / union types ------------------------------------------------------

export type EventType =
  | "sale"
  | "offer"
  | "poll"
  | "survey"
  | "feedback"
  | "raffle"
  | "spin_wheel";

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
