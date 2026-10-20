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
  | "BUNDLE"
  | "GROUP"
  | "SUBLISTING"
  | "EVENT"
  | "BLOG"
  | "REVIEW";

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
  className = "",
}: OwnerQuickActionsProps) {
  const session = useOptionalSession();
  const isOwnerOrAdmin = useIsOwner(ownerId);
  const isAdmin = useIsAdmin();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bucket = ACTIONS[resource] as Record<
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

  const editDef = bucket.edit;
  const deleteDef = bucket.delete;
  const confirmation = deleteDef?.confirmation;
  const showClone = Boolean(onClone) && isAdmin;

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
          variant={placement === "card" ? "scrim" : "ghost"}
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
              (bucket.duplicate?.ariaLabel ?? bucket.duplicate?.label) ||
              "Duplicate"
            }
            size="touch"
            variant={placement === "card" ? "scrim" : "ghost"}
            icon={<Icon name="duplicate" />}
            onClick={() => void onClone?.()}
          />
        )}

        {onDelete && (
          <IconButton
            aria-label={deleteDef?.ariaLabel ?? deleteDef?.label ?? "Delete"}
            size="touch"
            variant={placement === "card" ? "scrim" : "danger"}
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
      {onDelete && (
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
