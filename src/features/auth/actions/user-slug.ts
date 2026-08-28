/*
 * WHY: Users are the only entity in the Slug Prefix System without a real slug —
 *      every profile URL was a raw Firebase uid. This mints one, uniquely,
 *      without moving the document key.
 *
 * WHAT: `reserveUserSlug(uid, displayName)` — transactional claim against a
 *       `userSlugs/{slug}` reservation collection, returning the slug it won.
 *
 * @tag domain:auth
 * @tag layer:server-data
 * @tag access:server-only
 * @tag sideEffects:firestore-write
 */

import { getAdminDb } from "../../../providers/db-firebase/admin";
import { slugify } from "../../../utils";
import { serverLogger } from "../../../monitoring/server-logger";
import { normalizeError } from "../../../errors/normalize";

/** Reservation collection: doc id IS the slug, so the id is the uniqueness. */
export const USER_SLUGS_COLLECTION = "userSlugs";

/**
 * Slugs nobody may hold.
 *
 * `/profile/{slug}` has a `[tab]` child segment, so `overview` and `catalogue`
 * are included even though a collision there is positional rather than fatal —
 * a username that reads like a tab is confusing regardless. The rest are the
 * words a URL-shaped identifier should never be able to impersonate.
 */
const RESERVED = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "register",
  "signup", "signin", "new", "edit", "delete", "settings", "me", "self", "user",
  "users", "profile", "profiles", "store", "stores", "seller", "sellers",
  "support", "help", "about", "contact", "search", "null", "undefined", "root",
  "system", "moderator", "staff", "team", "official", "letitrip",
  // `/profile/{slug}/{tab}` values
  "overview", "catalogue",
]);

/** Display names that carry no identity — `UserSchemaDefaults.DEFAULT_DISPLAY_NAME`. */
const EMPTY_NAMES = new Set(["", "user", "anonymous", "null", "undefined"]);

/** Longest a generated slug may be before the collision suffix. */
const MAX_BASE_LENGTH = 40;

/**
 * The stem a slug is built from.
 *
 * 🛑 `displayName` ONLY. `generateUserId` used to append
 * `email.split("@")[0].substring(0, 8)`, which put the local-part of a real
 * email address into a public URL. That function is deleted; do not
 * reintroduce an email- or phone-derived stem here.
 *
 * 🛑 …AND the caller must pass `email`, because deleting that function was not
 * enough. TWO of the three signup paths — Google callback and session — set
 *
 *     displayName: name ?? email.split("@")[0] ?? DEFAULT_DISPLAY_NAME
 *
 * so a Google account with no name, or any session-created user, already HOLDS
 * its email local-part as its display name. Deriving a slug from displayName
 * would publish it in the URL through the back door. When the two match, this
 * falls back to `member` — a guard that does not depend on every caller
 * remembering, which is the only kind that survives.
 */
export function userSlugBase(
  displayName: string | null | undefined,
  email?: string | null,
): string {
  const base = slugify(displayName ?? "").slice(0, MAX_BASE_LENGTH);
  if (!base || EMPTY_NAMES.has(base)) return "member";

  const localPart = (email ?? "").split("@")[0] ?? "";
  if (localPart && slugify(localPart) === base) return "member";

  return base;
}

/** Whether a candidate may be claimed at all. */
function isClaimable(candidate: string): boolean {
  return candidate.length > 0 && !RESERVED.has(candidate);
}

/**
 * Claim a unique slug for `uid`, returning it.
 *
 * Idempotent per user: if `uid` already holds a reservation, that slug is
 * returned rather than a second one being minted.
 *
 * The claim is a TRANSACTION because Firestore has no unique constraint — a
 * read-then-write races two simultaneous signups onto the same slug, and the
 * loser silently overwrites the winner's reservation.
 */
export async function reserveUserSlug(
  uid: string,
  displayName: string | null | undefined,
  /** Pass it. See `userSlugBase` — two signup paths put the local-part here. */
  email?: string | null,
  opts?: { maxAttempts?: number },
): Promise<string | null> {
  const db = getAdminDb();
  const base = userSlugBase(displayName, email);
  const maxAttempts = opts?.maxAttempts ?? 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // `ravi-kumar`, then `ravi-kumar-2`, `ravi-kumar-3`… The suffix appears
    // only when it has to, so the common case stays clean.
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!isClaimable(candidate)) continue;

    try {
      const won = await db.runTransaction(async (tx) => {
        const ref = db.collection(USER_SLUGS_COLLECTION).doc(candidate);
        const snap = await tx.get(ref);
        if (snap.exists) {
          // Already ours — re-running signup or a backfill must not mint a second.
          return snap.data()?.uid === uid;
        }
        tx.set(ref, { uid, createdAt: new Date() });
        return true;
      });
      if (won) return candidate;
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("reserveUserSlug: transaction failed", {
        uid,
        candidate,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // Never throw: a signup must not fail because a display name is popular.
  // The profile route still resolves by id and uid, so the account works — it
  // just keeps a uid-shaped URL.
  serverLogger.warn("reserveUserSlug: exhausted attempts", { uid, base, maxAttempts });
  return null;
}
