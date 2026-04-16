/**
 * Event Domain Actions (appkit/features/events)
 *
 * Business logic for event CRUD, status changes, entries, and public access.
 * Auth, rate-limiting, and input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
import { eventRepository } from "../repository/events.repository";
import { eventEntryRepository } from "../repository/event-entry.repository";
import { maskPublicEventEntry } from "../../../security";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import { resolveDate } from "../../../utils";
import { coerceMediaField, getMediaUrl, type MediaField } from "../../../utils";
import {
  finalizeStagedMediaField,
  finalizeStagedMediaObject,
  finalizeStagedMediaObjectArray,
} from "../../media";
import type {
  EventDocument,
  EventCreateInput,
  EventUpdateInput,
  EventEntryDocument,
} from "../schemas";
import type { EventStatus } from "../types";
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
  saleConfig?: unknown;
  offerConfig?: unknown;
  pollConfig?: unknown;
  surveyConfig?: unknown;
  feedbackConfig?: unknown;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface EnterEventInput {
  pollVotes?: string[];
  pollComment?: string;
  formResponses?: Record<string, unknown>;
}
// ─── Admin: Create Event ──────────────────────────────────────────────────

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

// ─── Admin: Update Event ──────────────────────────────────────────────────

export async function updateEvent(
  adminId: string,
  id: string,
  input: UpdateEventInput,
): Promise<EventDocument> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError("Event not found");

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

// ─── Admin: Delete Event ──────────────────────────────────────────────────

export async function deleteEvent(adminId: string, id: string): Promise<void> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError("Event not found");
  await eventRepository.delete(id);
  serverLogger.info("deleteEvent", { adminId, eventId: id });
}

// ─── Admin: Change Status ─────────────────────────────────────────────────

export async function changeEventStatus(
  adminId: string,
  id: string,
  status: EventStatus,
): Promise<EventDocument> {
  const existing = await eventRepository.findById(id);
  if (!existing) throw new NotFoundError("Event not found");
  const updated = await eventRepository.changeStatus(id, status);
  serverLogger.info("changeEventStatus", { adminId, eventId: id, status });
  return updated;
}

// ─── Admin: Update Entry Review ───────────────────────────────────────────

export async function adminUpdateEventEntry(
  adminId: string,
  eventId: string,
  entryId: string,
  reviewStatus: "approved" | "flagged",
  reviewNote?: string,
): Promise<void> {
  await eventEntryRepository.reviewEntry(
    entryId,
    reviewStatus as EventEntryDocument["reviewStatus"],
    adminId,
    reviewNote,
  );
  serverLogger.info("adminUpdateEventEntry", {
    adminId,
    eventId,
    entryId,
    reviewStatus,
  });
}

// ─── Read Actions ──────────────────────────────────────────────────────────

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
      if (sp.has("status")) parts.push(`status==${sp.get("status")}`);
      if (sp.has("type")) parts.push(`type==${sp.get("type")}`);
      if (sp.has("types")) {
        const types = sp.get("types")!.split(",");
        if (types.length === 1) parts.push(`type==${types[0]}`);
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
  return eventRepository.list({
    filters: filters ? `${base},${filters}` : base,
    sorts: sorts ?? "startsAt",
    page,
    pageSize,
  });
}

export async function getPublicEventById(
  id: string,
): Promise<EventDocument | null> {
  const event = await eventRepository.findById(id);
  if (!event || event.status !== "active") return null;
  return event;
}

export async function getEventLeaderboard(
  eventId: string,
): Promise<ReturnType<typeof maskPublicEventEntry<EventEntryDocument>>[]> {
  const entries = await eventEntryRepository.getLeaderboard(eventId);
  return entries.map(maskPublicEventEntry);
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
    sorts: "-createdAt",
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

// ─── Public: Enter Event ───────────────────────────────────────────────────

export async function enterEvent(
  eventId: string,
  input: EnterEventInput,
  user?: { uid: string; displayName?: string; email?: string },
): Promise<{ entryId: string }> {
  const event = await eventRepository.findById(eventId);
  if (!event || event.status !== "active") {
    throw new NotFoundError(ERROR_MESSAGES.EVENT.ENTRIES_CLOSED);
  }

  const now = new Date();
  const endsAt = resolveDate(event.endsAt);
  if (endsAt && now > endsAt) {
    throw new ValidationError(ERROR_MESSAGES.EVENT.ENTRIES_CLOSED);
  }

  const requiresLogin =
    event.type === "poll" ||
    event.type === "survey" ||
    (event.type === "feedback" && !(event.feedbackConfig as any)?.anonymous);

  if (requiresLogin && !user) {
    throw new AuthorizationError(ERROR_MESSAGES.EVENT.LOGIN_REQUIRED);
  }

  if (user && event.type === "survey" && event.surveyConfig) {
    const userEntryCount = await eventEntryRepository.countUserEntries(
      eventId,
      user.uid,
    );
    if (userEntryCount >= (event.surveyConfig as any).maxEntriesPerUser) {
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

  const autoApprove =
    event.type === "poll" ||
    event.type === "feedback" ||
    (event.type === "survey" &&
      !(event.surveyConfig as any)?.entryReviewRequired);

  const reviewStatus = autoApprove ? "approved" : "pending";

  const entry = await eventEntryRepository.createEntry({
    eventId,
    userId: user?.uid,
    userDisplayName: user?.displayName,
    userEmail: user?.email,
    pollVotes: input.pollVotes,
    pollComment: input.pollComment,
    formResponses: input.formResponses,
    reviewStatus,
  });

  await eventRepository.incrementTotalEntries(eventId);
  if (autoApprove) {
    await eventRepository.incrementApprovedEntries(eventId);
  }

  serverLogger.info("enterEvent", {
    entryId: entry.id,
    eventId,
    type: event.type,
    userId: user?.uid,
  });

  return { entryId: entry.id };
}
