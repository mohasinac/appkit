/**
 * Event Domain Actions (appkit/features/events)
 *
 * Business logic for event CRUD, status changes, entries, and public access.
 * Auth, rate-limiting, and input validation are handled by the calling server action.
 */

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import { serverLogger } from "../../../monitoring";
import { eventRepository } from "../repository/events.repository";
import { eventEntryRepository } from "../repository/event-entry.repository";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import { resolveDate } from "../../../utils";
import { hashGuestIdentity } from "../../../security/rate-limit";
import { RAFFLE_MAX_ENTRIES_PER_USER } from "../../../_internal/shared/features/events/config";

const ERR_EVENT_NOT_FOUND = "Event not found";

import { coerceMediaField, getMediaUrl, type MediaField } from "../../../utils";
import {
  finalizeStagedMediaField,
  finalizeStagedMediaObject,
  finalizeStagedMediaObjectArray,
} from "../../media/finalize";
import type {
  EventDocument,
  EventCreateInput,
  EventUpdateInput,
  EventEntryDocument,
} from "../schemas";
import type { EventStatus } from "../types";
import { normalizeEventType } from "../types";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { sortPinnedFirst } from "../utils/sort-pinned";

import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

export interface CreateEventInput {
  type: "sale" | "offer" | "poll" | "survey" | "feedback";
  title: string;
  description?: string;
  status?: "draft" | "active" | "paused" | "ended";
  startsAt?: Date;
  endsAt?: Date;
  coverImage?:
    | {
        url: string;
        type: "image" | "video" | "file";
        alt?: string;
        thumbnailUrl?: string;
      }
    | string
    | null;
  coverImageUrl?: string;
  eventImages?: Array<{
    url: string;
    type: "image" | "video" | "file";
    alt?: string;
    thumbnailUrl?: string;
  }>;
  winnerImages?: Array<{
    url: string;
    type: "image" | "video" | "file";
    alt?: string;
    thumbnailUrl?: string;
  }>;
  additionalImages?: Array<{
    url: string;
    type: "image" | "video" | "file";
    alt?: string;
    thumbnailUrl?: string;
  }>;
  tags?: string[];
  saleConfig?: JsonValue;
  offerConfig?: JsonValue;
  pollConfig?: JsonValue;
  surveyConfig?: JsonValue;
  feedbackConfig?: JsonValue;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface EnterEventInput {
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, JsonValue>;
}
// --- Admin: Create Event --------------------------------------------------

export async function createEvent(
  adminId: string,
  input: CreateEventInput,
): Promise<EventDocument> {
  const finalizedCoverUrl = await finalizeStagedMediaField(
    getMediaUrl(input.coverImage as MediaField | string | null | undefined) ??
      input.coverImageUrl,
  );
  const finalizedCoverImage = await finalizeStagedMediaObject(
    coerceMediaField(
      (input.coverImage ?? finalizedCoverUrl ?? null) as
        | MediaField
        | string
        | null,
      "image",
    ) as MediaField | null,
  );
  const finalizedEventImages = await finalizeStagedMediaObjectArray(
    input.eventImages ?? [],
  );
  const finalizedWinnerImages = await finalizeStagedMediaObjectArray(
    input.winnerImages ?? [],
  );
  const finalizedAdditionalImages = await finalizeStagedMediaObjectArray(
    input.additionalImages ?? [],
  );

  const event = await eventRepository.createEvent({
    ...input,
    coverImage: finalizedCoverImage ?? null,
    coverImageUrl: finalizedCoverImage?.url ?? finalizedCoverUrl,
    eventImages: finalizedEventImages,
    winnerImages: finalizedWinnerImages,
    additionalImages: finalizedAdditionalImages,
    createdBy: adminId,
  } as unknown as EventCreateInput);

  serverLogger.info("createEvent", { adminId, eventId: event.id });
  return event;
}

// --- Admin: Update Event --------------------------------------------------

export async function updateEvent(
  adminId: string,
  id: string,
  input: UpdateEventInput,
): Promise<EventDocument> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError(ERR_EVENT_NOT_FOUND);

