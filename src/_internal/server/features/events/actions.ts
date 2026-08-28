"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { eventRepository, eventEntryRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { eventInputSchema, eventUpdateSchema, registerForEventSchema } from "../../../shared/features/events/schema";
import { assertEventActive } from "./service";
import { AlreadyRegisteredError, EventNotFoundError } from "../../../shared/features/events/errors";
import { ValidationError } from "../../../shared/errors/index";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";

export async function createEventAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);
      const parsed = eventInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid event input");
      return eventRepository.createEvent({
        ...(parsed.data as any),
        createdBy: user.uid,
        status: "draft",
        stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
      });
  });
}

export async function updateEventAction(eventId: string, input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);
      const event = await eventRepository.findById(eventId);
      if (!event) throw new EventNotFoundError(eventId);
      const parsed = eventUpdateSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid event input");
      return eventRepository.updateEvent(eventId, parsed.data as any);
  });
}

export async function registerForEventAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const parsed = registerForEventSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid registration input");
    
      const { eventId } = parsed.data;
      await assertEventActive(eventId);
    
      // Check if already registered
      const alreadyRegistered = await eventEntryRepository.hasUserEntered(eventId, user.uid).catch(() => false);
      if (alreadyRegistered) throw new AlreadyRegisteredError(eventId);
    
      const entry = await eventEntryRepository.create({
        eventId,
        userId: user.uid,
        userDisplayName: user.name ?? "Anonymous",
        userEmail: user.email ?? "",
        reviewStatus: "pending",
        submittedAt: new Date(),
      } as any);
    
      // Increment entry count. The entry document is already written and is the
      // authoritative record, so a failed counter bump must not fail the
      // registration — but it leaves `stats.totalEntries` under-reporting, and
      // the capacity check in assertEventActive reads that mirror, so it has to
      // be visible to an operator rather than dropped (Root Cause #42).
      await eventRepository.incrementTotalEntries(eventId).catch((err) => {
        void normalizeError(err);
        serverLogger.warn("events: incrementTotalEntries failed — stats.totalEntries is now stale", {
          eventId,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      });
    
      return entry;
  });
}

export async function cancelEventRegistrationAction(entryId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["buyer", "seller", "admin"]);
      const entry = await eventEntryRepository.findById(entryId);
      if (!entry || (entry as any).userId !== user.uid) {
        throw new ValidationError("Registration not found or does not belong to you");
      }
      return eventEntryRepository.delete(entryId);
  });
}
