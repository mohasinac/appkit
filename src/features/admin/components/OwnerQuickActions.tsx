"use client";

/**
 * Pencil / clone / bin, on a PUBLIC surface, for whoever owns the record.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 *
 * An admin or seller spots a problem on the page a visitor sees — a wrong
 * price, a typo, a bad photo — and today has to navigate to the dashboard,
 * find the list, search for the row and open it. This is the two-click path to
 * the editor from where the problem was noticed.
 *
 * ── Why it is a new component and not a slot on each card ─────────────────
 *
 * 🛑 Measured before building: ZERO public detail views render any owner-only
 * control, and the only precedent anywhere is `CouponCard`, which has had
 * `onEdit` / `onToggleActive` / `onDelete` props the whole time and whose two
 * public consumers pass NONE of them. So there was no pattern to follow and no
 * second implementation to reconcile — one component, used by every surface,
 * is what keeps the visibility rule and the confirm copy in one place.
 *
 * ── The visibility rule, and why it has three states ──────────────────────
 *
 * 🛑 Public pages are static or ISR (`products/[slug]` is `revalidate = 3600`
 * and reads no session), so `SessionProvider` mounts `initialUser={null}` and
 * `loading` starts TRUE on every hard load — for signed-in users too. A
 * two-state `!user → hide` gate therefore renders nothing, then pops the
 * toolbar in a few hundred milliseconds later, on every single page load.
 *
 * So: render NOTHING while `isAuthResolving`. Appearing late is invisible;
 * appearing with a flash is a bug people report. Same reasoning as
 * `useCanSeePrices`, which exists for the mirror-image problem.
 *
 * ── Who sees what ─────────────────────────────────────────────────────────
 *
 *   pencil + bin   the record's owner, or any admin
 *   clone          admins ONLY
 *
 * 🛑 Clone is gated on `useIsAdmin()`, NOT on the same check as the other two.
 * `useIsOwner` returns `true` for admins AND for the owner, so reusing it
 * would hand every seller a button that is meant to be a staff tool.
 *
 * @tag domain:admin
 * @tag layer:components
 * @tag access:client
 */

import { useCallback, useState } from "react";
import { useIsAdmin, useIsOwner } from "../../auth/hooks/useRBAC";
import { useOptionalSession } from "../../../react/contexts/SessionContext";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Row, useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/** Which registry bucket supplies the labels and the confirm copy. */
export type OwnerQuickActionsResource =
  | "PRODUCT"
  | "CATEGORY"
  | "BRAND"
  | "FRANCHISE"
  | "BUNDLE"
  | "GROUP"
  | "SUBLISTING"
  | "EVENT"
  | "BLOG"
  | "REVIEW"
  | "STORE"
  | "USER"
  | "CAROUSEL"
  | "SECTION";

/**
 * Which registry LEAF each resource reads, named explicitly.
 *
 * 🛑 This replaces `ACTIONS[resource].edit` / `.delete`, which assumed every
 * bucket spells its leaves exactly `edit` and `delete`. Eight buckets do and
 * BLOG does not — its leaves are `edit-post` and `delete-post` — so for blog
 * posts both lookups resolved `undefined` and the controls silently fell back
 * to the generic "Edit" / "Delete" / "Delete this record?" strings. The
 * registry was bypassed for that resource while looking wired, which is
 * exactly what Rule #7 exists to prevent.
 *
 * Several of the resources added here cannot use that convention at all:
 * carousel slides and homepage sections have no bucket of their own and live
 * under `ADMIN`. So the mapping has to be data, and being a
 * `Record<OwnerQuickActionsResource, …>` makes a new resource a COMPILE error
 * until someone names its leaves.
 */
interface ResourceLeaves {
  bucket: keyof typeof ACTIONS;
  edit: string;
  /**
   * The delete leaf. **Omitted means this resource exposes no bin at all**,
   * regardless of what the caller passes — see the three cases below.
   */
  remove?: string;
  duplicate?: string;
}

