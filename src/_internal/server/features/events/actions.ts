"use server";

import { eventRepository, eventEntryRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { eventInputSchema, eventUpdateSchema, registerForEventSchema } from "../../../shared/features/events/schema";
import { assertEventActive } from "./service";
import { AlreadyRegisteredError, EventNotFoundError } from "../../../shared/features/events/errors";
import { ValidationError } from "../../../shared/errors/index";

export async function createEventAction(input: unknown) {
  const user = await requireRoleUser(["admin", "moderator"]);
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid event input");
  return eventRepository.createEvent({
    ...(parsed.data as any),
    createdBy: user.uid,
    status: "draft",
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
  });
}

export async function updateEventAction(eventId: string, input: unknown) {
  await requireRoleUser(["admin", "moderator"]);
  const event = await eventRepository.findById(eventId).catch(() => null);
  if (!event) throw new EventNotFoundError(eventId);
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid event input");
  return eventRepository.updateEvent(eventId, parsed.data as any);
}

export async function registerForEventAction(input: unknown) {
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

  // Increment entry count
  await eventRepository.incrementTotalEntries(eventId).catch(() => null);

  return entry;
}

export async function cancelEventRegistrationAction(entryId: string) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const entry = await eventEntryRepository.findById(entryId).catch(() => null);
  if (!entry || (entry as any).userId !== user.uid) {
    throw new ValidationError("Registration not found or does not belong to you");
  }
  return eventEntryRepository.delete(entryId);
}