  const finalizedCoverUrl = await finalizeStagedMediaField(
    getMediaUrl(input.coverImage as MediaField | string | null | undefined) ??
      input.coverImageUrl,
  );
  const finalizedCoverImage =
    input.coverImageUrl === null
      ? null
      : await finalizeStagedMediaObject(
          coerceMediaField(
            (input.coverImage ?? finalizedCoverUrl ?? null) as
              | MediaField
              | string
              | null,
            "image",
          ) as MediaField | null,
        );
  const finalizedEventImages = input.eventImages
    ? await finalizeStagedMediaObjectArray(input.eventImages)
    : undefined;
  const finalizedWinnerImages = input.winnerImages
    ? await finalizeStagedMediaObjectArray(input.winnerImages)
    : undefined;
  const finalizedAdditionalImages = input.additionalImages
    ? await finalizeStagedMediaObjectArray(input.additionalImages)
    : undefined;

  const updated = await eventRepository.updateEvent(id, {
    ...input,
    coverImage:
      input.coverImageUrl === null ? null : (finalizedCoverImage ?? undefined),
    coverImageUrl:
      input.coverImageUrl === null
        ? undefined
        : (finalizedCoverImage?.url ?? finalizedCoverUrl),
    eventImages: finalizedEventImages,
    winnerImages: finalizedWinnerImages,
    additionalImages: finalizedAdditionalImages,
  } as EventUpdateInput);

  serverLogger.info("updateEvent", { adminId, eventId: id });
  return updated;
}

// --- Admin: Delete Event --------------------------------------------------

export async function deleteEvent(adminId: string, id: string): Promise<void> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError(ERR_EVENT_NOT_FOUND);
  await eventRepository.delete(id);
  serverLogger.info("deleteEvent", { adminId, eventId: id });
}

// --- Admin: Change Status -------------------------------------------------

export async function changeEventStatus(
  adminId: string,
  id: string,
  status: EventStatus,
): Promise<EventDocument> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError(ERR_EVENT_NOT_FOUND);
  const updated = await eventRepository.changeStatus(id, status);
  serverLogger.info("changeEventStatus", { adminId, eventId: id, status });
  return updated;
}

// --- Admin: Update Entry Review -------------------------------------------

export async function adminUpdateEventEntry(
  adminId: string,
  eventId: string,
  entryId: string,
  reviewStatus: "approved" | "flagged",
  reviewNote?: string,
  points?: number,
): Promise<void> {
  await eventEntryRepository.reviewEntry(
    entryId,
    reviewStatus as EventEntryDocument["reviewStatus"],
    adminId,
    reviewNote,
    points,
  );
  serverLogger.info("adminUpdateEventEntry", {
    adminId,
    eventId,
    entryId,
    reviewStatus,
  });
}

// --- Read Actions ----------------------------------------------------------

export async function listPublicEvents(
  params?:
    | string
    | { filters?: string; sorts?: string; page?: number; pageSize?: number },
): Promise<FirebaseSieveResult<EventDocument>> {
  let filters: string | undefined;
  let sorts: string | undefined;
  let page = 1;
  let pageSize = 20;

  if (typeof params === "string" && params) {
    const sp = new URLSearchParams(params);
    filters = sp.get("filters") ?? undefined;
    sorts = sp.get("sorts") ?? undefined;
    if (sp.has("page")) page = Number(sp.get("page"));
    if (sp.has("pageSize")) pageSize = Number(sp.get("pageSize"));
    if (!filters) {
      const parts: string[] = [];
      if (sp.has("status")) parts.push(sieveFilter("status", SIEVE_OP.EQ, sp.get("status")!));
      if (sp.has("type")) parts.push(sieveFilter("type", SIEVE_OP.EQ, sp.get("type")!));
      if (sp.has("types")) {
        const types = sp.get("types")!.split(",");
        if (types.length === 1) parts.push(sieveFilter("type", SIEVE_OP.EQ, types[0]));
      }
      if (parts.length) filters = parts.join(",");
    }
  } else if (params && typeof params === "object") {
    filters = params.filters;
    sorts = params.sorts;
    page = params.page ?? 1;
    pageSize = params.pageSize ?? 20;
  }

  const base = "status==active";
  const result = await eventRepository.list({
    filters: filters ? `${base},${filters}` : base,
    sorts: sorts ?? "startsAt",
    page,
    pageSize,
  });
  // PUBLIC by name — it backs the homepage strip and /events.
  // `sortPinnedFirst` AFTER the test-data filter, so a pinned sandbox event
  // cannot occupy the rail's first slot for a visitor who cannot see it.
  return { ...result, items: sortPinnedFirst(hidePublicTestData(result.items)) };
}