const RESOURCE_LEAVES: Record<OwnerQuickActionsResource, ResourceLeaves> = {
  PRODUCT: { bucket: "PRODUCT", edit: "edit", remove: "delete", duplicate: "duplicate" },
  CATEGORY: { bucket: "CATEGORY", edit: "edit", remove: "delete" },
  BRAND: { bucket: "BRAND", edit: "edit", remove: "delete" },
  BUNDLE: { bucket: "BUNDLE", edit: "edit", remove: "delete" },
  GROUP: { bucket: "GROUP", edit: "edit", remove: "delete" },
  SUBLISTING: { bucket: "SUBLISTING", edit: "edit", remove: "delete" },
  EVENT: { bucket: "EVENT", edit: "edit", remove: "delete", duplicate: "duplicate" },
  REVIEW: { bucket: "REVIEW", edit: "edit", remove: "delete" },

  /** 🛑 `edit-post` / `delete-post`, not `edit` / `delete`. See the note above. */
  BLOG: { bucket: "BLOG", edit: "edit-post", remove: "delete-post", duplicate: "duplicate-post" },

  /**
   * A franchise row IS a category (`categoryType: "franchise"`), so it reuses
   * the category leaves rather than duplicating copy that would drift.
   */
  FRANCHISE: { bucket: "CATEGORY", edit: "edit", remove: "delete" },

  /** Carousel slides have no bucket of their own; the leaves live under ADMIN. */
  CAROUSEL: { bucket: "ADMIN", edit: "edit-carousel", remove: "delete-carousel" },

  /*
   * ── The three PENCIL-ONLY resources ─────────────────────────────────────
   *
   * `remove` is omitted on purpose for all three. Each is a delete whose blast
   * radius is far larger than the page the bin would sit on, and a public
   * surface is the worst possible place to offer it:
   *
   * STORE   — deleting a store orphans its products, orders and payouts. The
   *           dashboard offers `suspend-store` / `verify-store`, which are the
   *           operations an admin actually wants from a store page.
   * USER    — deleting a user cascades across orders, reviews, bids and
   *           addresses. `ADMIN.ban-user` is the reversible tool, and it has
   *           its own flow with a reason.
   * SECTION — homepage section `order` is POSITIONAL, so removing one silently
   *           renumbers its neighbours. There is also no per-section public
   *           page; the pencil goes to the list that owns them.
   */
  STORE: { bucket: "ADMIN", edit: "manage-store" },
  USER: { bucket: "ADMIN", edit: "manage-user" },
  SECTION: { bucket: "ADMIN", edit: "edit-section" },
};

export interface OwnerQuickActionsProps {
  resource: OwnerQuickActionsResource;
  /** Where the pencil goes — that record's dashboard editor. */
  editHref: string;
  /** Called after the confirm is accepted. Must do the DELETE itself. */
  onDelete?: () => void | Promise<void>;
  /**
   * Admin-only clone. Omit entirely for resources with no duplicate endpoint —
   * categories, bundles, carousel slides and homepage sections all have
   * derived or positional state that a copy would carry wrongly, so the
   * absence is deliberate rather than unfinished.
   */
  onClone?: () => void | Promise<void>;
  /** Auth UID of the owner, when the record has one. Admins pass regardless. */
  ownerId?: string;
  /** Store SLUG for store-owned records — `SessionUser.storeId` is the slug. */
  storeId?: string;
  /** Names the thing in the confirm dialog: "Delete Dranzer S?" */
  recordLabel?: string;
  /**
   * `card` sits in a hero corner and uses a scrim so it reads on photography;
   * `detail` sits in a header row beside the title.
   */
  placement?: "card" | "detail";
  /**
   * 🛑 Set this whenever `placement="detail"` sits on a DARK cover hero.
   *
   * `detail` otherwise renders the `ghost` variant, which is
   * `color: var(--appkit-color-zinc-600)` — a dark grey that is correct on a
   * page-surface header row and invisible on a cover photo. Every detail view
   * that has a hero already computes a `hasCover` flag and flips each of its
   * siblings to `color="inverse"`; this toolbar was the one element in that
   * block that did not, so the pencil rendered near-black on near-black and
   * read as "admins get no edit button" (Root Cause #67 — a theme-relative ink
   * on a theme-invariant dark surface).
   *
   * Pass the SAME flag the rest of the hero branches on, not a literal `true`:
   * a coverless hero falls back to the page surface, where the scrim's white
   * ink would be invisible in the mirror-image way.
   */
  onMedia?: boolean;
  className?: string;
}

