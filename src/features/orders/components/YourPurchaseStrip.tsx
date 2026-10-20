"use client";

/**
 * "You ordered this — track it" and "your review — edit it", on a product page.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * A buyer looking at an item they already own had no link to their own order
 * and no link to their own review. Both records exist; nothing connected them
 * to the product page, so the route was: remember you bought it, go to
 * /user/orders, page through, find it.
 *
 * ── Three rules this component is built around ────────────────────────────
 *
 * 🛑 NO MONEY. An order total here would need the guest-price gate, and the
 * strip is signed-in-only by construction — omitting the amount removes the
 * question entirely rather than answering it carefully.
 *
 * 🛑 SAY THE WINDOW. The lookup is bounded to 90 days (see the route: order
 * `items[]` holds objects, so there is no index for "order containing this
 * product"). When nothing is found the copy is "No order in the last 90 days",
 * never "you haven't bought this". A filtered empty result reported as an
 * absolute zero is a lie the buyer cannot check — the same defect
 * `UserOrdersView` carries a long comment about.
 *
 * 🛑 RENDER NOTHING UNTIL RESOLVED. Public product pages are ISR and read no
 * session, so `loading` starts true on every hard load even for signed-in
 * users. Showing the signed-out state first would flash "no order" at someone
 * who has one.
 *
 * @tag domain:orders
 * @tag layer:components
 * @tag access:client
 */

import { useApiQuery } from "../../../client/api/useApiQuery";
import { apiClient } from "../../../http";
import { useOptionalSession } from "../../../react/contexts/SessionContext";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../next/routing/route-map";
import { Button, Div, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { Icon } from "../../../ui/components/Icon";
import { formatDate } from "../../../utils";

export interface PurchaseContext {
  order: {
    id: string;
    shortRef: string;
    status: string;
    orderDate: string | null;
    trackHref: string;
    detailHref: string;
  } | null;
  review: { id: string; rating: number; status: string } | null;
  windowDays: number;
}

export interface YourPurchaseStripProps {
  productId: string;
  /** Opens the review editor. Omit to render the review half as a link only. */
  onEditReview?: (reviewId: string) => void;
  onWriteReview?: () => void;
  className?: string;
}

export function YourPurchaseStrip({
  productId,
  onEditReview,
  onWriteReview,
  className = "",
}: YourPurchaseStripProps) {
  const session = useOptionalSession();
  const signedIn = Boolean(session?.user?.uid);

  const query = useApiQuery<PurchaseContext>({
    queryKey: ["user", "purchases", productId],
    queryFn: async () => {
      const res = await apiClient.get<{ data?: PurchaseContext }>(
        `/api/user/purchases/${encodeURIComponent(productId)}`,
      );
      return (
        res?.data ?? { order: null, review: null, windowDays: 90 }
      );
    },
    // Only ask once we know there is somebody to ask about.
    enabled: signedIn,
    staleTime: 60_000,
    silentBackgroundFailures: true,
  });

  /*
   * A guest, or auth not yet resolved, renders nothing at all. There is no
   * useful signed-out state here: "sign in to see your order" is noise on a
   * page whose primary job is selling the item.
   */
  if (!session || session.loading || !signedIn) return null;
  if (query.isLoading || !query.data) return null;

  const { order, review, windowDays } = query.data;

  // Nothing bought and nothing written — stay out of the way entirely.
  if (!order && !review) return null;

  return (
    <Div
      surface="muted"
      rounded="xl"
      padding="md"
      border="subtle"
      className={className}
    >
      <Stack gap="sm">
        {order ? (
          <Row align="center" justify="between" gap="sm" wrap>
            <Row align="center" gap="sm">
              <Icon name="order" size="sm" tone="muted" />
              <Text size="sm">
                You ordered this
                {order.orderDate ? ` on ${formatDate(order.orderDate)}` : ""} ·{" "}
                <Span className="font-mono">#{order.shortRef}</Span>
              </Text>
            </Row>
            <Row align="center" gap="sm">
              <Button asChild variant="outline" size="sm">
                <TextLink href={order.trackHref}>
                  {ACTIONS.USER["track-order"].label}
                </TextLink>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <TextLink href={order.detailHref}>
                  {ACTIONS.USER["view-order"].label}
                </TextLink>
              </Button>
            </Row>
          </Row>
        ) : (
          /*
           * 🛑 Bounded, and it says so. Not "you haven't bought this".
           */
          <Text size="sm" color="muted">
            No order for this item in the last {windowDays} days.{" "}
            <TextLink href={String(ROUTES.USER.ORDERS)}>See all your orders</TextLink>
          </Text>
        )}

        {review ? (
          <Row align="center" justify="between" gap="sm" wrap>
            <Row align="center" gap="sm">
              <Icon name="review" size="sm" tone="muted" filled />
              <Text size="sm">
                Your review: {review.rating}/5
                {/*
                  A pending review has not been published yet, and a reviewer
                  who is not told that reads the product page, does not see
                  their words, and reasonably concludes it was lost.
                */}
                {review.status !== "approved" ? ` · ${review.status}` : ""}
              </Text>
            </Row>
            {onEditReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditReview(review.id)}
              >
                {ACTIONS.REVIEW.edit.label}
              </Button>
            )}
          </Row>
        ) : (
          order &&
          onWriteReview && (
            <Row align="center" justify="between" gap="sm" wrap>
              <Text size="sm" color="muted">
                You have not reviewed this yet.
              </Text>
              <Button variant="outline" size="sm" onClick={onWriteReview}>
                {ACTIONS.REVIEW.write.label}
              </Button>
            </Row>
          )
        )}
      </Stack>
    </Div>
  );
}
