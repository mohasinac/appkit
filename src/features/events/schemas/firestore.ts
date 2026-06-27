/**
 * Events Firestore Document Types & Constants
 */

import type { MediaField } from "../../media/types";
import type { JsonValue } from "@mohasinac/appkit";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type {
  EventType,
  EventStatus,
  EntryReviewStatus,
  FormFieldType,
  PollResultsVisibility,
  SurveyFormField,
  SaleConfig,
  OfferConfig,
  PollConfig,
  SurveyConfig,
  FeedbackConfig,
  RaffleType,
  SpinPrize,
} from "../types";

export const EVENTS_COLLECTION = "events" as const;
export const EVENT_ENTRIES_COLLECTION = "eventEntries" as const;
export interface EventDocument extends BaseDocument {
  slug?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date;
  coverImage?: MediaField | null;
  coverImageUrl?: string;
  eventImages?: MediaField[];
  winnerImages?: MediaField[];
  additionalImages?: MediaField[];
  tags?: string[];
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
  raffleWinnerEntryId?: string;
  raffleTriggeredAt?: Date;
  raffleEntryCount?: number;
  spinPrizes?: SpinPrize[];
  spinMaxPerUser?: number;
  spinWindowStart?: Date;
  spinWindowEnd?: Date;
  stats: {
    totalEntries: number;
    approvedEntries: number;
    flaggedEntries: number;
  };
  createdBy: string;
}

export interface EventEntryDocument {
  id: string; // audit-schema-base-ok: uses submittedAt instead of updatedAt — cannot extend BaseDocument
  eventId: string;
  userId?: string;
  userDisplayName?: string;
  userEmail?: string;
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, JsonValue>;
  reviewStatus: EntryReviewStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  points?: number;
  raffleEligible?: boolean;
  spinUsed?: boolean;
  spinPrizeId?: string;
  spinPrizeCouponCode?: string | null;
  spinWonAt?: Date;
  ipAddress?: string;
  submittedAt: Date;
}

export const EVENT_INDEXED_FIELDS = [
  "type",
  "status",
  "startsAt",
  "endsAt",
  "createdAt",
] as const;
export const EVENT_ENTRY_INDEXED_FIELDS = [
  "eventId",
  "userId",
  "reviewStatus",
  "submittedAt",
  "points",
] as const;

export const EVENT_FIELDS = {
  ID: "id",
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
  TYPE_VALUES: {
    SALE: "sale" as EventType,
    OFFER: "offer" as EventType,
    POLL: "poll" as EventType,
    SURVEY: "survey" as EventType,
    FEEDBACK: "feedback" as EventType,
    RAFFLE: "raffle" as EventType,
    SPIN_WHEEL: "spin_wheel" as EventType,
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
export type EventEntryCreateInput = Omit<
  EventEntryDocument,
  "id" | "submittedAt"
>;

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
