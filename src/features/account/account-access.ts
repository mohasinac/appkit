/**
 * MAY THIS VIEWER READ OR WRITE THIS ACCOUNT — and WHICH FIELDS.
 *
 * ## 🛑 Why this exists
 *
 * `features/account/api/[userId]/route.ts` shipped with **no authorization at
 * all**: it took `params.userId` and `await request.json()` and called
 * `repo.update(userId, body)`. Three separate holes in four lines —
 *
 * 1. **no session check** — any caller, signed out;
 * 2. **no ownership check** — any `userId`, not just the caller's own;
 * 3. **no field filter** — an arbitrary body, so `{"roles":["admin"]}` is a
 *    one-request privilege escalation, and `{"pointsBalance":999999}` mints
 *    money against a field whose own doc comment says `pointsRepository` is
 *    *"the only thing allowed to write it"*.
 *
 * Its GET was the read half of the same hole: `repo.findById` returns the RAW
 * document, so it published `email` ciphertext, `emailIndex`, `phoneIndex` and
 * `nameTokensIndex` for any uid. ⚠ The blind indices are the worst of those —
 * an HMAC index is an offline *"is this address registered here"* oracle, the
 * same class as the recorded `/api/categories/[id]` and `/api/admin/payouts`
 * leaks.
 *
 * It was **mounted by nothing** when found (no app or the shop exports it, and
 * it is in no barrel), so it was never live — but `./features/*` is a wildcard
 * export and the file's own docstring *invites* mounting it with a copy-paste
 * `Consumer stub`. A loaded gun shipped in the published package is still a
 * defect; the next consumer to wire up its own account page gets all three.
 *
 * ## 🛑 AN ALLOWLIST, NEVER A DENYLIST
 *
 * The tempting fix is to strip `roles`/`permissions` from the body. That fails
 * **open**: the privilege surface on `UserDocument` is already large —
 * `role`, `roles`, `primaryRole`, `permissions`, `permissionGroup`,
 * `pointsBalance`, `softBans`, the seven `hardBan*` fields, `isTester`,
 * `canTestAdmin`, `emailVerified`, `disabled` — and it GROWS. A denylist
 * silently admits the next field anyone adds to the schema, and the symptom of
 * that is a privilege escalation nobody wrote a line of code to create.
 *
 * So the gate is an allowlist of what a user may change about THEMSELVES, and
 * anything unlisted is dropped. Adding a self-editable field is then a
 * deliberate one-line edit here, and forgetting to add one is a visible
 * "cannot save" rather than an invisible hole.
 *
 * ## 🛑 A PERMISSION, never `role === "admin"`
 *
 * CLAUDE.md's governing principle: *a mechanism never asks "what role is
 * this?" — it asks "does this user have the permission?"*. The moderator half
 * resolves through the RBAC provider; `admin:users:write` is the grant and it
 * is already in the registry, so granting it is an existing admin action
 * rather than a code change.
 *
 * ⚠ `rbac.isAdmin(uid)` is consulted FIRST and short-circuits, because the
 * registry returns an EMPTY permission list for the admin role by contract
 * (`IRbacProvider.getPermissions`: *"Admin role returns []"*). Checking only
 * the permission list would refuse every admin — the same inversion
 * `entry-access.ts` documents.
 *
 * @tag domain:account
 * @tag layer:action
 * @tag access:server-only
 */

import { getProviders } from "../../contracts/registry";
import { normalizeError } from "../../errors/normalize";
import { serverLogger } from "../../monitoring";

/**
 * The permission that grants reading and writing OTHER people's accounts.
 *
 * Named once. Already present in `PERMISSIONS` and held by the admin team
 * surfaces, so no registry change is needed to use it.
 */
export const ACCOUNT_MODERATE_PERMISSION = "admin:users:write";

/**
 * What a user may change about their OWN account.
 *
 * 🛑 Everything absent from this list is DROPPED from a self-edit — see the
 * allowlist rationale in the module header. Grouped by why each one is safe:
 *
 * - **Identity the user owns**: `displayName`, `photoURL`, `avatarMetadata`.
 *   ⚠ `displayName` feeds `nameTokensIndex` and `slug`; both are derived by
 *   the repository's write hooks, so they stay OFF this list and are never
 *   accepted from a request body.
 * - **Their own public profile and preferences**: opt-in visibility, bio,
 *   links, notification and UI preferences, banner dismissal.
 * - **Their own acknowledgements**: the scam-awareness confirmation.
 *
 * 🛑 Deliberately ABSENT, each for a stated reason:
 * - `email` / `phoneNumber` — changing a login identifier is a verification
 *   flow (Firebase Auth + re-verification), not a field write. Accepting them
 *   here would desynchronise Firestore from Auth and skip verification.
 * - `emailVerified` / `phoneVerified` — self-attested verification is no
 *   verification.
 * - every role, permission, ban and tester field — privilege.
 * - `pointsBalance` — money-shaped; `pointsRepository` owns it.
 * - `storeId` / `storeSlug` / `storeStatus` — the seller onboarding flow owns
 *   these, and self-setting `storeStatus` would approve one's own store.
 * - `slug` — public URL identity, derived from `displayName`.
 * - `seedPurpose` — a purge marker; `permanent` means *"a purge must NEVER
 *   remove this"*, so letting a user clear it makes their own record
 *   purgeable.
 */
