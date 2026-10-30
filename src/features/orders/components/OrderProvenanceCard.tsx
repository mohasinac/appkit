"use client";

/**
 * OrderProvenanceCard — renders `OrderDocument.sourceContext`, the record of
 * HOW the buyer earned the right to buy at this price.
 *
 * ## Why this component had to be written
 *
 * `sourceContext` is a six-variant discriminated union, assembled at a real
 * cost — an auction pays one `findByProductSorted`, an offer one `findById` —
 * written on every order by both checkout paths, mapped through to the client
 * type by `orderDocumentToOrder` (adapters.ts:359) … and, until this file,
 * rendered in **zero** `.tsx` files anywhere in the repo.
 *
 * That is Root Cause #52/#57: the data was already present and complete, and
 * no surface was ever wired to present it. The buyer could not see what they
 * had agreed, the seller could not see what they had accepted, and support
 * could not see either.
 *
 * ## What it deliberately does NOT do
 *
 * **`standard` renders nothing.** Its only field is the list price, which the
 * order total already shows — a card reading "Standard purchase" on every
 * ordinary order is noise that would teach people to ignore the card on the
 * orders where it matters. It is still an explicit `case`, so the switch stays
 * exhaustive.
 *
 * **A saving is shown only where it is real.** Not every variant records a
 * displaced price: `auction-buy-now` has `listPrice`, `offer-accepted` has
 * `listPriceAtOffer`, and `auction-won` has only `startingBid` — which is a
 * floor, not an asking price, so presenting the gap as a discount would be a
 * fabrication. Where a displaced price exists it is shown only when it is
 * strictly greater than what was paid.
 *
 * **Nothing is fetched.** It is handed the context the page already loaded; a
 * component that fetched would fire one request per opened drawer per portal.
 */