/**
 * 🛑 ONLY `draft` IS HIDDEN. Every other status is public history.
 *
 * This read `status !== "active"`, which collapsed four distinct states into
 * "this event does not exist":
 *
 *   ended     a finished raffle — the thing people come back to read, and the
 *             only place `raffleWinnerDisplayName` is ever shown. The seeded
 *             `event-won-original-set-raffle` has a real recorded winner and
 *             its page answered 404.
 *   cancelled should say it was cancelled. Vanishing tells a visitor holding
 *             the link that they misremembered it, not that it was called off.
 *   paused    temporarily not accepting entries, which is not the same as gone.
 *   draft     genuinely not published yet — the one case 404 is right for.
 *
 * The rendering layer was ALREADY built for this: `events/[id]/layout.tsx`
 * computes `eventStatus`, derives `isActive`, and gates `showParticipateTab`
 * on it. Participation is refused by that gate, not by hiding the page — so
 * this filter was the only thing standing between a visitor and content the
 * UI knew how to show.
 *
 * The API (`GET /api/events/[id]`) already returned cancelled and ended events
 * with 200 while the page 404'd them, so the two layers disagreed about what
 * exists. Measured live before the fix:
 *   active 200/renders · cancelled 200/404 · ended 200/404 · paused 404/404
 */
export async function getPublicEventById(
  id: string,
): Promise<EventDocument | null> {
  const event = await eventRepository.findByIdOrSlug(id);
  if (!event || event.status === "draft") return null;
  return event;
}

export async function getEventLeaderboard(
  eventId: string,
): Promise<import("../types").LeaderboardEntry[]> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  if (!event) return [];
  return eventEntryRepository.getLeaderboard(event.id);
}

/**
 * Last N spins that actually won a prize, most recent first — powers the
 * public "Last 10 Spin Results" tab on `bonus-spin` events. Joins each entry's
 * `spinPrizeId` against the event's `spinPrizes` config for a human label
 * (the entries repository has no access to the events collection, mirroring
 * `getEventPollResults`' join pattern above) and marks guest spins so the
 * caller can render a generic "Guest" label instead of a raw hash.
 */
