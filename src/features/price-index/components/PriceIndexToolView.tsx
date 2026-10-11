"use client";

import React, { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp } from "lucide-react";
import { Container, Div, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import { Badge } from "../../../ui/components/Badge";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { MediaImage } from "../../media/MediaImage";
import { TOOL_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http/ApiClient";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/**
 * The realised-price lookup — a SEARCH tool, not a list.
 *
 * ## Why search-first
 *
 * The question people have is always about one thing: *what does Dragoon G go
 * for?* A browsable list of every leaf answers that by making the reader scan,
 * and it degrades as the taxonomy grows toward ~330 nodes. So the empty state
 * is a search box with an explanation, and rows arrive only for a query.
 *
 * ## 🛑 Three numbers, none of them "the price"
 *
 * `min` / `median` / `mean` / `max` are all shown and all labelled, because
 * they disagree in a way that is information. Nine ₹900 sales and one ₹9,000
 * grail give a median of ₹900 and a mean of ₹1,710 — a reader told only the
 * mean concludes the item costs ₹1,710, and a seller told only the median
 * prices a mint example like a loose one. Picking one and calling it "average"
 * is the error this layout exists to avoid.
 *
 * `lastSold` is given its own line because it is the most decision-relevant
 * figure and the one a band hides entirely.
 *
 * ## 🛑 Below the confidence threshold, NO headline number
 *
 * A median of two sales is a coin flip presented as data. The server computes
 * `confident` so the threshold cannot drift between the job, the projection and
 * this view, and a non-confident band renders its sample size and a plain
 * sentence instead of figures.
 *
 * ## 🛑 Prices here are PUBLIC, against the standing guest gate
 *
 * § "Guest price gating" hides prices from signed-out visitors. This page does
 * not, deliberately: the gate protects live ASKS, which can be scraped into a
 * catalogue valuation, and a day-stale aggregate of completed sales is a
 * different object. No individual listing price, seller or buyer appears here.
 */

export interface PriceIndexConditionRow {
  condition: string;
  min: number;
  median: number;
  mean: number;
  max: number;
  sampleSize: number;
  confident: boolean;
  lastSold?: { amount: number; at: string };
}

export interface PriceIndexBandRow {
  listingType: string;
  min: number;
  median: number;
  mean: number;
  max: number;
  sampleSize: number;
  confident: boolean;
  lastSold?: { amount: number; at: string; via?: string };
  byCondition?: PriceIndexConditionRow[];
}

export interface PriceIndexResultRow {
  categoryId: string;
  name: string;
  slug: string;
  path?: string;
  coverImage?: string;
  bands?: PriceIndexBandRow[];
  windowDays?: number;
  computedAt?: string;
}

export interface PriceIndexToolResponse {
  query: string;
  results: PriceIndexResultRow[];
  truncated: boolean;
  minConfidentSamples: number;
}

/** Human labels. Falls back to the raw value so a new condition still renders. */
const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  used: "Used",
  refurbished: "Refurbished",
  broken: "Broken",
  graded: "Graded",
};

const LISTING_TYPE_LABEL: Record<string, string> = {
  standard: "Standard sale",
  auction: "Auction",
  "pre-order": "Pre-order",
  "prize-draw": "Prize draw",
  classified: "Classified",
  "digital-code": "Digital code",
  live: "Live item",
  art: "Art print",
  stickers: "Sticker sheet",
};

/*
 * Overflow classes via a local map, matching NavbarLayout's `__O` — the audit
 * blocks a raw `overflow-*` on an appkit primitive, and this is the shape the
 * codebase already uses for the cases where the primitive has no variant.
 */
const __O = {
  xAuto: "overflow-x-auto",
  hidden: "overflow-hidden",
} as const;

const money = (v: number) => formatCurrency(v, "INR");

function relativeDay(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** One figure with its label. Four of these, never one called "the price". */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="none" className="min-w-0">
      <Text size="xs" color="muted" transform="uppercase" className="tracking-wide">
        {label}
      </Text>
      {/* audit-guest-price-ok: the realised-price index is public by decision —
          see this file's header and the module docstring on searchPriceIndex.
          A completed-sale aggregate is not a live ask. */}
      <Text size="lg" weight="semibold" numeric className="tabular-nums">
        {value}
      </Text>
    </Stack>
  );
}

function LowConfidence({ sampleSize, threshold }: { sampleSize: number; threshold: number }) {
  return (
    <Text size="sm" color="muted">
      Only {sampleSize} {sampleSize === 1 ? "sale" : "sales"} recorded — not
      enough to publish a figure yet. We show a price once there are{" "}
      {threshold}.
    </Text>
  );
}

