/**
 * WHICH DOMAIN OWNS THIS MEDIA, AND MAY THIS ACTOR WRITE IT — the one owner of
 * that question.
 *
 * ## 🛑 Why this exists
 *
 * Owner, 2026-11-11: *"only the media subdomain and its api can be used"* to
 * write media, with per-subdomain separation — and, on how to design it,
 * *"does the work i am doing own everything?"*. Ownership is the primitive;
 * a staff permission is only the override for acting on something you do NOT
 * own. That is already the shape of `features/events/actions/entry-access.ts`,
 * and this is the same shape for media.
 *
 * ## 🛑 WHAT THE `context` CAN AND CANNOT TELL US — measured, 2026-11-11
 *
 * `POST /api/media/sign` is `auth: true` and takes a caller-supplied
 * `MediaFilenameContext`. Its own comment says the object is *"left as an
 * unvalidated object on purpose"*, and `applyMediaContextGuards` validates
 * SHAPE only — mime, index caps, filename.
 *
 * The decisive measurement: that context is **filename-shaping data, not a
 * target reference**. `event-entry-image` carries `{ title, index, ext }` —
 * no event id and no entry id. `blog-cover` carries `{ title, category }` —
 * no post id. So "does this actor own the target?" **cannot be answered from
 * the context** for most types, however much one would like it to be.
 *
 * What IS answerable, and what this module therefore does:
 *
 * 1. **The owning DOMAIN**, from `context.type` — a closed set this codebase
 *    defines, so it is not meaningfully attacker-controlled. Claiming a
 *    different type changes where your OWN bytes land, never whether you reach
 *    someone else's. This is what the `media/{owner}/…` prefix must derive
 *    from, and deriving it from a claimed id instead is how a user would write
 *    into another tenant's prefix.
 * 2. **Real ownership where the context genuinely carries an identity** —
 *    `store-logo` / `store-banner` name a store, so the store is loaded and its
 *    `ownerId` compared to the caller. That closes the one case that is both
 *    checkable today and currently wide open.
 *
 * ⚠ **STILL OPEN, and deliberately not papered over**: for the remaining
 * contexts a signed-in user can claim a filename belonging to another
 * seller's product or another author's post. The bytes are still namespaced
 * under `tmp/<uid>/`, so this is a filename/impersonation problem rather than
 * an access one — but closing it needs the context to carry target IDs, which
 * is a schema change across every call site. Recorded rather than pretended
 * away; see the plan.
 *
 * @tag domain:media
 * @tag layer:action
 * @tag access:server-only
 */

import { getProviders } from "../../contracts/registry";
import { normalizeError } from "../../errors/normalize";
import { serverLogger } from "../../monitoring";

/** The deployments that own media. A closed set — the prefix comes from here. */
export type MediaOwnerDomain = "shop" | "events" | "blogs" | "auth";

/** The platform default when a context names nothing more specific. */
export const DEFAULT_MEDIA_OWNER: MediaOwnerDomain = "shop";

/**
 * `context.type` → the domain that owns the bytes, and the permission that
 * lets staff act on someone else's target.
 *
 * 🛑 **A TABLE, so the next listing type, subdomain or staff grant is a ROW.**
 * Adding a context means adding a line here, not a branch in a route. Anything
 * absent falls back to `shop` + `admin:media:write`, which is the conservative
 * direction: an unrecognised context never silently claims another domain's
 * prefix.
 */
const MEDIA_CONTEXT_POLICY: Readonly<
  Record<string, { domain: MediaOwnerDomain; override: string }>
> = {
  // ── the shop's catalogue — owned by the seller who owns the store ────────
  "product-image": { domain: "shop", override: "admin:products:write" },
  "product-video": { domain: "shop", override: "admin:products:write" },
  "collectordrop-image": { domain: "shop", override: "admin:products:write" },
  "preorder-image": { domain: "shop", override: "admin:products:write" },
  "store-logo": { domain: "shop", override: "admin:stores:write" },
  "store-banner": { domain: "shop", override: "admin:stores:write" },
  // Catalogue taxonomy is staff-owned — no personal owner exists.
  "brand-logo": { domain: "shop", override: "admin:products:write" },
  "brand-banner": { domain: "shop", override: "admin:products:write" },
  "category-image": { domain: "shop", override: "admin:products:write" },
  // A review belongs to the buyer who wrote it.
  "review-image": { domain: "shop", override: "admin:products:write" },
  "review-video": { domain: "shop", override: "admin:products:write" },

  // ── blogs ───────────────────────────────────────────────────────────────
  "blog-image": { domain: "blogs", override: "admin:blog:write" },
  "blog-cover": { domain: "blogs", override: "admin:blog:write" },
  "blog-content-image": { domain: "blogs", override: "admin:blog:write" },
  "blog-additional-image": { domain: "blogs", override: "admin:blog:write" },

  // ── events: the EVENT is staff-owned, an ENTRY is the entrant's ──────────
  "event-image": { domain: "events", override: "admin:events:write" },
  "event-cover": { domain: "events", override: "admin:events:write" },
  "event-winner-image": { domain: "events", override: "admin:events:write" },
  "event-additional-image": { domain: "events", override: "admin:events:write" },
  "event-entry-image": { domain: "events", override: "admin:event-entries:write" },
  "event-entry-video": { domain: "events", override: "admin:event-entries:write" },
};

/** The domain that owns a context's bytes. Unknown → the conservative default. */
export function mediaOwnerForContextType(type: string): MediaOwnerDomain {
  return MEDIA_CONTEXT_POLICY[type]?.domain ?? DEFAULT_MEDIA_OWNER;
}

