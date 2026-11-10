/**
 * EDIT and DELETE one contest entry — the owner's two new first-class actions.
 *
 * Owner, 2026-11-10:
 *   *"allow users who have already added entries to see the edit their entry
 *   option"* · *"the user can delete their entries as well"* · *"for admin
 *   accounts show inline options to directly edit the entries or the cards or
 *   delete the entries"*.
 *
 * ## 🛑 ONE owner for both writes, called by the routes
 *
 * `enterEvent` is the CREATE half and lives in `event-actions.ts`. These two
 * live here rather than beside it because they share a different pre-flight —
 * resolve the event, load the entry, prove it belongs to that event, then
 * resolve ACCESS — and because `event-actions.ts` is already 1,000+ lines that
 * several lanes touch.
 *
 * Everything policy-shaped is resolved through the same functions the create
 * path uses: `checkEntryMedia` against the EVENT's own `entryMedia`,
 * `checkEntryNote` for the word cap, `resolveEventEntryApproval` for whether a
 * change needs re-review. No `event.type ===` anywhere, and no number typed in.
 *
 * ## 🛑 THE EVENT SEGMENT OF THE PATH IS NOT DECORATIVE
 *
 * `eventEntries` is a FLAT collection, so an entry id is reachable from any
 * event's URL. Both functions prove `entry.eventId === resolvedEventId` and
 * return `null` otherwise — the same check `entryVotes.cast` already makes, for
 * the same reason: without it the event in the URL is a label, not a scope.
 *
 * @tag domain:events
 * @tag layer:action
 * @tag access:server-only
 */

import { ValidationError } from "../../../errors";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import { eventEntryRepository } from "../repository/event-entry.repository";
import { eventEntryVotesRepository } from "../repository/entry-votes.repository";
import { eventRepository } from "../repository/events.repository";
import {
  checkEntryMedia,
  checkEntryNote,
  EVENT_ENTRY_FIELDS,
  resolveEventEntryApproval,
  type EventDocument,
  type EventEntryDocument,
} from "../schemas/firestore";
import { resolveEntryAccess, type EntryAccess } from "./entry-access";

/** What an edit may change. Everything else on an entry is not the entrant's. */
export interface EventEntryEditInput {
  /**
   * The full replacement media list, in display order — the first item is the
   * cover everywhere.
   *
   * ⚠ A REPLACEMENT, not a patch. An edit that removed a photo would otherwise
   * be unexpressible, and "send the set you want" is the shape the upload
   * field already produces.
   *
   * `undefined` leaves the stored media untouched, so a note-only edit does
   * not have to round-trip the photos.
   */
  media?: ReadonlyArray<{ url: string; type: "image" | "video"; alt?: string }>;
  /**
   * The entrant's words. `""` CLEARS the note; `undefined` leaves it.
   *
   * 🛑 The two are deliberately different. Collapsing them is how a UI that
   * omits an untouched field silently wipes it.
   */
  note?: string;
}

export interface EventEntryMutationResult {
  entryId: string;
  eventId: string;
  /** The review state after the write — may have been reset, see below. */
  reviewStatus: string;
  /** Which gate admitted the caller, for the response and the log. */
  access: EntryAccess;
  /** `true` when an owner edit sent an approved entry back for review. */
  requeuedForReview: boolean;
}

/** Why a mutation could not proceed. Kept separate from "not found". */
export class EntryMutationForbiddenError extends Error {
  constructor(message = "You cannot change this entry") {
    super(message);
    this.name = "EntryMutationForbiddenError";
  }
}

/**
 * Resolve the event + entry pair and the caller's access to it.
 *
 * Returns `null` when the event does not exist, the entry does not exist, or
 * the entry belongs to a DIFFERENT event — all three are "not found" to the
 * caller, and distinguishing them would confirm that an entry id exists.
 *
 * Throws {@link EntryMutationForbiddenError} when the pair resolves but the
 * caller may not touch it, so a route can answer 404 and 403 differently
 * without re-deriving either.
 */
