/**
 * @mohasinac/appkit/features/events/server
 *
 * Server-only entry point — exports only the API route handlers.
 */
export * from "./actions";

export {
  EventRepository,
  EventsRepository,
  eventRepository,
} from "./repository/events.repository";
export {
  EventEntryRepository,
  EventEntriesRepository,
  eventEntryRepository,
} from "./repository/event-entry.repository";

export { GET as eventsGET, GET } from "./api/route";
export { GET as eventIdGET } from "./api/[id]/route";