function ConditionTable({
  rows,
  threshold,
}: {
  rows: PriceIndexConditionRow[];
  threshold: number;
}) {
  return (
    <Stack gap="xs" className="min-w-0">
      <Text size="xs" color="muted" weight="semibold" transform="uppercase" className="tracking-wide">
        By condition
      </Text>
      {/* Scrolls inside its own container rather than widening the page. */}
      <Div className={__O.xAuto}>
        <Stack gap="xs" className="min-w-[22rem]">
          {rows.map((c) => (
            <Row
              key={c.condition}
              align="center"
              justify="between"
              gap="sm"
              padding="xs"
              rounded="md"
              surface="muted"
              className="min-w-0"
            >
              <Row gap="sm" align="center" className="min-w-0">
                <Badge variant="secondary">{CONDITION_LABEL[c.condition] ?? c.condition}</Badge>
                <Text size="xs" color="muted">
                  {c.sampleSize} {c.sampleSize === 1 ? "sale" : "sales"}
                </Text>
              </Row>
              {c.confident ? (
                <Row gap="md" align="center" className="min-w-0">
                  {/* audit-guest-price-ok: public realised-price index — see the file header. */}
                  <Text size="sm" className="tabular-nums whitespace-nowrap">
                    {money(c.min)} – {money(c.max)}
                  </Text>
                  <Text size="sm" weight="semibold" className="tabular-nums whitespace-nowrap">
                    {money(c.median)}
                  </Text>
                </Row>
              ) : (
                <Text size="xs" color="muted">
                  not enough data yet
                </Text>
              )}
            </Row>
          ))}
        </Stack>
      </Div>
      <Text size="xs" color="muted">
        Range and median per condition. A condition with fewer than {threshold}{" "}
        sales shows its count only.
      </Text>
    </Stack>
  );
}

function BandCard({ band, threshold }: { band: PriceIndexBandRow; threshold: number }) {
  return (
    <Stack gap="sm" padding="sm" rounded="lg" border="default" className="min-w-0">
      <Row align="center" justify="between" gap="sm" className="min-w-0">
        <Badge variant="primary">
          {LISTING_TYPE_LABEL[band.listingType] ?? band.listingType}
        </Badge>
        <Text size="xs" color="muted">
          {band.sampleSize} {band.sampleSize === 1 ? "sale" : "sales"}
        </Text>
      </Row>

      {band.confident ? (
        <>
          {/*
            🛑 All four, each labelled. "Average" is ambiguous — median and mean
            answer different questions — so both are shown rather than one of
            them being promoted to "the" average.
          */}
          <Row gap="lg" wrap className="min-w-0">
            <Figure label="Lowest" value={money(band.min)} />
            <Figure label="Median" value={money(band.median)} />
            <Figure label="Average" value={money(band.mean)} />
            <Figure label="Highest" value={money(band.max)} />
          </Row>
          {band.lastSold && (
            <Text size="sm" color="muted">
              Most recent sale{" "}
              {/* audit-guest-price-ok: public realised-price index — see the file header. */}
              <Span weight="semibold" className="tabular-nums">
                {money(band.lastSold.amount)}
              </Span>
              {relativeDay(band.lastSold.at) ? ` · ${relativeDay(band.lastSold.at)}` : ""}
              {band.lastSold.via && band.lastSold.via !== "standard"
                ? ` · via ${band.lastSold.via}`
                : ""}
            </Text>
          )}
        </>
      ) : (
        <LowConfidence sampleSize={band.sampleSize} threshold={threshold} />
      )}

      {band.byCondition && band.byCondition.length > 0 && (
        <ConditionTable rows={band.byCondition} threshold={threshold} />
      )}
    </Stack>
  );
}

function ResultCard({ row, threshold }: { row: PriceIndexResultRow; threshold: number }) {
  return (
    <Stack gap="md" padding="card" rounded="lg" surface="card" border="subtle" className="min-w-0">
      <Row gap="md" align="start" className="min-w-0">
        {row.coverImage && (
          <Div rounded="lg" className={`w-16 h-16 flex-shrink-0 ${__O.hidden}`}>
            <MediaImage src={row.coverImage} alt={row.name} size="thumbnail" />
          </Div>
        )}
        <Stack gap="none" className="flex-1 min-w-0">
          <Heading level={3}>{row.name}</Heading>
          {row.path && (
            <Text size="xs" color="muted" className="min-w-0 break-words">
              {row.path}
            </Text>
          )}
        </Stack>
      </Row>

      {row.bands && row.bands.length > 0 ? (
        <>
          <Stack gap="sm" className="min-w-0">
            {row.bands.map((b) => (
              <BandCard key={b.listingType} band={b} threshold={threshold} />
            ))}
          </Stack>
          {/*
            🛑 "As of" is not decoration. The index is computed once a day and
            is deliberately a day stale, so a reader who is not told that will
            read it as live and conclude it is wrong the moment a sale they know
            about is missing.
          */}
          <Text size="xs" color="muted">
            Completed sales on LetItRip
            {row.windowDays ? ` over the last ${row.windowDays} days` : ""}
            {row.computedAt ? ` · as of ${new Date(row.computedAt).toLocaleDateString("en-IN")}` : ""}
          </Text>
        </>
      ) : (
        /*
         * 🛑 "No sales recorded yet" — never ₹0, and never a blank card. The
         * absence of a band means nothing has sold here, which is a fact about
         * our marketplace and not a failure of the lookup.
         */
        <Text size="sm" color="muted">
          No completed sales recorded here yet. Prices appear once something
          sells on LetItRip.
        </Text>
      )}
    </Stack>
  );
}

