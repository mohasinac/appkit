"use client";

/**
 * The client half of `OwnerQuickActions` for every admin-owned collection.
 *
 * ## 🛑 Why a wrapper is REQUIRED, not a convenience
 *
 * `OwnerQuickActions` takes `onDelete` / `onClone` as FUNCTIONS, and every
 * detail view that renders it (`CategoryDetailPageView`, `BrandDetailPageView`,
 * `BundleDetailView`, …) is a Server Component. A closure cannot cross that
 * boundary — React throws
 *
 *     Event handlers cannot be passed to Client Component props.
 *
 * at render. `ProductOwnerQuickActions` records that this exact mistake took
 * down every `/products/[slug]` page in production, with an opaque digest per
 * handler.
 *
 * That is why ten detail views were passing `editHref` and nothing else: the
 * bin and the clone are rendered behind `{showDelete && …}` / `{showClone && …}`,
 * so with no handler they silently do not exist. It read as "admins get no
 * delete button", and the cause was a serialization boundary, not a permission.
 *
 * ## 🛑 Why ONE wrapper and not one per resource
 *
 * `ProductOwnerQuickActions` is resource-specific because products are the one
 * collection a SELLER can also own, so its endpoints live under
 * `SELLER_ENDPOINTS` and its clone has a bespoke redirect to the copy's editor.
 * Everything here is admin-owned and differs only by three strings, so eight
 * near-identical files would trip the Duplication Framework's Rule of Three
 * immediately. One table, one component.
 *
 * ## Why the redirect lands on the ADMIN list
 *
 * You deleted the record from its own public page, so that page is now a 404 —
 * staying is not an option and the public index tells you nothing about whether
 * the delete worked. The admin list is where the absence is verifiable.
 * `ProductOwnerQuickActions` differs deliberately: a seller may delete a
 * product and has no admin list to land on.
 *
 * @tag domain:admin
 * @tag layer:components
 * @tag access:client
 */

import { useCallback } from "react";
import { OwnerQuickActions } from "./OwnerQuickActions";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";

/**
 * The admin-owned resources this wrapper can delete.
 *
 * 🛑 Deliberately NOT every `OwnerQuickActionsResource`. `STORE`, `USER` and
 * `SECTION` omit a `remove` leaf in `RESOURCE_LEAVES` because their blast
 * radius is far wider than the page a bin would sit on, and `REVIEW` has no
 * admin edit route to send the pencil to. Adding one here without adding its
 * leaf there still renders no bin — the resource owns that decision, which is
 * the point of gating it in two places.
 */
export type RecordQuickActionResource =
  | "CATEGORY"
  | "BRAND"
  | "BUNDLE"
  | "GROUP"
  | "EVENT"
  | "BLOG"
  | "FRANCHISE"
  | "SUBLISTING";

interface ResourceWiring {
  /** DELETE target. */
  endpoint: (id: string) => string;
  /** Where the pencil goes. */
  editHref: (id: string) => string;
  /** Where to land once the record is gone. */
  afterDelete: string;
}

const WIRING: Record<RecordQuickActionResource, ResourceWiring> = {
  CATEGORY: {
    endpoint: ADMIN_ENDPOINTS.CATEGORY_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.CATEGORIES_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.CATEGORIES),
  },
  BRAND: {
    endpoint: ADMIN_ENDPOINTS.BRAND_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.BRANDS_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.BRANDS),
  },
  BUNDLE: {
    endpoint: ADMIN_ENDPOINTS.BUNDLE_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.BUNDLES_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.BUNDLES),
  },
  GROUP: {
    endpoint: ADMIN_ENDPOINTS.GROUPED_LISTING_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.GROUPED_LISTINGS_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.GROUPED_LISTINGS),
  },
  EVENT: {
    endpoint: ADMIN_ENDPOINTS.EVENT_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.EVENTS_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.EVENTS),
  },
  BLOG: {
    endpoint: ADMIN_ENDPOINTS.BLOG_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.BLOG_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.BLOG),
  },
  /*
   * A franchise row IS a category (`categoryType: "franchise"`), so it shares
   * the category endpoint and editor — the same reasoning `RESOURCE_LEAVES`
   * uses to give it the category copy. Only the landing page differs.
   */
  FRANCHISE: {
    endpoint: ADMIN_ENDPOINTS.CATEGORY_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.CATEGORIES_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.CATEGORIES),
  },
  SUBLISTING: {
    endpoint: ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID,
    editHref: (id) => String(ROUTES.ADMIN.SUBLISTING_CATEGORIES_EDIT(id)),
    afterDelete: String(ROUTES.ADMIN.SUBLISTING_CATEGORIES),
  },
};

export interface RecordOwnerQuickActionsProps {
  resource: RecordQuickActionResource;
  /** The record's document id — what the endpoint and the editor are keyed on. */
  recordId: string;
  /** Names the record in the delete confirmation. */
  recordLabel?: string;
  /**
   * Forwarded to `OwnerQuickActions` so a store-owned record (a grouped
   * listing, a store-authored bundle) stays visible to the seller who owns it
   * and not only to an admin. `SessionUser.storeId` holds the store SLUG, not
   * the Auth UID — two different id spaces, hence two props.
   */
  ownerId?: string;
  storeId?: string;
  placement?: "card" | "detail";
  /** Pass the hero's own `hasCover` flag. See `OwnerQuickActions.onMedia`. */
  onMedia?: boolean;
  className?: string;
}

export function RecordOwnerQuickActions({
  resource,
  recordId,
  recordLabel,
  ownerId,
  storeId,
  placement = "detail",
  onMedia,
  className,
}: RecordOwnerQuickActionsProps) {
  const wiring = WIRING[resource];

  /*
   * 🛑 THROWS on a failed DELETE rather than returning quietly.
   *
   * `OwnerQuickActions.handleConfirmedDelete` catches and toasts, and success
   * navigates away — so a swallowed failure is indistinguishable from "it
   * worked but the page did not move", and the obvious user response is to
   * press the button again. Returning early on `!res.ok` is the bug
   * `ProductOwnerQuickActions` documents having had.
   */
  const handleDelete = useCallback(async () => {
    const res = await fetch(wiring.endpoint(recordId), { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      throw Object.assign(new Error("Delete failed"), { code: body?.code });
    }
    if (typeof window !== "undefined") {
      window.location.assign(wiring.afterDelete);
    }
  }, [wiring, recordId]);

  return (
    <OwnerQuickActions
      resource={resource}
      placement={placement}
      onMedia={onMedia}
      className={className}
      recordLabel={recordLabel}
      ownerId={ownerId}
      storeId={storeId}
      editHref={wiring.editHref(recordId)}
      onDelete={handleDelete}
    />
  );
}
