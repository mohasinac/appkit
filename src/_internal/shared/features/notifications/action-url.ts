/**
 * Where does a notification LAND?
 *
 * ## The problem this solves
 *
 * `actionUrl` was set by **5 of 40** `sendNotification()` call sites, so the
 * other 35 arrived in the bell as text with nothing to click. Every writer
 * that did set one hand-wrote the path, which is the same drift the ROUTES
 * map exists to prevent.
 *
 * Worse, the destination is **role-dependent**: an offer notification sent to
 * the buyer belongs at `/user/offers`, the same event sent to the seller at
 * `/store/offers`, and an admin escalation at `/admin/offers`. A per-writer
 * literal cannot express that, so writers that guessed a single path sent
 * half their recipients somewhere they have no permission to be.
 *
 * ## Honest fallbacks, not invented pages
 *
 * `bid`, `offer` and `review` still have **no per-record page in any role** —
 * W8 fixed those dead-end listings with a detail MODAL, not a route. So this
 * resolver points them at the list the record lives in. That is a real,
 * permitted, useful destination; fabricating `/user/bids/{id}` would produce
 * a 404 and `audit-nav-page-wiring` would (correctly) fail on the ROUTES key.
 *
 * When those pages are built, change the entry here and all 40 call sites
 * follow. That is the whole point of the indirection.
 */

import { ROUTES } from "../../../../next/routing/route-map";
import type { NotificationRelatedType } from "../../../../features/admin/schemas/firestore";

/**
 * Which portal the recipient reads this in.
 *
 * Deliberately NOT the `role` string off the session: a seller is also a
 * buyer, and which portal a notification belongs to is a property of the
 * EVENT, not of the person. The order-shipped notification goes to the buyer
 * in `/user`, and the same shipment's payout notification goes to the same
 * human in `/store`.
 */
export type NotificationAudience = "buyer" | "seller" | "admin";

/**
 * Resolve the page a notification should open.
 *
 * Returns `undefined` when there is genuinely nowhere to go — a `promotion`
 * or a `welcome` has no record behind it — so the caller renders a plain,
 * non-clickable row rather than a link to the dashboard the user is already
 * looking at.
 */
export function resolveNotificationActionUrl(
  relatedType: NotificationRelatedType | undefined,
  relatedId: string | undefined,
  audience: NotificationAudience,
): string | undefined {
  if (!relatedType || !relatedId) return undefined;

  switch (relatedType) {
    case "order":
      return audience === "admin"
        ? String(ROUTES.ADMIN.ORDER_DETAIL(relatedId))
        : audience === "seller"
          ? String(ROUTES.STORE.ORDER_DETAIL(relatedId))
          : String(ROUTES.USER.ORDER_DETAIL(relatedId));

    case "product":
      // The public listing page — the one destination that is the same for
      // everyone, because a product page is public.
      return String(ROUTES.PUBLIC.PRODUCT_DETAIL(relatedId));

    // ── List-level, because no per-record page exists in ANY role ─────────
    // W8 gave these listings a detail modal rather than a route. Linking the
    // list is honest; a fabricated `/…/{id}` would 404.
    case "bid":
      return audience === "admin"
        ? String(ROUTES.ADMIN.BIDS)
        : audience === "seller"
          ? String(ROUTES.STORE.BIDS)
          : String(ROUTES.USER.BIDS);

    case "offer":
      return audience === "admin"
        ? String(ROUTES.ADMIN.OFFERS)
        : audience === "seller"
          ? String(ROUTES.STORE.OFFERS)
          : String(ROUTES.USER.OFFERS);

    case "review":
      // The public review page exists; the admin/seller sides are modals.
      return String(ROUTES.PUBLIC.REVIEW_DETAIL(relatedId));

    case "blog":
      return String(ROUTES.BLOG.ARTICLE(relatedId));

    case "user":
      // Only an admin has a per-user page. A user notified ABOUT themselves
      // (a ban, a role change) belongs on their own account hub, not on a
      // page they cannot open.
      return audience === "admin"
        ? String(ROUTES.ADMIN.USER_DETAIL(relatedId))
        : String(ROUTES.USER.PROFILE);

    case "support_ticket":
      return audience === "admin"
        ? String(ROUTES.ADMIN.SUPPORT_TICKET_BY_ID(relatedId))
        : String(ROUTES.USER.SUPPORT_TICKET(relatedId));

    case "scammer":
      // Admin-only surface — the public scam registry is browsed, not
      // notified about.
      return audience === "admin" ? String(ROUTES.ADMIN.SCAMMER_BY_ID(relatedId)) : undefined;

    case "catalogueItem":
      // The owner edits it; an admin reviews it from the approvals queue,
      // which is a list because approval is a queue-shaped job.
      return audience === "admin"
        ? String(ROUTES.ADMIN.CATALOGUE_APPROVALS)
        : String(ROUTES.USER.CATALOGUE_EDIT(relatedId));

    case "payout":
      return audience === "admin"
        ? String(ROUTES.ADMIN.PAYOUT_DETAIL(relatedId))
        : String(ROUTES.STORE.PAYOUT_DETAIL(relatedId));

    case "store":
      return audience === "admin"
        ? String(ROUTES.ADMIN.STORE_DETAIL(relatedId))
        : String(ROUTES.STORE.DASHBOARD);

    default: {
      /*
       * Exhaustiveness. A new `relatedType` cannot compile without an answer
       * to "where does this land", which is precisely the check that was
       * missing when `catalogueItem` was smuggled in behind an `as never`.
       */
      const _exhaustive: never = relatedType;
      void _exhaustive;
      return undefined;
    }
  }
}
