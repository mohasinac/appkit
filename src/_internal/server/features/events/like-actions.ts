/**
 * Event like actions — the write path, and the paged read for the modal.
 *
 * @tag domain:events
 * @tag layer:server
 * @tag access:server-only
 */

import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { eventLikesRepository } from "../../../../features/events/repository/event-likes.repository";
import { resolveEventIdAction } from "../raffle/actions";
import { getEventLikers, type EventLikersPage } from "./likes";
import { NotFoundError } from "../../../../errors";
import { LIKERS_PAGE_SIZE } from "../../../../features/events/schemas/likes";

/**
 * Resolve whatever the URL carried into the canonical document id.
 *
 * 🛑 THIS IS LOAD-BEARING, NOT DEFENSIVE. Public event URLs link by SLUG
 * (`/events/festive-cashback-10`), so the route param is usually a slug while
 * the like row's id is `{eventId}__{userId}` and the counter lives at
 * `events/{docId}.stats.likeCount`.
 *
 * Without this, the same person liking from the slug URL and from an id URL
 * would write TWO like rows and increment a counter on a document that may
 * not exist — the same two-identities-for-one-event defect the spin route
 * records as a silent `spinMaxPerUser` bypass. There it was a free reset;
 * here it would be a double-counted like and an orphaned row the tester
 * cascade cannot match.
 */
async function canonicalEventId(idOrSlug: string): Promise<string> {
  const resolved = await resolveEventIdAction(idOrSlug);
  const id = resolved.ok ? resolved.data : null;
  if (!id) throw new NotFoundError(`Event not found: ${idOrSlug}`);
  return id;
}

export async function toggleEventLikeAction(
  idOrSlug: string,
  userId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  return wrapAction(async () => {
    const eventId = await canonicalEventId(idOrSlug);
    return eventLikesRepository.toggle(eventId, userId);
  });
}

export async function getEventLikersAction(
  idOrSlug: string,
  offset = 0,
  limit: number = LIKERS_PAGE_SIZE,
): Promise<ActionResult<EventLikersPage>> {
  return wrapAction(async () => {
    const eventId = await canonicalEventId(idOrSlug);
    /*
     * Clamped, because `limit` arrives from a query string. An unclamped
     * caller-supplied page size is an unbounded read against Rule #6's
     * budget — `?limit=100000` would be a full-collection scan plus one user
     * lookup per row.
     */
    const safeLimit = Math.min(Math.max(1, limit), LIKERS_PAGE_SIZE);
    return getEventLikers(eventId, safeLimit, Math.max(0, offset));
  });
}