export async function getEventSpinResults(
  eventId: string,
  limit = 10,
): Promise<import("../types").SpinResultEntry[]> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  // 🛑 `normalizeEventType`: pre-2026-10-31 documents still hold `spin_wheel`.
  if (!event || normalizeEventType(event.type) !== "bonus-spin") return [];

  const prizeTitleById = new Map(
    (event.spinPrizes ?? []).map((p) => [p.id, p.label]),
  );

  const entries = await eventEntryRepository.getRecentSpinResults(event.id, limit);
  /*
   * Spin results are shown publicly, so the entrant name is MASKED — and it
   * has to be masked by `maskedEntry`, which decrypts first. `maskName` on the
   * stored value answers "Anonymous" for every row by design.
   */
  return entries.map((entry) => ({
    id: entry.id,
    /*
     * 🛑 MASKED. This is a public feed on a public event page — the route is
     * not viewer-scoped and never has been — so it was publishing real winners'
     * full display names beside the prize each one won, to anybody with the
     * event's URL.
     *
     * Root Cause #50 is the precedent and it is the same shape: a real bidder's
     * display name was going out on public Bid History because `maskPublicBid`
     * spread its input instead of calling `maskName`. Nothing rendered the field
     * conspicuously there either, which is why it sat unnoticed.
     *
     * `maskName` returns "Anonymous" for a missing name, so the guest case still
     * reads sensibly, and `isGuest` below is what the renderer actually branches
     * on for its own label. A caller's OWN spins are served unmasked by
     * `getUserSpinResultsForEvent` — masking is for other people's.
     */
    /*
       * `maskedEntry`, not `maskName` on the stored value. `maskName`
       * refuses ciphertext by design and answers "Anonymous", so this
       * public list showed every entrant as Anonymous. `maskedEntry`
       * decrypts first, then masks.
       */
      userDisplayName: entry.userId
        ? eventEntryRepository.maskedEntry(entry).userDisplayName
        : undefined,
    isGuest: !entry.userId,
    spinPrizeId: entry.spinPrizeId,
    spinPrizeTitle: entry.spinPrizeId ? prizeTitleById.get(entry.spinPrizeId) : undefined,
    spinWonAt: entry.spinWonAt ? new Date(entry.spinWonAt).toISOString() : undefined,
  }));
}

/**
 * The CALLER'S OWN winning spins for an event, newest first.
 *
 * The companion to `getEventSpinResults`, which is a public masked feed of
 * everyone's recent spins. That feed cannot answer "what did I win", and a
 * checklist case asserting it did was the thing that surfaced the gap: read as
 * a buyer who had never spun, the page listed three other people's prizes and
 * showed no empty state, because from its point of view nothing was empty.
 *
 * Unmasked on purpose — these are the caller's own results, and `userId` is
 * supplied by the server from a verified session, never by the client.
 */
export async function getUserSpinResultsForEvent(
  eventId: string,
  userId: string,
): Promise<import("../types").SpinResultEntry[]> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  // 🛑 `normalizeEventType`: pre-2026-10-31 documents still hold `spin_wheel`.
  if (!event || normalizeEventType(event.type) !== "bonus-spin") return [];

  const prizeTitleById = new Map(
    (event.spinPrizes ?? []).map((p) => [p.id, p.label]),
  );

  const entries = await eventEntryRepository.getUserSpinResults(event.id, userId);
  return entries.map((entry) => ({
    id: entry.id,
    userDisplayName: eventEntryRepository.maskedEntry(entry).userDisplayName,
    isGuest: false,
    spinPrizeId: entry.spinPrizeId,
    spinPrizeTitle: entry.spinPrizeId ? prizeTitleById.get(entry.spinPrizeId) : undefined,
    // Safe here and ONLY here — `userId` comes from a verified session, so
    // this is the caller's own prize. The public feed must not carry it.
    spinPrizeCouponCode: entry.spinPrizeCouponCode ?? undefined,
    spinWonAt: entry.spinWonAt ? new Date(entry.spinWonAt).toISOString() : undefined,
  }));
}

/**
 * Has this signed-in user already entered this event?
 *
 * Exists so the participate page can render a raffle's already-entered state on
 * FIRST PAINT. The form tracked it in `useState(0)`, which a reload reset — so
 * a returning entrant saw an inviting empty form, submitted, and was refused.
 * A refusal the page could have predicted is a worse experience than a form
 * that says so up front.
 *
 * Reuses `hasUserEntered` (one `(eventId, userId)` equality pair, an index that
 * is already proven by `countUserEntries`) rather than counting, because the
 * limit is one — see `RAFFLE_MAX_ENTRIES_PER_USER`.
 */
export async function hasUserEnteredEvent(
  eventId: string,
  userId: string,
): Promise<boolean> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  if (!event) return false;
  return eventEntryRepository.hasUserEntered(event.id, userId);
}

/**
 * Per-option vote tally for a poll event — replaces the voter-ranked
 * leaderboard for event.type === "poll", where ranking "who happened to
 * vote" is meaningless. Mirrors the resultsVisibility gating already used by
 * the /api/events/[id] live-tally response: results are only surfaced when
 * pollConfig.resultsVisibility is "always", or "after_end" once the event
 * has actually ended. ("after_vote" visibility needs per-viewer vote state,
 * which this public/cached read path has no user context for, so it's
 * treated as not-yet-visible here.)
 */