/** The staff permission that overrides ownership for a context. */
export function mediaOverridePermissionForContextType(type: string): string {
  return MEDIA_CONTEXT_POLICY[type]?.override ?? "admin:media:write";
}

/**
 * Does this uid hold the staff override for this context?
 *
 * ⚠ `rbac.isAdmin(uid)` is consulted FIRST and short-circuits, because the
 * registry returns an EMPTY permission list for the admin role by contract
 * (`IRbacProvider.getPermissions`: *"Admin role returns []"*). Checking only
 * the permission list would therefore refuse every admin — the exact inversion
 * `entry-access.ts` documents.
 *
 * 🛑 Fails CLOSED. An absent uid, an unconfigured RBAC provider and a failed
 * permission read all return `false`: every one is a state in which we cannot
 * prove the caller is staff, and the recoverable direction is refusing staff,
 * never admitting a stranger to someone else's content.
 */
export async function viewerHoldsMediaOverride(
  uid: string | undefined | null,
  contextType: string,
): Promise<boolean> {
  if (!uid) return false;
  /*
   * Inside the try because `getProviders()` THROWS when no registry is
   * installed — the normal state of an RSC render, as `entry-access.ts`
   * records after it took the signed-in entries gallery down.
   */
  try {
    const { rbac } = getProviders();
    if (!rbac) {
      serverLogger.warn("No RBAC provider: media override denied", { uid });
      return false;
    }
    if (await rbac.isAdmin(uid)) return true;
    const perms = await rbac.getPermissions(uid);
    return perms.includes(mediaOverridePermissionForContextType(contextType));
  } catch (error) {
    void normalizeError(error);
    serverLogger.warn("Media override check failed — denying", {
      uid,
      contextType,
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** What an actor may do with media for one context. */
export interface MediaContextAccess {
  /** Which deployment's prefix these bytes belong under. */
  owner: MediaOwnerDomain;
  /**
   * The caller demonstrably owns the named target.
   *
   * ⚠ Only ever `true` for contexts that CARRY an identity we can check —
   * today that is the store contexts. For the rest it is `false` because the
   * question is unanswerable, NOT because the caller failed it, which is why
   * `mayWrite` does not require it.
   */
  isOwner: boolean;
  /** The caller holds the staff override for this context. */
  canModerate: boolean;
  /** The caller may stage/attach media in this context. */
  mayWrite: boolean;
  /** Set when a checkable ownership claim was REFUSED — the caller named someone else's target. */
  refusedReason?: string;
}

/**
 * Resolve an actor's access for one media context.
 *
 * The contract, stated so it cannot drift:
 * - **Any authenticated caller may contribute.** An entrant submitting contest
 *   photos, a buyer attaching a review image and a seller adding a product
 *   shot all hold ZERO admin permissions, and must. Requiring a permission
 *   here is what would make the contest unenterable — the `entryMedia` defect,
 *   one layer out.
 * - **A checkable ownership claim that FAILS is refused**, even for an
 *   authenticated caller. That is the cross-seller hole: today anyone signed
 *   in can sign an upload claiming `{ type: "store-logo", store: "<not
 *   theirs>" }`.
 * - **Staff override** lets a moderator act on a target they do not own.
 */
export async function resolveMediaContextAccess(args: {
  viewerUid: string | undefined | null;
  contextType: string;
  /** `context.store` for the store contexts — the only checkable identity today. */
  storeSlug?: string | undefined;
}): Promise<MediaContextAccess> {
  const { viewerUid, contextType, storeSlug } = args;
  const owner = mediaOwnerForContextType(contextType);
  const canModerate = await viewerHoldsMediaOverride(viewerUid, contextType);

  if (!viewerUid) {
    return { owner, isOwner: false, canModerate: false, mayWrite: false };
  }

  const claimsAStore =
    (contextType === "store-logo" || contextType === "store-banner") &&
    typeof storeSlug === "string" &&
    storeSlug.length > 0;

  if (!claimsAStore) {
    /*
     * No checkable identity in this context — see the module header. An
     * authenticated caller may contribute; the owning ROUTE still decides
     * whether the resulting media may be attached to a given document, which
     * is where the target is actually known.
     */
    return { owner, isOwner: false, canModerate, mayWrite: true };
  }

  try {
    const { db } = getProviders();
    const store = db
      ? await db
          .getRepository<{ ownerId?: string; storeSlug?: string }>("stores")
          .findById(storeSlug as string)
      : null;
    const ownerId = store?.ownerId;
    const isOwner = Boolean(ownerId && ownerId === viewerUid);
    if (isOwner || canModerate) {
      return { owner, isOwner, canModerate, mayWrite: true };
    }
    /*
     * 🛑 The store exists and is someone else's — refuse. A missing store is
     * ALSO refused: an unresolvable claim is not a proven one, and admitting
     * it would let a caller name a store that does not exist yet and seed a
     * filename for it.
     */
    return {
      owner,
      isOwner: false,
      canModerate,
      mayWrite: false,
      refusedReason: ownerId
        ? "store is owned by another account"
        : "store could not be resolved",
    };
  } catch (error) {
    void normalizeError(error);
    serverLogger.warn("Media store-ownership check failed — denying", {
      uid: viewerUid,
      storeSlug,
      reason: error instanceof Error ? error.message : String(error),
    });
    return {
      owner,
      isOwner: false,
      canModerate,
      mayWrite: canModerate,
      refusedReason: "ownership could not be verified",
    };
  }
}