async function loadMutableEntry(
  eventIdOrSlug: string,
  entryId: string,
  viewerUid: string,
): Promise<{
  event: EventDocument;
  entry: EventEntryDocument;
  access: EntryAccess;
} | null> {
  const event = await eventRepository.findByIdOrSlug(eventIdOrSlug);
  if (!event) return null;

  const entry = await eventEntryRepository.findById(entryId);
  if (!entry) return null;
  if (String(entry.eventId ?? "") !== String(event.id)) return null;

  /*
   * 🛑 `entry.userId` from the STORED DOCUMENT, and `viewerUid` from a verified
   * session. Neither comes from the request body. This is the whole gate, and
   * the UI's `mine` / `canModerate` flags are a rendering hint that this
   * re-computes — a hidden button is not a permission.
   */
  const access = await resolveEntryAccess(
    typeof entry.userId === "string" ? entry.userId : undefined,
    viewerUid,
  );
  if (!access.canMutate) throw new EntryMutationForbiddenError();

  return { event, entry, access };
}

/**
 * Edit an entry's media and/or note.
 *
 * ## 🛑 AN OWNER EDIT ON A MODERATED EVENT GOES BACK TO `pending`
 *
 * `entryApproval: "moderated"` means a human looks at the content before it is
 * published. Without this, an entrant could submit something innocuous, wait
 * for approval, then edit the photo to anything at all — and it would be live,
 * approved, with a moderator's name on it. The edit path would be a complete
 * bypass of the review the event configured.
 *
 * So: an **owner** editing an `approved` entry on a **moderated** event resets
 * it to `pending`, and the result says so (`requeuedForReview`) so the UI can
 * explain the photo leaving the gallery rather than looking like it broke. A
 * **moderator** edit does not reset — they ARE the review.
 *
 * ⚠ On an `auto` event nothing is reset, because nothing was ever reviewed.
 * That is the Diwali contest's configuration today, which is why the owner's
 * own edit test will show the entry staying in the gallery.
 */
export async function updateEventEntry(
  eventIdOrSlug: string,
  entryId: string,
  input: EventEntryEditInput,
  viewerUid: string,
): Promise<EventEntryMutationResult | null> {
  const loaded = await loadMutableEntry(eventIdOrSlug, entryId, viewerUid);
  if (!loaded) return null;
  const { event, entry, access } = loaded;

  if (input.media === undefined && input.note === undefined) {
    throw new ValidationError("Nothing to change");
  }

  /*
   * ── THE EVENT'S OWN RULES, re-applied on the EDIT path ──────────────────
   *
   * 🛑 Both checks, not just the one the edit touched. If `media` is supplied
   * it is validated against THIS event's caps; if it is not, the STORED media
   * is still validated, because an event whose `entryMedia` has since been
   * tightened must not have its existing entries silently grandfathered into a
   * configuration they now violate by way of a note edit.
   */
  const nextMedia = input.media ?? (entry.media ?? []);
  const mediaProblem = checkEntryMedia(nextMedia, event.entryMedia);
  if (mediaProblem) throw new ValidationError(mediaProblem);

  const noteProblem = checkEntryNote(input.note);
  if (noteProblem) throw new ValidationError(noteProblem);

  const approvalMode = resolveEventEntryApproval(event);
  const wasApproved =
    entry.reviewStatus === EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED;
  const requeuedForReview =
    approvalMode === "moderated" && access.owner && !access.moderator && wasApproved;

  const patch: Record<string, unknown> = {};
  if (input.media !== undefined) patch[EVENT_ENTRY_FIELDS.MEDIA] = input.media;
  /*
   * `""` clears, `undefined` leaves. Firestore cannot store `undefined`, and
   * `prepareForFirestore` strips it — so writing the empty string is what
   * actually removes the note, and the gallery's `entry.note ? …` guard then
   * omits it from the response.
   */
  if (input.note !== undefined) patch[EVENT_ENTRY_FIELDS.NOTE] = input.note;
  if (requeuedForReview) {
    patch[EVENT_ENTRY_FIELDS.REVIEW_STATUS] =
      EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.PENDING;
  }

  await eventEntryRepository.update(entryId, patch as never);

  /*
   * An entry leaving `approved` has to leave the approved COUNT with it, or
   * the public participant number overstates what the gallery shows — the same
   * drift a delete used to cause. `decrementEntryStats` is reused rather than
   * a second expression: it floors at zero and only touches the counter the
   * status it is given maps to.
   */
  if (requeuedForReview) {
    await eventRepository.decrementEntryStats(
      String(event.id),
      EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    );
    /*
     * ⚠ `decrementEntryStats` also drops `totalEntries`, which is wrong here —
     * the entry still exists. Put it back rather than growing a second
     * near-identical transaction: this path is rare (an owner editing an
     * already-approved entry on a moderated event) and the compensating
     * increment is the same call the create path makes.
     */
    await eventRepository.incrementTotalEntries(String(event.id));
  }

  const reviewStatus = requeuedForReview
    ? EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.PENDING
    : String(entry.reviewStatus ?? EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.PENDING);

  serverLogger.info("updateEventEntry", {
    entryId,
    eventId: String(event.id),
    viewerUid,
    owner: access.owner,
    moderator: access.moderator,
    requeuedForReview,
    mediaChanged: input.media !== undefined,
    noteChanged: input.note !== undefined,
  });

  return {
    entryId,
    eventId: String(event.id),
    reviewStatus,
    access,
    requeuedForReview,
  };
}

