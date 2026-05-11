import { eventRepository } from "../../../../repositories";
import {
  EventNotFoundError,
  EventNotActiveError,
  EventEndedError,
  EventFullError,
} from "../../../shared/features/events/errors";

export async function assertEventActive(eventId: string) {
  const event = await eventRepository.findById(eventId).catch(() => null);
  if (!event) throw new EventNotFoundError(eventId);

  const status = (event as any).status as string | undefined;
  if (status !== "active" && status !== "upcoming") throw new EventNotActiveError(status ?? "unknown");

  const endsAt = (event as any).endsAt
    ? new Date((event as any).endsAt as unknown as string)
    : null;
  if (endsAt && endsAt.getTime() < Date.now()) throw new EventEndedError(eventId);

  const maxEntries = (event as any).stats?.totalEntries ?? (event as any).maxEntries;
  const approvedEntries = (event as any).stats?.approvedEntries ?? 0;
  if (maxEntries && approvedEntries >= maxEntries) throw new EventFullError();

  return event;
}

export function isEventAcceptingRegistrations(event: Record<string, unknown>): boolean {
  const status = event.status as string | undefined;
  if (status !== "active" && status !== "upcoming") return false;
  const endsAt = event.endsAt ? new Date(event.endsAt as unknown as string) : null;
  return !endsAt || endsAt.getTime() > Date.now();
}