import { Badge } from "../../../ui/components/Badge";
import { Card } from "../../../ui/components/Card";
import { DescriptionField } from "../../../ui/components/DescriptionField";
import { Heading, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { formatCurrency } from "../../../utils/number.formatter";
import { formatDate } from "../../../utils/date.formatter";
import type { OrderSourceContext } from "../schemas/firestore";

type Tone = "info" | "success" | "warning" | "primary";

interface ProvenanceRow {
  label: string;
  value: string;
}

interface ProvenanceContent {
  title: string;
  tone: Tone;
  /** Shown under the title when there is something worth saying in prose. */
  summary?: string;
  rows: ProvenanceRow[];
  /** Only ever set when a displaced price genuinely exceeded what was paid. */
  saved?: number;
}

/**
 * A date on a `sourceContext` survives a Firestore round trip as a Timestamp,
 * an ISO string or a Date depending on which path loaded it, so normalise
 * rather than assuming. An unparseable value renders an em-dash — never
 * `new Date()`, which would invent a timestamp for a record that has none
 * (the rule `OrderStatusTimeline` already follows).
 */
function dateText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const raw =
    typeof value === "object" && value !== null && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : (value as string | number | Date);
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isFinite(d.getTime()) ? formatDate(d) : "—";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function contentFor(ctx: OrderSourceContext, currency?: string): ProvenanceContent | null {
  const money = (n: number) => formatCurrency(n, currency);

  switch (ctx.path) {
    case "standard":
      // Deliberately silent — see the header. Explicit so the switch is exhaustive.
      return null;

    case "auction-won": {
      const rows: ProvenanceRow[] = [
        { label: "Winning bid", value: money(ctx.winningBidAmount) },
        { label: "Bids in the auction", value: String(ctx.bidCount) },
        { label: "Starting bid", value: money(ctx.startingBid) },
      ];
      if (ctx.runnerUpAmount !== undefined) {
        rows.push({ label: "Runner-up bid", value: money(ctx.runnerUpAmount) });
      }
      if (ctx.reservePrice !== undefined) {
        rows.push({
          label: "Reserve",
          value: `${money(ctx.reservePrice)} — ${ctx.reserveMet ? "met" : "not met"}`,
        });
      }
      rows.push({ label: "Auction ended", value: dateText(ctx.auctionEndedAt) });
      return {
        title: "Won at auction",
        tone: "success",
        summary:
          ctx.bidCount > 1
            ? `Highest of ${plural(ctx.bidCount, "bid", "bids")}.`
            : "The only bid placed.",
        rows,
      };
    }

    case "auction-buy-now": {
      const rows: ProvenanceRow[] = [
        { label: "Buy Now price", value: money(ctx.buyNowPrice) },
        { label: "List price", value: money(ctx.listPrice) },
        {
          label: "Standing bid beaten",
          value: ctx.standingBidAtBuyout > 0 ? money(ctx.standingBidAtBuyout) : "none",
        },
        { label: "Bids at buyout", value: String(ctx.bidCount) },
        { label: "Bought", value: dateText(ctx.boughtAt) },
      ];
      return {
        title: "Bought now, ending the auction",
        tone: "info",
        /*
         * A buyout IS a real bid (the schema's own note: recording bidCount 0
         * would bake a falsehood into an immutable record), so the summary
         * must not claim nobody had bid when somebody had.
         */
        summary:
          ctx.bidCount > 0
            ? `Taken at the Buy Now price while ${plural(ctx.bidCount, "bid was", "bids were")} live.`
            : "Taken at the Buy Now price before any bids were placed.",
        rows,
        saved: ctx.listPrice > ctx.buyNowPrice ? ctx.listPrice - ctx.buyNowPrice : undefined,
      };
    }

    case "offer-accepted": {
      const rows: ProvenanceRow[] = [
        { label: "Agreed price", value: money(ctx.offeredAmount) },
        { label: "Asking price when offered", value: money(ctx.listPriceAtOffer) },
      ];
      if (ctx.counterAmount !== undefined) {
        rows.push({ label: "Final counter", value: money(ctx.counterAmount) });
      }
      rows.push(
        { label: "Negotiation", value: plural(ctx.counterRounds, "round", "rounds") },
        { label: "Accepted", value: dateText(ctx.acceptedAt) },
      );
      return {
        title: "Price agreed by offer",
        tone: "primary",
        summary:
          ctx.counterRounds > 1
            ? `Agreed after ${plural(ctx.counterRounds, "round", "rounds")} of counter-offers.`
            : "Accepted outright, with no counter-offer.",
        rows,
        saved:
          ctx.listPriceAtOffer > ctx.offeredAmount
            ? ctx.listPriceAtOffer - ctx.offeredAmount
            : undefined,
      };
    }

    case "pre-order":
      return {
        title: "Pre-order",
        tone: "warning",
        summary:
          ctx.balanceDue > 0
            ? "A deposit was taken at checkout; the balance is due before dispatch."
            : "Paid in full at checkout.",
        rows: [
          { label: "Deposit paid", value: money(ctx.depositAmount) },
          { label: "Balance due", value: money(ctx.balanceDue) },
          { label: "Expected delivery", value: dateText(ctx.expectedDeliveryDate) },
        ],
      };

    case "random-lots":
      return {
        title: "Random lots entry",
        tone: "info",
        summary:
          ctx.revealMode === "instant"
            ? "The result was revealed immediately."
            : "The result is revealed at the scheduled draw.",
        rows: [
          { label: "Entries bought", value: plural(ctx.entryCount, "entry", "entries") },
          { label: "Price per entry", value: money(ctx.pricePerEntry) },
          { label: "Reveal", value: ctx.revealMode === "instant" ? "Instant" : "Scheduled" },
        ],
      };

    default: {
      /*
       * Exhaustive. A seventh variant — the shared-purchase path S5a still
       * needs — will not compile rather than silently rendering nothing, which
       * is the failure mode of `default: return null` and is precisely how this
       * union came to have six populated variants and no reader at all.
       */
      const unreachable: never = ctx;
      return unreachable;
    }
  }
}

export interface OrderProvenanceCardProps {
  sourceContext?: OrderSourceContext;
  /** Falls back to the configured default currency when omitted. */
  currency?: string;
  className?: string;
}

export function OrderProvenanceCard({
  sourceContext,
  currency,
  className,
}: OrderProvenanceCardProps) {
  // Every order written before W2 has no context at all — absence is normal
  // and is not an error state to announce.
  if (!sourceContext) return null;

  const content = contentFor(sourceContext, currency);
  if (!content) return null;

  return (
    <Card variant="outlined" padding="md" className={className}>
      <Stack gap="sm">
        <Row align="center" gap="sm" wrap>
          <Heading level={3} size="sm">
            {content.title}
          </Heading>
          {content.saved !== undefined ? (
            <Badge variant="success">{`Saved ${formatCurrency(content.saved, currency)}`}</Badge>
          ) : null}
        </Row>

        {content.summary ? (
          <Text size="sm" color="muted">
            {content.summary}
          </Text>
        ) : null}

        <Row as="dl" wrap gap="md">
          {content.rows.map((row) => (
            <DescriptionField key={row.label} label={row.label} value={row.value} />
          ))}
        </Row>
      </Stack>
    </Card>
  );
}