export function OwnerQuickActions({
  resource,
  editHref,
  onDelete,
  onClone,
  ownerId,
  storeId,
  recordLabel,
  placement = "card",
  onMedia = false,
  className = "",
}: OwnerQuickActionsProps) {
  const session = useOptionalSession();
  const isOwnerOrAdmin = useIsOwner(ownerId);
  const isAdmin = useIsAdmin();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const leaves = RESOURCE_LEAVES[resource];
  const bucket = ACTIONS[leaves.bucket] as Record<
    string,
    { label: string; ariaLabel?: string; confirmation?: { title: string; body: string; confirmLabel: string } }
  >;

  const handleConfirmedDelete = useCallback(async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } catch (err) {
      const normalized = normalizeError(err);
      /*
       * 🛑 A failed delete MUST say so. Without this the dialog simply closed
       * its spinner and the record was still there — and because the caller
       * navigates away on success, "nothing happened" is indistinguishable
       * from "it worked but the page did not move". This is a destructive
       * action on a public page; silence is the worst available answer.
       */
      showToast(
        toUserMessage((normalized as { code?: string }).code ?? "UNKNOWN"),
        "error",
      );
    } finally {
      // Always clears, so a failed delete leaves a usable dialog rather than a
      // permanently-spinning button the user cannot dismiss or retry.
      setDeleting(false);
    }
  }, [onDelete, showToast]);

  /*
   * 🛑 Nothing at all until auth resolves — see the header. `loading` starts
   * true on every hard load of a static page, so this is the common path on
   * first paint, not an edge case.
   */
  if (!session || session.loading) return null;

  /*
   * A store-owned record is also "mine" when I own that store.
   * `SessionUser.storeId` holds the store SLUG and `StoreDocument.storeId` is
   * the slug too, while `ownerId` is the Auth UID — two different id spaces,
   * so both have to be checked rather than one standing in for the other.
   */
  const ownsStore = Boolean(storeId && session.user?.storeId === storeId);

  /*
   * 🛑 `isAdmin` is its OWN term, not folded into `useIsOwner`.
   *
   * `useIsOwner` early-returns `false` when `resourceOwnerId` is falsy — BEFORE
   * it checks admin — so for a record with no owner at all it denies admins
   * too. Categories, brands, franchises, carousel slides and homepage sections
   * have no `ownerId`, and those are precisely the collections an admin needs
   * this toolbar on. Relying on `useIsOwner` alone would have hidden it from
   * the only person who can edit them.
   */
  if (!isAdmin && !isOwnerOrAdmin && !ownsStore) return null;

  const editDef = bucket[leaves.edit];
  const deleteDef = leaves.remove ? bucket[leaves.remove] : undefined;
  const confirmation = deleteDef?.confirmation;
  const showClone = Boolean(onClone) && isAdmin && Boolean(leaves.duplicate);
  /*
   * 🛑 `leaves.remove` gates the bin, not just `onDelete`. A resource whose
   * mapping omits a delete leaf (store, user, homepage section) must render no
   * bin even if a caller passes `onDelete` — the safety decision belongs to the
   * resource, not to each of its call sites, or the next call site re-opens it.
   */
  const showDelete = Boolean(onDelete) && Boolean(leaves.remove);

  /*
   * 🛑 The scrim is for ANY dark backdrop, not only a card.
   *
   * `detail` used to hard-map to `ghost` (`color: var(--appkit-color-zinc-600)`),
   * which is right on a page-surface header row and invisible on a cover photo
   * — and every detail view with a hero puts this toolbar inside that hero,
   * beside siblings it has already flipped to `color="inverse"`. The pencil
   * therefore rendered near-black on near-black and read as "admins get no
   * edit button at all". See `onMedia` above and Root Cause #67.
   */
  const onDark = placement === "card" || onMedia;
  const neutralVariant = onDark ? "scrim" : "ghost";
  /*
   * Danger ink is dropped on a dark backdrop for the same reason: `danger`
   * resolves to a theme-relative red that disappears against the hero. The bin
   * keeps its confirm dialog, which is where the destructive intent is
   * actually communicated — colour was never the safeguard.
   */
  const dangerVariant = onDark ? "scrim" : "danger";

  return (
    <>
      <Row
        gap="xs"
        align="center"
        className={className}
        /*
         * Stops the click reaching an ancestor `<Link>` or the card's own
         * `onClick`. Without it, pressing Edit on a card both navigates to the
         * editor AND opens the public detail page behind it.
         */
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <IconButton
          aria-label={editDef?.ariaLabel ?? editDef?.label ?? "Edit"}
          size="touch"
          variant={neutralVariant}
          icon={<Icon name="edit" />}
          onClick={() => {
            /*
             * `window.location`, not `next/link`. This component is rendered
             * inside cards whose whole body is already an anchor, and nesting
             * an `<a>` in an `<a>` is invalid HTML that browsers resolve by
             * closing the outer one early — which breaks the card's own
             * navigation, not just this button's.
             */
            if (typeof window !== "undefined") window.location.assign(editHref);
          }}
        />

        {showClone && (
          <IconButton
            aria-label={
              (leaves.duplicate ? bucket[leaves.duplicate]?.ariaLabel ?? bucket[leaves.duplicate]?.label : undefined) ||
              "Duplicate"
            }
            size="touch"
            variant={neutralVariant}
            icon={<Icon name="duplicate" />}
            onClick={() => void onClone?.()}
          />
        )}

        {showDelete && (
          <IconButton
            aria-label={deleteDef?.ariaLabel ?? deleteDef?.label ?? "Delete"}
            size="touch"
            variant={dangerVariant}
            icon={<Icon name="delete" />}
            onClick={() => setConfirmOpen(true)}
          />
        )}
      </Row>

      {/*
        `ConfirmDeleteModal`, not `<Button action={…}>`. The Button's own
        confirm is an inline portal built for a button that is already in the
        page; these controls live inside cards with `overflow-hidden` heroes
        and ancestor anchors, which is exactly where that portal's
        click-forwarding gets awkward. `CouponCard` — the one existing
        precedent for icon CRUD on a card — made the same choice.
      */}
      {showDelete && (
        <ConfirmDeleteModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmedDelete}
          isDeleting={deleting}
          title={confirmation?.title ?? "Delete this record?"}
          message={
            recordLabel && confirmation
              ? `${confirmation.body}\n\nDeleting: ${recordLabel}`
              : confirmation?.body
          }
          confirmText={confirmation?.confirmLabel ?? deleteDef?.label ?? "Delete"}
          variant="danger"
        />
      )}
    </>
  );
}
