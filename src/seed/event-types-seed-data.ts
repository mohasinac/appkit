/**
 * EVENT TYPES — the seeder's view of shipped config.
 *
 * 🛑 THE TABLE MOVED, IT WAS NOT COPIED. It now lives in
 * `features/events/config/event-types.ts`, because `schemas/event-mechanisms.ts`
 * reads it at runtime and the published package EXCLUDES `dist/seed`
 * (`package.json` `files[]` → `"!dist/seed"`). A runtime module importing from
 * here resolves fine locally against a synced dist and then fails for every
 * consumer who installs from the registry — which is how 4.87.0 shipped
 * unusable. See that file's header for the full reasoning.
 *
 * This module exists only so the seeder and anything else already importing
 * `eventTypesSeedData` / `eventMechanismsSeedData` / `EVENT_MECHANISM_IDS` /
 * `eventTypesByKey` keeps working. **Add nothing here.** A new event type or
 * mechanism is a row in the config module; a second copy of the table in this
 * file would be two divergent definitions, and the first edit to either would
 * be invisible to the other.
 */

export type {
  EventMechanismDefinition,
  EventTypeDefinition,
} from "../features/events/config/event-types";

export {
  EVENT_MECHANISM_IDS,
  EVENT_MECHANISM_DEFINITIONS as eventMechanismsSeedData,
  EVENT_TYPE_DEFINITIONS as eventTypesSeedData,
  EVENT_TYPES_BY_KEY as eventTypesByKey,
} from "../features/events/config/event-types";
