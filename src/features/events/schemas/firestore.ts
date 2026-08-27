/**
 * Events Firestore Document Types & Constants
 */

import type { MediaField } from "../../media/types";
import type { JsonValue } from "@mohasinac/appkit";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { EventType, EventStatus, EntryReviewStatus, SaleConfig, OfferConfig, PollConfig, SurveyConfig, FeedbackConfig, RaffleType, SpinPrize } from "../types";
import type { LotteryConfig } from "../../lottery/types";

export const EVENTS_COLLECTION = "events" as const;
export const EVENT_ENTRIES_COLLECTION = "eventEntries" as const;
export interface EventDocument extends BaseDocument {
  /** Normalized edge-n-gram search field — see appkit/src/utils/search-txt.ts. */
  searchTxt?: string[];

  slug?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;

  /** Tester sandbox flag — set on the shared admin-seeded test event; swept by testerSandboxCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testerSandboxCleanup deletes this doc. */
  testDataExpiresAt?: Date;
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
  };
  createdBy: string;
}

export type EventEntryDocument = {
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
  ipAddress?: string;
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
