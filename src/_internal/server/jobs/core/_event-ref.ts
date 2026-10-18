/**
 * Resolve an event reference from a value that may be either a document id or
 * a slug — the ONE implementation for the `ctx.db` (job-core) layer.
 *
 * ## Why this exists
 *
 * Public URLs link by SLUG: `EventCard` builds its href from
 * `event.slug ?? event.id`, and `/events/[id]/participate` reuses that same
 * route param. So every job core reached from a public surface receives a slug
 * far more often than an id.
 *
 * `assignSpinPrize` and `triggerEventRaffle` both did a bare
 * `.collection("events").doc(eventId).get()` with no slug fallback, so a spin
 * launched from any card link returned `event_not_found` — 404 on every
 * attempt, forever. `enterEvent` had always resolved it correctly
 * (`eventRepository.findByIdOrSlug`, under a comment saying "eventId may have
 * arrived as a slug (public URLs link by slug)"); the two job cores were the
 * copies that never learned the rule.
 *
 * ## Why not `eventRepository.findByIdOrSlug`
 *
 * That is the right call at the repository layer and `enterEvent` keeps using
 * it. A job core holds a raw `Firestore` from `JobContext` and no repository —
 * and no repository in this codebase imports another feature's, because of the
 * Turbopack import-chain trap (Root Cause #6/#18). A raw collection read has
 * neither problem. This function also returns the `DocumentReference`, which a
 * repository method cannot, and the cores need it to write.
 *
 * ## Slug first, deliberately
 *
 * Mirrors `findByIdOrSlug`'s own order. The common caller is a public URL, so
 * the slug query hits on the first try; an id lookup then costs one extra
 * query only on the admin path, where it is already behind a role gate.
 */

import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { EVENT_FIELDS } from "../../../../constants/field-names";

const EVENTS_COLLECTION = "events";

export interface ResolvedEventRef<T = unknown> {
  /** The canonical DOCUMENT ID — never the slug, whichever was passed in. */
  id: string;
  ref: DocumentReference;
  data: T;
}

/**
 * @returns the resolved event, or `null` when neither a slug nor an id matches.
 *
 * 🛑 Callers must use the returned `id` for every subsequent query and write.
 * Carrying the caller's original `idOrSlug` forward is how a guest identity
 * ends up hashed on the slug on one path and on the doc id on another — two
 * identities for one person on one event, which silently resets any per-user
 * cap (see `hashGuestIdentity` at the spin route).
 */
export async function resolveEventRef<T = unknown>(
  db: Firestore,
  idOrSlug: string,
): Promise<ResolvedEventRef<T> | null> {
  if (!idOrSlug) return null;

  const bySlug = await db
    .collection(EVENTS_COLLECTION)
    .where(EVENT_FIELDS.SLUG, "==", idOrSlug)
    .limit(1)
    .get();
  if (!bySlug.empty) {
    const doc = bySlug.docs[0];
    return { id: doc.id, ref: doc.ref, data: doc.data() as T };
  }

  const byId = await db.collection(EVENTS_COLLECTION).doc(idOrSlug).get();
  if (byId.exists) {
    return { id: byId.id, ref: byId.ref, data: byId.data() as T };
  }

  return null;
}