export interface PriceIndexToolViewProps {
  /** Seeded from `?q=` so a shared link reproduces the lookup. */
  initialQuery?: string;
  initialData?: PriceIndexToolResponse | null;
}

export function PriceIndexToolView({ initialQuery = "", initialData = null }: PriceIndexToolViewProps) {
  const [draft, setDraft] = useState(initialQuery);
  /**
   * The SUBMITTED term, distinct from `draft`.
   *
   * 🛑 Two pieces of state, not one, and that is the whole reason the lookup is
   * a `useQuery`. Keying the query on `draft` would fire a request per
   * keystroke against a route that holds a Firestore query plus a multi-get —
   * which is Root Cause #94's recurring server bill, and `audit-client-poll-cost`
   * exists because of it. The query key only moves when somebody submits.
   */
  const [term, setTerm] = useState(initialQuery.trim());

  /*
   * `useQuery` + `apiClient`, not a hand-rolled `fetch` with its own loading
   * and error state — which is what this had, and what `audit-form-mutation-hook`
   * correctly rejected. It also deletes three `useState`s: React Query already
   * owns in-flight, error and the response, and it dedupes the identical lookup
   * rather than issuing it twice.
   */
  const query = useQuery({
    queryKey: ["tool", "price-index", term],
    queryFn: () => apiClient.get<PriceIndexToolResponse>(TOOL_ENDPOINTS.PRICE_INDEX_SEARCH(term)),
    enabled: term.length >= 2,
    /*
     * The endpoint is edge-cached for an hour over a day-stale aggregate, so
     * refetching on focus or remount would spend invocations to learn nothing.
     */
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    ...(initialData && initialData.query === initialQuery.trim()
      ? { initialData }
      : {}),
  });

  const run = useCallback((q: string) => setTerm(q.trim()), []);

  const data = query.data ?? null;
  const loading = query.isFetching;
  /*
   * 🛑 Reported, not swallowed into an empty result. A failed lookup that
   * renders the same "nothing found" state as a successful empty one is the
   * single most misleading thing this page could do — the reader concludes the
   * item has never sold.
   */
  const error = query.isError
    ? toUserMessage(normalizeError(query.error).code, undefined, {
        fallback: "Could not look that up just now.",
      })
    : null;

  const threshold = data?.minConfidentSamples ?? 3;
  const hasQuery = (data?.query ?? "").length > 0;

  return (
    <Section padding="y-lg">
      <Container size="lg">
        <Stack gap="lg" className="min-w-0">
          <Stack gap="xs" className="min-w-0">
            <Row gap="sm" align="center">
              <TrendingUp className="w-5 h-5 text-primary-600" aria-hidden="true" />
              <Heading level={1}>What it sold for</Heading>
            </Row>
            <Text color="muted">
              Search any model, part or set to see what it actually sold for on
              LetItRip — the range, the median, the average and the most recent
              sale, broken down by condition.
            </Text>
          </Stack>

          <Form onSubmit={(e) => e.preventDefault()}>
            {() => (
              <Row gap="sm" align="end" wrap className="min-w-0">
                <Div className="flex-1 min-w-[16rem]">
                  <FieldInput
                    name="q"
                    label="Search"
                    value={draft}
                    onChange={setDraft}
                    placeholder="e.g. Dragoon G, Storm Pegasus, rubber flat…"
                  />
                </Div>
                <Button type="submit" isLoading={loading} onClick={() => run(draft)}>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Look up
                </Button>
              </Row>
            )}
          </Form>

          {error && (
            <Text size="sm" color="error" role="alert">
              {error}
            </Text>
          )}

          {!hasQuery && !loading && !error && (
            <Stack gap="xs" padding="card" rounded="lg" surface="muted" className="min-w-0">
              <Text weight="semibold">Why these prices are different</Text>
              <Text size="sm" color="muted">
                Everything here is a completed sale on LetItRip — not an asking
                price, and not a guess. We publish a figure only once{" "}
                {threshold} or more sales support it, and the index is
                recomputed once a day, so it is deliberately a day behind.
              </Text>
            </Stack>
          )}

          {hasQuery && data && data.results.length === 0 && !loading && (
            <Text color="muted">
              Nothing matched “{data.query}”. Try a shorter term, or the model
              name on its own.
            </Text>
          )}

          {data && data.results.length > 0 && (
            <Stack gap="md" className="min-w-0">
              {data.results.map((row) => (
                <ResultCard key={row.categoryId} row={row} threshold={threshold} />
              ))}
              {data.truncated && (
                <Text size="sm" color="muted">
                  Showing the closest {data.results.length} matches. Narrow the
                  search to see others.
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