/**
 * Delete an entry — the entrant's own, or any of them as a moderator.
 *
 * ## 🛑 THREE WRITES, IN THIS ORDER, AND THE ORDER IS THE POINT
 *
 *   1. the VOTE rows, 2. the entry document, 3. the event's counters.
 *
 * Votes first because the entry's document id is the deterministic
 * per-participant slot (`<eventId>:<uid>:<slot>`): a participant who deletes
 * and re-enters gets THE SAME ID BACK, so a stale vote row would attach to the
 * new entry and `cast` would read a first like as a retraction. See
 * `deleteForEntry`.
 *
 * Counters last because they are the only step that is safe to lose. If the
 * decrement fails the entry is still gone and the number is recomputable; if
 * the entry delete failed after a decrement, the count would understate a
 * contest that still has the entry in it.
 *
 * ⚠ The media BYTES are not deleted. They live in the media service, which
 * owns its own data under the microservice rule — this app may not reach into
 * its storage. Flagged rather than silently skipped: an orphaned object is a
 * cost, not a correctness problem, and the right fix is a request to media,
 * not a bucket call from here.
 */
export async function deleteEventEntry(
  eventIdOrSlug: string,
  entryId: string,
  viewerUid: string,
): Promise<EventEntryMutationResult | null> {
  const loaded = await loadMutableEntry(eventIdOrSlug, entryId, viewerUid);
  if (!loaded) return null;
  const { event, entry, access } = loaded;

  const reviewStatus = String(
    entry.reviewStatus ?? EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.PENDING,
  );

  /*
   * A failed vote sweep must not block the delete the participant asked for —
   * but it must be LOUD, because the stale rows are a real defect on a re-entry
   * and silence is how it would be discovered by a voter instead of by us.
   */
  try {
    await eventEntryVotesRepository.deleteForEntry(entryId);
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("deleteEventEntry: vote cascade failed", {
      entryId,
      eventId: String(event.id),
    });
  }

  await eventEntryRepository.delete(entryId);
  await eventRepository.decrementEntryStats(String(event.id), reviewStatus);

  serverLogger.info("deleteEventEntry", {
    entryId,
    eventId: String(event.id),
    viewerUid,
    owner: access.owner,
    moderator: access.moderator,
    reviewStatus,
  });

  return {
    entryId,
    eventId: String(event.id),
    reviewStatus,
    access,
    requeuedForReview: false,
  };
}
