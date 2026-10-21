"use client";

/**
 * OrderCompletionPanel — rate the lines, then close the order.
 *
 * ## The owner's rule, and why this panel is the only way to use it
 *
 * *"points only get issued on successful purchases after buyer put reviews,
 * then only… they are also assigned if the user [raises] no issues or updates
 * after 7 days of delivery"*, and then: *"auto assigned after 7 days of
 * delivery, when order is marked complete; if review is given and order marked
 * complete by the buyer before — immediate disburse."*
 *
 * So completion has two writers converging on one fact (`completedAt`): the
 * 7-day `order-complete` obligation, and this. Both were built — the sweep,
 * the dispute cutoff, the per-item review link, `markOrderCompleteAction` — and
 * **the buyer had no UI for any of it.** A grep for `markOrderCompleteAction`
 * across the app returned two hits, both my own comments. This is the surface
 * that makes the rule usable rather than merely implemented.
 *
 * ## 🛑 ≥1 rated line, never all of them
 *
 * Requiring every line makes a six-item order's completion hostage to the one
 * item the buyer has no opinion about — and their alternative is to wait seven
 * days and be completed automatically with **no** review, which is worse for
 * everyone. One rating is the signal; demanding six is a toll. The server
 * enforces the same rule, so this is the affordance, not the gate.
 *
 * ## 🛑 The button says what it DOES, all four consequences
 *
 * Completing closes the dispute window, releases the seller's payout and
 * awards points. A buyer pressing "Mark complete" without being told that it
 * ends their ability to raise a new dispute would be waiving a right by
 * pressing a button labelled as housekeeping. `payout-release` is
 * `blockedBy: ["order-complete"]`, so the early release is a CONSEQUENCE of
 * this press rather than a second decision — which is precisely why it has to
 * be disclosed here.
 *
 * ## Per LINE, not per product (the Zomato shape)
 *
 * `orderItemId` is `${orderId}__${productId}__${n}`, so the same product
 * ordered twice is two ratings. `ReviewDocument` was already per-product; what
 * it lacked was any link to the ORDER — no `orderId` anywhere, and
 * `isVerifiedPurchase` was read in two places and written by nothing, so a
 * review had never been attributable to a purchase.
 *
 * EXPORTS: OrderCompletionPanel, type OrderCompletionPanelProps
 *
 * @tag domain:orders,reviews
 * @tag layer:component
 * @tag pattern:form
 * @tag access:client
 * @tag consumers:user/orders/[id]
 * @tag sideEffects:network
 */

import { useCallback, useEffect, useState } from "react";
import { Alert } from "../../../ui/components/Alert";
import { Button } from "../../../ui/components/Button";
/*
 * `Div` has its OWN module; `Row` and `Stack` are in `Layout`. Imported from
 * the defining modules rather than the `ui` barrel — Root Cause #18, and the
 * barrel is also what the build-weight work is unwinding.
 */
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Textarea } from "../../../ui/components/Textarea";
import { Skeleton } from "../../../ui/components/Skeleton";
import { normalizeError } from "../../../errors/normalize";

export interface RateableLine {
  orderItemId: string;
  productId: string;
  productTitle: string;
  existingRating?: number;
}

export interface OrderCompletionPanelProps {
  orderId: string;
  /** `/api/user/orders/{id}/completion`. Injected so appkit owns no route map. */
  endpoint: string;
  /** Already complete — the panel then only confirms it. */
  completedAt?: string | null;
  /** Who closed it: the buyer's uid, or `"system"` for the 7-day sweep. */
  completedBy?: string | null;
  /** Delivered? Nothing can be rated or completed before the parcel arrives. */
  isDelivered: boolean;
  /**
   * Anything contested — an open return, refund or dispute.
   *
   * The server refuses in that case regardless; this suppresses the panel so
   * the buyer is not offered a button that would be refused, and is told why.
   */
  isContested?: boolean;
  /** Called after a successful completion, so the page can refresh the order. */
  onCompleted?: () => void;
}

const MIN_COMMENT = 10;

/**
 * Stars as buttons.
 *
 * 🛑 `aria-label` per star and `aria-pressed` on the selected one — a row of
 * five unlabelled glyphs is unusable with a screen reader, and the rating is
 * the only required field here. Colour is never the sole signal: the selected
 * star is filled AND pressed.
 */
function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <Row gap="xs" role="group" aria-label="Rating out of 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          variant={n <= value ? "primary" : "outline"}
          size="sm"
          disabled={disabled}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          aria-pressed={n === value}
          onClick={() => onChange(n)}
        >
          {/*
            🛑 `<Icon>`, not "★"/"☆". A text character cannot be sized — no
            width or height utility reaches it, so it renders at the platform
            font fallback inside a 36px-min control. That is Root Cause #80
            exactly, and `audit-icon-sizing` caught this very line; it was
            written with glyphs and the audit is why it is not still.
            `filled` is what distinguishes a scored star from an empty one, so
            the single registry glyph serves both states.
          */}
          <Icon name="review" filled={n <= value} />
        </Button>
      ))}
    </Row>
  );
}