export const USER_SELF_EDITABLE_FIELDS: readonly string[] = [
  "displayName",
  "photoURL",
  "avatarMetadata",
  "publicProfile",
  "notificationPreferences",
  "uiPreferences",
  "dismissedBannerHash",
  "scamAwarenessAcknowledgedAt",
];

/**
 * What a MODERATOR may change that a user may not.
 *
 * Narrow on purpose: the admin team UI has its own dedicated routes for bans,
 * role grants and points adjustments, each with their own audit trail. This
 * endpoint is the account editor, so a moderator gets the self-editable set
 * plus the moderation flags that genuinely belong to an account edit.
 *
 * 🛑 `roles` / `permissions` / `pointsBalance` are NOT here either. A role
 * grant must go through the route that writes an audit record for it — an
 * untracked privilege change is exactly what an audit trail exists to prevent.
 */
export const USER_MODERATOR_EDITABLE_FIELDS: readonly string[] = [
  ...USER_SELF_EDITABLE_FIELDS,
  "disabled",
  "isDisabled",
];

/** May this uid read or write accounts that are not theirs? */
export async function viewerCanModerateAccounts(
  uid: string | undefined | null,
): Promise<boolean> {
  if (!uid) return false;
  /*
   * `getProviders()` is INSIDE the try because it THROWS when no registry is
   * installed, which is the normal state of an RSC render (`withProviders`
   * wraps route handlers, not pages). `entry-access.ts` records the outage
   * that caused when it sat outside: signed OUT the page rendered, signed IN
   * the same page reported a degraded read.
   */
  try {
    const { rbac } = getProviders();
    if (!rbac) {
      serverLogger.warn("No RBAC provider: account moderation denied", { uid });
      return false;
    }
    if (await rbac.isAdmin(uid)) return true;
    const perms = await rbac.getPermissions(uid);
    return perms.includes(ACCOUNT_MODERATE_PERMISSION);
  } catch (error) {
    void normalizeError(error);
    serverLogger.warn("Account moderation check failed — denying", {
      uid,
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** What a viewer may do with ONE specific account. */
export interface AccountAccess {
  /** The viewer IS the account holder. */
  isSelf: boolean;
  /** The viewer holds `admin:users:write` (or is an admin). */
  canModerate: boolean;
  /** May read this account at all. */
  canRead: boolean;
  /** May write this account at all. */
  canWrite: boolean;
}

/**
 * Resolve a viewer's access to one account.
 *
 * 🛑 Fails CLOSED: an absent viewer uid is `false` on every axis, and a failed
 * permission read denies rather than admits.
 */
export async function resolveAccountAccess(
  viewerUid: string | undefined | null,
  targetUserId: string,
): Promise<AccountAccess> {
  const isSelf = !!viewerUid && viewerUid === targetUserId;
  /*
   * Resolved even when `isSelf` already grants access, because it also selects
   * the FIELD SET: an admin editing their own account gets the moderator
   * allowlist, not the self one.
   */
  const canModerate = await viewerCanModerateAccounts(viewerUid);
  return {
    isSelf,
    canModerate,
    canRead: isSelf || canModerate,
    canWrite: isSelf || canModerate,
  };
}

/** The outcome of filtering a request body through the allowlist. */
export interface PickedAccountFields {
  /** The fields that may be written. */
  patch: Record<string, unknown>;
  /** The keys that were dropped, so the response can SAY SO. */
  rejected: string[];
}

/**
 * Filter a request body down to the fields this viewer may write.
 *
 * 🛑 The rejected keys are RETURNED, not silently swallowed. A save that
 * reports success while dropping half the payload is the "looks configured,
 * does nothing" defect class this codebase keeps rediscovering — the caller
 * gets to see that `roles` was refused.
 */
export function pickEditableAccountFields(
  body: unknown,
  access: Pick<AccountAccess, "canModerate">,
): PickedAccountFields {
  const allowed = access.canModerate
    ? USER_MODERATOR_EDITABLE_FIELDS
    : USER_SELF_EDITABLE_FIELDS;
  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { patch, rejected };
  }

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    /*
     * 🛑 Reject DOTTED keys outright. Firestore resolves `a.b` as a PATH in an
     * update, so `{"publicProfile.isPublic": true}` would pass a naive
     * top-level allowlist check against "publicProfile" while writing a
     * nested field — and `{"roles.0": "admin"}` would escape the allowlist
     * entirely. This codebase has already been bitten by the inverse of this
     * rule (`surfaceCounts` wrote dotted keys through `.set()`, where they are
     * NOT paths, and the gate never fired).
     */
    if (key.includes(".")) {
      rejected.push(key);
      continue;
    }
    if (allowed.includes(key)) patch[key] = value;
    else rejected.push(key);
  }

  return { patch, rejected };
}
