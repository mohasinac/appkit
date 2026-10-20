"use client";

/**
 * The product flavour of `OwnerQuickActions` — pencil, admin clone, bin.
 *
 * ## 🛑 Why this file exists at all
 *
 * `OwnerQuickActions` takes `onClone` / `onDelete` as FUNCTIONS, and
 * `ProductDetailPageView` is a Server Component. A function cannot cross that
 * boundary: React throws
 *
 *     Event handlers cannot be passed to Client Component props.
 *       {resource: "PRODUCT", …, onClone: function onClone, onDelete: …}
 *
 * at render, which took down EVERY `/products/[slug]` page in production with
 * an opaque React error — two digests, one per handler. It is not a schema
 * mismatch and no `<Suspense>` boundary affects it: Suspense governs when a
 * subtree may stream, serialization governs what may be sent, and a closure is
 * never sendable.
 *
 * So the closures have to be authored on the client side of the boundary. This
 * component is that side: the Server Component hands it strings, and it builds
 * the handlers here.
 *
 * ## 🛑 Why not just put `"use client"` on the detail view
 *
 * It renders the whole product page, pulls server-resolved data through a
 * dozen render props, and is the SEO surface for every listing. Marking it a
 * Client Component would drag all of that into the browser bundle to fix two
 * buttons. The boundary belongs at the smallest thing that needs it.
 *
 * ## 🛑 Why ids, not endpoint strings
 *
 * An earlier shape passed `cloneEndpoint` / `deleteEndpoint` as props. That is
 * one more pair of strings a caller can get wrong, and the clone's redirect
 * target depends on the id the endpoint RETURNS, which no caller can know in
 * advance. Taking the product id and deriving all three here keeps the
 * endpoints next to the code that reads their responses.
 *
 * @tag domain:products
 * @tag layer:components
 * @tag access:client
 */

import { useCallback } from "react";
import { OwnerQuickActions } from "../../admin/components/OwnerQuickActions";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

export interface ProductOwnerQuickActionsProps {
  /** The product's document id — what both endpoints are keyed on. */
  productId: string;
  /** Store SLUG. `SessionUser.storeId` holds the slug, not the Auth UID. */
  storeId?: string;
  /** Names the record in the delete confirmation. */
  recordLabel?: string;
  placement?: "card" | "detail";
  className?: string;
}

export function ProductOwnerQuickActions({
  productId,
  storeId,
  recordLabel,
  placement = "detail",
  className,
}: ProductOwnerQuickActionsProps) {
  const { showToast } = useToast();

  /*
   * Clone reuses POST /api/store/products/[id]/duplicate, which already strips
   * identity, analytics, bid state and group membership and forces
   * status: draft — hence no confirmation on it, and admin-only.
   */
  const handleClone = useCallback(async () => {
    /*
     * 🛑 Clone reports its own failures. `OwnerQuickActions` catches and toasts
     * for DELETE only — it invokes clone as `void onClone?.()`, so a rejection
     * here would be an unhandled promise and nothing at all would appear on
     * screen. The previous inline version was worse than silent: it did
     * `if (!res.ok) return`, so a refused clone looked exactly like a button
     * that does nothing, and the obvious response is to press it again.
     */
    try {
      const res = await fetch(SELLER_ENDPOINTS.PRODUCT_DUPLICATE(productId), {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        showToast(toUserMessage(body?.code ?? "UNKNOWN"), "error");
        return;
      }
      const json = (await res.json()) as { data?: { id?: string } };
      const newId = json?.data?.id;
      /*
       * Land on the COPY's editor. The endpoint returns the new draft's id
       * precisely so a one-click clone ends somewhere useful rather than back
       * on the public page, where a draft is invisible.
       */
      if (newId && typeof window !== "undefined") {
        window.location.assign(String(ROUTES.STORE.PRODUCTS_EDIT(newId)));
        return;
      }
      /*
       * A 2xx with no id is a successful call that cannot be acted on — the
       * copy may well exist, so saying "failed" would be wrong, and saying
       * nothing leaves the admin believing the click was ignored.
       */
      showToast("Copy created, but its editor could not be opened.", "info");
    } catch (err) {
      const normalized = normalizeError(err);
      showToast(toUserMessage((normalized as { code?: string }).code ?? "UNKNOWN"), "error");
    }
  }, [productId, showToast]);

  /*
   * 🛑 Throws on a failed DELETE rather than returning quietly.
   * `OwnerQuickActions.handleConfirmedDelete` catches and toasts — and because
   * success navigates away, a swallowed failure is indistinguishable from "it
   * worked but the page did not move". The previous inline version ignored
   * `res.ok` entirely and navigated regardless, so a refused delete sent the
   * owner to the product list as though it had succeeded.
   */
  const handleDelete = useCallback(async () => {
    const res = await fetch(SELLER_ENDPOINTS.PRODUCT_BY_ID(productId), {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      throw Object.assign(new Error("Delete failed"), { code: body?.code });
    }
    if (typeof window !== "undefined") {
      window.location.assign(String(ROUTES.PUBLIC.PRODUCTS));
    }
  }, [productId]);

  return (
    <OwnerQuickActions
      resource="PRODUCT"
      placement={placement}
      className={className}
      recordLabel={recordLabel}
      storeId={storeId}
      editHref={String(ROUTES.STORE.PRODUCTS_EDIT(productId))}
      onClone={handleClone}
      onDelete={handleDelete}
    />
  );
}