export async function getEventPollResults(
  eventId: string,
): Promise<import("../types").PollResultEntry[]> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  if (!event || event.type !== "poll" || !event.pollConfig) return [];

  const visibility = event.pollConfig.resultsVisibility;
  const canShow =
    visibility === "always" ||
    (visibility === "after_end" && event.status === "ended");
  if (!canShow) return [];

  const tally = await eventEntryRepository.getPollResults(event.id);
  const countByOption = new Map(tally.map((t) => [t.optionId, t.count]));
  const total = tally.reduce((sum, t) => sum + t.count, 0) || 1;

  return event.pollConfig.options.map((opt) => {
    const count = countByOption.get(opt.id) ?? 0;
    return {
      optionId: opt.id,
      label: opt.label,
      count,
      percent: Math.round((count / total) * 100),
    };
  });
}

/** Related events — other active events sharing at least one tag, excluding this one. */
export async function getRelatedEvents(
  tags: string[],
  excludeId: string,
  limit = 6,
): Promise<EventDocument[]> {
  const docs = await eventRepository.findByTagsOverlap(tags, limit + 1);
  return docs.filter((e) => e.id !== excludeId).slice(0, limit);
}

export async function adminListEvents(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<EventDocument>> {
  const sieve: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return eventRepository.list(sieve);
}

export async function adminGetEventById(
  id: string,
): Promise<EventDocument | null> {
  return eventRepository.findById(id);
}

export async function adminGetEventEntries(
  eventId: string,
  params?: { page?: number; pageSize?: number },
): Promise<EventEntryDocument[]> {
  const result = await eventEntryRepository.listForEvent(eventId, {
    sorts: sortBy("createdAt", "DESC"),
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  });
  return result.items;
}

export async function adminGetEventStats(eventId: string): Promise<{
  totalEntries: number;
  approvedEntries: number;
  flaggedEntries: number;
  pendingEntries: number;
} | null> {
  const event = await eventRepository.findById(eventId);
  if (!event) return null;
  const totalEntries = event.stats?.totalEntries ?? 0;
  const approvedEntries = event.stats?.approvedEntries ?? 0;
  const flaggedEntries = event.stats?.flaggedEntries ?? 0;
  return {
    totalEntries,
    approvedEntries,
    flaggedEntries,
    pendingEntries: Math.max(
      0,
      totalEntries - approvedEntries - flaggedEntries,
    ),
  };
}

// --- Public: Enter Event ---------------------------------------------------

export async function enterEvent(
  eventId: string,
  input: EnterEventInput,
  user?: { uid: string; displayName?: string; email?: string },
  request?: Request,
): Promise<{ entryId: string }> {
  const event = await eventRepository.findByIdOrSlug(eventId);
  if (!event || event.status !== "active") {
    throw new NotFoundError(ERROR_MESSAGES.EVENT.ENTRIES_CLOSED);
  }
  // eventId may have arrived as a slug (public URLs link by slug) — resolve
  // to the real doc ID once here and use it for every downstream write, so
  // entries/increments always land against the actual document.
  const resolvedEventId = event.id;

  const now = new Date();
  const endsAt = resolveDate(event.endsAt);
  if (endsAt && now > endsAt) {
    throw new ValidationError(ERROR_MESSAGES.EVENT.ENTRIES_CLOSED);
  }

  // Baseline per-type login requirement, before the admin's per-event
  // `allowGuestParticipation` override is applied. Anonymous feedback is a
  // distinct opt-in concept (the event itself declares no identity is ever
  // collected) so it stays open regardless of the guest-participation flag.
  // 🛑 Resolved through `normalizeEventType` ONCE for this whole function:
  // pre-2026-10-31 documents still hold `raffle`/`spin_wheel`, and a bare
  // equality here would hand every one of them FREE GUEST ACCESS — the exact
  // hole the per-type list had before the flag was introduced.
  const eventType = normalizeEventType(event.type);
  const perTypeRequiresLogin =
    event.type === "poll" ||
    event.type === "survey" ||
    (event.type === "feedback" && !(event.feedbackConfig as any)?.anonymous) ||
    eventType === "giveaway" ||
    eventType === "bonus-spin";

  // Every event type that reaches enterEvent() is now gated by the single
  // admin-controlled flag — giveaway/bonus-spin no longer get accidental free
  // guest access just because they were absent from the old per-type list.
  const requiresLogin = !event.allowGuestParticipation && perTypeRequiresLogin;

  if (requiresLogin && !user) {
    throw new AuthorizationError(ERROR_MESSAGES.EVENT.LOGIN_REQUIRED);
  }

  // Guest path: dedupe by a hashed IP scoped to this event so an anonymous
  // visitor can't submit unlimited entries. The raw IP is never persisted.
  let guestIpHash: string | undefined;
  if (!user && event.allowGuestParticipation) {
    if (!request) {
      // Every real HTTP caller passes the incoming Request — fail closed
      // rather than silently letting an untracked guest entry through.
      throw new AuthorizationError(ERROR_MESSAGES.EVENT.LOGIN_REQUIRED);
    }
    guestIpHash = hashGuestIdentity(resolvedEventId, request);
    const alreadyEntered = await eventEntryRepository.hasGuestEntered(
      resolvedEventId,
      guestIpHash,
    );
    if (alreadyEntered) {
      throw new ValidationError(ERROR_MESSAGES.EVENT.ALREADY_ENTERED);
    }
  }

  if (user && event.type === "survey" && event.surveyConfig) {
    const userEntryCount = await eventEntryRepository.countUserEntries(
      resolvedEventId,
      user.uid,
    );
    if (userEntryCount >= (event.surveyConfig as any).maxEntriesPerUser) {
      throw new ValidationError(ERROR_MESSAGES.EVENT.ALREADY_ENTERED);
    }
  }

  /*
   * 🛑 A signed-in user could vote in a poll as many times as they liked, and
   * every vote counted.
   *
   * Three paths reach this point and only two of them guarded. A GUEST is
   * deduped by hashed IP just above; a SURVEY enforces `maxEntriesPerUser`
   * immediately above that; a poll had neither, so the one case that is trivial
   * to abuse — an authenticated voter clicking Cast Vote again — was the
   * unguarded one. Measured on /events/event-favourite-blader-poll: voted for
   * one option, reloaded, voted for a DIFFERENT option, and the second was
   * accepted with the same "Vote recorded!" confirmation. The event's
   * Participants counter went 362 -> 364 on those two votes from one account, so
   * the tally itself was corrupted, not merely the UI.
   *
   * A poll is one vote per person by definition — there is no
   * `maxEntriesPerUser` to consult and no change-your-vote affordance anywhere
   * in the UI — so the rule is simply "not twice". Uses the same
   * `countUserEntries` the survey path already relies on rather than a new
   * query, so the read cost and the index it needs are both already proven.
   *
   * ValidationError, so the caller gets `ALREADY_ENTERED` and a real message:
   * the previous behaviour silently produced a duplicate, which is the failure
   * mode this refusal exists to replace.
   */
  if (user && event.type === "poll") {
    const priorVotes = await eventEntryRepository.countUserEntries(
      resolvedEventId,
      user.uid,
    );
    if (priorVotes >= 1) {
      throw new ValidationError(ERROR_MESSAGES.EVENT.ALREADY_ENTERED);
    }
  }

  /*
   * 🛑 The same hole, one event type over: a signed-in user could enter the
   * SAME RAFFLE as many times as they liked, and every entry joined the
   * winner pool.
   *
   * Guests were deduped by hashed IP, surveys enforced `maxEntriesPerUser`,
   * polls got the guard documented above — and raffle, the one type where a
   * duplicate entry is a direct and quantifiable unfairness, had none. The
   * client-side guard was inert in two independent ways: `submissionCount` is
   * `useState(0)` that is never hydrated from the server, so a reload resets
   * it; and `maxEntriesPerUser` was not passed to `EventGiveawayEntryForm` at
   * all, so it defaulted to 1 while nothing enforced it.
   *
   * The limit is `RAFFLE_MAX_ENTRIES_PER_USER`, shared with the form that
   * renders "you've used all N entry slots" — there is no raffle config to
   * consult (`maxEntriesPerUser` lives on `SurveyConfig` only), and two
   * mirrored literals is how the UI came to claim a limit nothing enforced.
   *
   * Reuses the same `countUserEntries` as the survey and poll paths, so the
   * read cost and the `(eventId, userId)` index it needs are already proven.
   */
  if (user && eventType === "giveaway") {
    const priorEntries = await eventEntryRepository.countUserEntries(
      resolvedEventId,
      user.uid,
    );
    if (priorEntries >= RAFFLE_MAX_ENTRIES_PER_USER) {
      throw new ValidationError(ERROR_MESSAGES.EVENT.ALREADY_ENTERED);
    }
  }

  if (event.type === "poll" && event.pollConfig) {
    const validOptionIds = (event.pollConfig as any).options.map(
      (o: any) => o.id,
    );
    const votes = input.pollVotes ?? [];
    if (votes.length === 0) {
      throw new ValidationError("Poll vote is required");
    }
    if (!votes.every((v) => validOptionIds.includes(v))) {
      throw new ValidationError("Invalid poll option selected");
    }
    if (!(event.pollConfig as any).allowMultiSelect && votes.length > 1) {
      throw new ValidationError("This poll does not allow multiple selections");
    }
  }

  if (
    (event.type === "survey" || event.type === "feedback") &&
    event[`${event.type}Config` as "surveyConfig" | "feedbackConfig"]
  ) {
    const config =
      event[`${event.type}Config` as "surveyConfig" | "feedbackConfig"]!;
    const formFields = "formFields" in config ? (config as any).formFields : [];
    for (const field of formFields) {
      if (field.required && !input.formResponses?.[field.id]) {
        throw new ValidationError(`Required: ${field.label}`);
      }
    }
  }

  /*
   * 🛑 `raffle` was absent here, and that is what kept the raffle draw broken
   * even after its pool query was fixed.
   *
   * `runTriggerEventRaffle` builds its pool from `reviewStatus == "approved"`.
   * With raffle missing from this list every live entry was written `pending`,
   * so a freshly-entered raffle still drew from an empty pool — the fix to the
   * query alone would have changed nothing a user could see.
   *
   * A raffle entry is a name and an optional message. There is no submitted
   * content to moderate, which is why it belongs with `poll` and `feedback`
   * rather than behind `survey`'s `entryReviewRequired` opt-in. An admin can
   * still FLAG an individual entry, and flagging correctly drops it from the
   * pool — that is the moderation path, not a standing review queue of every
   * entrant.
   */
  const autoApprove =
    event.type === "poll" ||
    event.type === "feedback" ||
    eventType === "giveaway" ||
    (event.type === "survey" &&
      !(event.surveyConfig as any)?.entryReviewRequired);

  const reviewStatus = autoApprove ? "approved" : "pending";

  const entry = await eventEntryRepository.createEntry({
    eventId: resolvedEventId,
    userId: user?.uid,
    userDisplayName: user?.displayName,
    userEmail: user?.email,
    guestIpHash,
    pollVotes: input.pollVotes,
    pollComment: input.pollComment,
    formResponses: input.formResponses,
    reviewStatus,
  });

  await eventRepository.incrementTotalEntries(resolvedEventId);
  if (autoApprove) {
    await eventRepository.incrementApprovedEntries(resolvedEventId);
  }

  serverLogger.info("enterEvent", {
    entryId: entry.id,
    eventId: resolvedEventId,
    type: event.type,
    userId: user?.uid,
  });

  return { entryId: entry.id };
}
