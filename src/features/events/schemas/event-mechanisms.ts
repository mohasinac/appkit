/**
 * Event MECHANISMS — "what can a visitor DO with this event", read from config.
 *
 * ## 🛑 This is the capability lookup that replaces `event.type === …`
 *
 * The governing principle: *a mechanism never asks "what type is this?" — it
 * asks "does this thing have the capability?"*. `config/event-types.ts`
 * already stores the answer as data: every type carries a boolean for each of
 * the thirteen declared mechanisms, and the `contest` row switches on
 * `submission`, `entryVoting`, `prizePool`, `capacityLimit` and `ageGate`.
 *
 * That table had no runtime reader, so every surface that needed "does this
 * event collect entries people vote on" had to write `type === "contest"` —
 * which then has to be edited for the second kind of event that does, and is
 * exactly what the table exists to avoid. One lookup here, and a new ranked,
 * submission-based event type is a config row.
 *
 * ⚠ The table is imported from `../config/`, never from `../../../seed/`. The
 * published package excludes `dist/seed`, so a runtime import into the seed
 * resolves locally against a synced dist and then fails to resolve for every
 * consumer who installs from the registry. 4.87.0 shipped exactly that way.
 *
 * ## 🛑 Absent means OFF, and that is a degrade not a default
 *
 * A stored `type` this build has never heard of resolves to no definition, so
 * every mechanism reads `false`. For a TAB or a BUTTON that is the right
 * direction: an unrecognised event renders its overview and nothing it cannot
 * describe, rather than offering a gallery it has no rules for.
 *
 * @tag domain:events
 * @tag layer:schema
 */

import {
  EVENT_TYPE_DEFINITIONS,
  type EventTypeDefinition,
} from "../config/event-types";

/**
 * The mechanism ids this module is consulted about by name elsewhere.
 *
 * Not an exhaustive re-listing of `EVENT_MECHANISM_IDS` — that would be a
 * second copy of the table. These are the two the entry surfaces gate on,
 * named so a typo is a compile error rather than a silently false lookup.
 */
export const EVENT_MECHANISM = {
  /** Participants upload something — so the event HAS entries to show. */
  SUBMISSION: "submission",
  /** Visitors vote on those entries; counts public, voters admin-only. */
  ENTRY_VOTING: "entryVoting",
} as const;

/** The config row for a stored `type` slug, or `undefined` if unrecognised. */
export function eventTypeDefinition(
  type: string | undefined,
): EventTypeDefinition | undefined {
  if (!type) return undefined;
  // `key` first, `slug` second — a stored value is whichever the authoring
  // surface wrote, and they are equal for every shipped row.
  return EVENT_TYPE_DEFINITIONS.find((t) => t.key === type || t.slug === type);
}

/**
 * Does this event's TYPE switch on a given mechanism?
 *
 * Fails closed: unknown type, unknown mechanism, or a row that simply does not
 * enable it all answer `false`.
 */
export function eventTypeHasMechanism(
  type: string | undefined,
  mechanism: string,
): boolean {
  return eventTypeDefinition(type)?.mechanisms[mechanism] === true;
}

/**
 * Does this event have a public ENTRY GALLERY at all?
 *
 * `submission` is the load-bearing half — without it there is nothing to show.
 * `entryVoting` is deliberately NOT required: a submission event with voting
 * switched off still has entries worth displaying, it just displays them
 * without vote controls, which is what {@link eventTypeHasEntryVoting} gates
 * separately. Collapsing the two would make the gallery appear and disappear
 * with the vote button.
 */
export function eventTypeHasEntryGallery(type: string | undefined): boolean {
  return eventTypeHasMechanism(type, EVENT_MECHANISM.SUBMISSION);
}

/** May visitors vote on this event's entries? */
export function eventTypeHasEntryVoting(type: string | undefined): boolean {
  return eventTypeHasMechanism(type, EVENT_MECHANISM.ENTRY_VOTING);
}