export function OrderCompletionPanel({
  orderId,
  endpoint,
  completedAt,
  completedBy,
  isDelivered,
  isContested,
  onCompleted,
}: OrderCompletionPanelProps) {
  const [lines, setLines] = useState<RateableLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetch(endpoint)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        /*
         * 🛑 The status is checked BEFORE the body is trusted. `errorResponse()`
         * is valid JSON with a non-2xx status, so `body?.data?.items ?? []`
         * would turn "the request failed" into "nothing to rate" — and this
         * panel would then hide itself, which is the most convincing possible
         * way to lose a feature.
         */
        if (!r.ok) throw new Error(body?.error ?? `Could not load this order (${r.status})`);
        return (body?.data?.items ?? []) as RateableLine[];
      })
      .then(setLines)
      .catch((err) => setLoadError(normalizeError(err).message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    if (!completedAt && isDelivered && !isContested) load();
    else setLoading(false);
  }, [completedAt, isDelivered, isContested, load]);

  // ── Already complete: confirm it and say which path closed it ────────────
  if (completedAt) {
    const bySystem = completedBy === "system";
    return (
      <Div surface="card" padding="md">
        <Stack gap="xs">
          <Text size="sm" weight="semibold" color="primary">
            This order is complete
          </Text>
          <Text size="xs" color="muted">
            {bySystem
              ? `Completed automatically on ${new Date(completedAt).toLocaleDateString()}, seven days after delivery with nothing raised against it.`
              : `You marked this complete on ${new Date(completedAt).toLocaleDateString()}.`}{" "}
            The dispute window for it has closed.
          </Text>
        </Stack>
      </Div>
    );
  }

  if (!isDelivered) return null;

  if (isContested) {
    return (
      <Div surface="card" padding="md">
        <Stack gap="xs">
          <Text size="sm" weight="semibold" color="primary">
            Rating is paused on this order
          </Text>
          <Text size="xs" color="muted">
            There is an open return, refund or dispute. Once that is resolved you
            can rate what you bought and close the order.
          </Text>
        </Stack>
      </Div>
    );
  }

  const ratedCount = lines.filter((l) => l.existingRating != null).length;
  const canComplete = ratedCount > 0;

  const submitRating = async (orderItemId: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate", orderItemId, rating, comment }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `That rating was not saved (${res.status})`);
      }
      setOpenLine(null);
      setRating(0);
      setComment("");
      load();
    } catch (err) {
      setActionError(normalizeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `The order was not completed (${res.status})`);
      }
      onCompleted?.();
    } catch (err) {
      setActionError(normalizeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Div surface="card" padding="md">
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" weight="semibold" color="primary">
            Rate what you bought
          </Text>
          <Text size="xs" color="muted">
            Rate each item separately. One rating is enough to close the order —
            or leave it and we will close it automatically seven days after
            delivery.
          </Text>
        </Stack>

        {actionError ? (
          <Alert variant="error" title="That did not save">
            {actionError}
          </Alert>
        ) : null}

        {loading ? (
          <Stack gap="sm">
            <Skeleton variant="rectangular" height="48px" />
            <Skeleton variant="rectangular" height="48px" />
          </Stack>
        ) : loadError ? (
          <Alert variant="error" title="Couldn't load the items">
            {loadError} Refresh to retry.
          </Alert>
        ) : lines.length === 0 ? (
          <Text size="xs" color="muted">
            There is nothing on this order to rate.
          </Text>
        ) : (
          <Stack gap="sm">
            {lines.map((line) => (
              <Div key={line.orderItemId} border="default" rounded="default" padding="sm">
                <Row justify="between" align="start" gap="sm" wrap>
                  <Text size="sm" className="flex-1 line-clamp-2" color="primary">
                    {line.productTitle}
                  </Text>
                  {line.existingRating != null ? (
                    <Text size="xs" color="success">
                      {"★".repeat(line.existingRating)} rated
                    </Text>
                  ) : openLine === line.orderItemId ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpenLine(line.orderItemId);
                        setRating(0);
                        setComment("");
                      }}
                    >
                      Rate this
                    </Button>
                  )}
                </Row>

                {openLine === line.orderItemId ? (
                  <Stack gap="sm" className="mt-2">
                    <StarRow value={rating} onChange={setRating} disabled={busy} />
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="What was it like? The next buyer reads this."
                    />
                    <Row gap="sm">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={busy}
                        /*
                         * Mirrors the route's own floor. A one-word review is
                         * indistinguishable from an empty box to the next
                         * buyer, which is why the server has the same minimum
                         * rather than this being a UI preference.
                         */
                        disabled={busy || rating === 0 || comment.trim().length < MIN_COMMENT}
                        onClick={() => submitRating(line.orderItemId)}
                      >
                        Save rating
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setOpenLine(null)}
                      >
                        Cancel
                      </Button>
                    </Row>
                  </Stack>
                ) : null}
              </Div>
            ))}
          </Stack>
        )}

        {/*
          🛑 All four consequences, before the press. Completing closes the
          dispute window, and a buyer who was not told that would be waiving a
          right by pressing a button that reads as housekeeping.
        */}
        <Div border="subtle" className="border-t" padding="t-sm">
          <Stack gap="sm">
            <Text size="xs" color="muted">
              Marking this complete confirms you are happy with it. It closes the
              window for raising a new dispute on this order, releases the
              seller&rsquo;s payment, and credits your points.
            </Text>
            <Row gap="sm" align="center" wrap>
              <Button
                variant="primary"
                size="sm"
                isLoading={busy}
                disabled={busy || !canComplete}
                onClick={complete}
              >
                Mark complete
              </Button>
              {!canComplete ? (
                <Text size="xs" color="muted">
                  Rate at least one item first.
                </Text>
              ) : null}
            </Row>
          </Stack>
        </Div>
      </Stack>
    </Div>
  );
}
