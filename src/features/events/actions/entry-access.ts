/**
 * MAY THIS VIEWER TOUCH THIS ENTRY — the one owner of that question.
 *
 * ## 🛑 Why this is its own module
 *
 * Owner, 2026-11-10: *"allow users who have already added entries to see the
 * edit their entry option … the user can delete their entries as well … for
 * admin accounts show inline options to directly edit the entries or the cards
 * or delete the entries"*.
 *
 * That is TWO gates on one action — the entry's OWNER, or a MODERATOR — and
 * four surfaces need the same answer: the gallery read (to decide whether to
 * render the controls at all), the per-entry detail read, the PATCH route and
 * the DELETE route. Two of those are reads and two are writes, so a check
 * written inside either route would have to be duplicated into the other
 * three, and the UI copy would eventually offer a button the write path
 * refuses.
 *
 * ## 🛑 A PERMISSION, never `role === "admin"`
 *
 * CLAUDE.md's governing principle: *a mechanism never asks "what role is
 * this?" — it asks "does this user have the permission?"*. The moderator half
 * resolves through the RBAC provider, which returns the user's permission list
 * from the registry in `features/auth/permissions/constants.ts`.
 * `admin:event-entries:write` is the grant, and it is already held by the
 * `community_manager` and `event_handler` employee roles — so a moderator who
 * is not an admin can moderate entries without anyone adding a role literal
 * here.
 *
 * ⚠ `rbac.isAdmin(uid)` is consulted FIRST and short-circuits, because the
 * registry returns an EMPTY permission list for the admin role by contract
 * (`IRbacProvider.getPermissions`: *"Admin role returns []"*). Checking only
 * the permission list would therefore refuse every admin — the exact inversion
 * `createRouteHandler` avoids with its own `isEffectiveAdminUser` bypass.
 *
 * ## 🛑 THE UI ANSWER IS A HINT. THE WRITE PATH RE-RESOLVES IT.
 *
 * `canModerate` rides on the gallery response so the card can render the
 * controls, and the PATCH/DELETE handlers call `resolveEntryAccess` again
 * against the stored document. A hidden button is not a permission — the
 * endpoint is still reachable with curl.
 *
 * @tag domain:events
 * @tag layer:action
 * @tag access:server-only
 */

import { getProviders } from "../../../contracts/registry";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";

/**
 * The permission that grants moderation of OTHER people's entries.
 *
 * Named once. It is already in `ROLE_PERMISSIONS` for `community_manager` and
 * `event_handler`, and `PERMISSION_GROUPS` surfaces it under "Events" — so
 * granting it is an existing admin action, not a code change.
 */
export const ENTRY_MODERATE_PERMISSION = "admin:event-entries:write";

/**
 * May this uid edit or remove entries that are not theirs?
 *
 * Returns `false` for an absent uid, an unconfigured RBAC provider and a
 * failed permission read alike. 🛑 Fail CLOSED — every one of those three is a
 * state in which we cannot prove the caller is a moderator, and the
 * recoverable direction is refusing a moderator, never admitting a stranger to
 * another entrant's content.
 */
export async function viewerCanModerateEntries(
  uid: string | undefined | null,
): Promise<boolean> {
  if (!uid) return false;
  /*
   * ── 🛑 `getProviders()` IS INSIDE THE TRY, AND THAT IS NOT DEFENSIVE NOISE
   *
   * It THROWS when no registry has been installed, and a SERVER PAGE is
   * exactly that case: `withProviders` wraps API route handlers, so a route
   * has a registry and an RSC render may not.
   *
   * Measured 2026-11-10, with it outside the try: signed OUT, the entries
   * gallery rendered perfectly; signed IN, the SAME page showed *"The entry
   * gallery could not be loaded"* and the entry's own page returned 404 —
   * because a viewer uid is what makes this function run at all. The throw
   * escaped into `getPublicEventEntries`, `safeRead` turned it into `null`,
   * and the page reported a degraded read.
   *
   * 🛑 The differential is the whole lesson: the API route answered 200 with
   * the full entry THE WHOLE TIME, because routes carry the registry. Testing
   * only the API would have reported this feature as working while every
   * signed-in visitor saw a broken gallery — the same "status says healthy,
   * browser says dead" shape this app lost a week to.
   *
   * Failing closed here is correct: an environment that cannot resolve
   * permissions must not grant them, and the WRITE paths re-resolve this
   * anyway. What it must never do is take the public gallery down.
   */
  try {
    const { rbac } = getProviders();
    if (!rbac) {
      /*
       * A deployment that registered no RBAC provider cannot answer this. Say
       * so rather than silently treating everyone as a moderator OR silently
       * treating every admin as a stranger — the first is a security hole and
       * the second is an outage with no error attached to it.
       */
      serverLogger.warn("No RBAC provider: entry moderation denied", { uid });
      return false;
    }
    if (await rbac.isAdmin(uid)) return true;
    const perms = await rbac.getPermissions(uid);
    return perms.includes(ENTRY_MODERATE_PERMISSION);
  } catch (error) {
    void normalizeError(error);
    /*
     * LOUD, not swallowed. "No provider registry in this render" and "the
     * permission read failed" are both real and both worth a line — a silent
     * `false` here is a moderator who cannot moderate with nothing to explain
     * why.
     */
    serverLogger.warn("Entry moderation check failed — denying", {
      uid,
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** What a viewer may do with ONE specific entry. */
export interface EntryAccess {
  /** The entry is the viewer's own. */
  owner: boolean;
  /** The viewer holds `admin:event-entries:write` (or is an admin). */
  moderator: boolean;
  /** `owner || moderator` — may edit the content, may delete the row. */
  canMutate: boolean;
}

/**
 * Resolve both gates for one stored entry.
 *
 * `entryUserId` is the entry document's own `userId` — read from Firestore by
 * the caller, never taken from the request. A guest entry has none, and then
 * only a moderator may touch it: there is no identity for anyone to claim
 * ownership with.
 */
export async function resolveEntryAccess(
  entryUserId: string | undefined | null,
  viewerUid: string | undefined | null,
): Promise<EntryAccess> {
  const owner = Boolean(viewerUid && entryUserId && entryUserId === viewerUid);
  /*
   * ⚠ The owner check does NOT short-circuit the moderator read, and that is
   * deliberate: an admin editing their OWN entry is still acting as a
   * moderator, and the audit trail (`reviewedBy` on a moderated edit) has to
   * be able to say which. One extra permission read on a path that is already
   * doing a document read and a document write.
   */
  const moderator = await viewerCanModerateEntries(viewerUid);
  return { owner, moderator, canMutate: owner || moderator };
}
