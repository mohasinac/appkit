"use client";

import React, { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp } from "lucide-react";
import { Container, Row, Stack } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { Badge } from "../../../ui/components/Badge";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { PaginatedSelect, type PaginatedSelectOption } from "../../../ui/components/PaginatedSelect";
import { TextLink } from "../../../ui/components/TextLink";
import { MediaImage } from "../../media/MediaImage";
import { TOOL_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http/ApiClient";
import { useSiteSearch } from "../../search/hooks/useSiteSearch";
import { useSearchIndex } from "../../search/hooks/useSearchIndex";
import { searchIndex } from "../../../_internal/shared/search/match";
import { useOptionalSession } from "../../../react/contexts/SessionContext";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { PRICE_LOOKUP_INDEX_TYPES, priceLookupTargetFor } from "../lookup-target";

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

/**
 * The asking-price band for one leaf. Mirrors `PriceIndexMarketRow`.
 *
 * Every field but `median`, `categoryId` and `origin` is optional, because the
 * two kinds of row carry genuinely different evidence and an absent figure
 * must render as absent. See `price-bands.md`: "a band with `n=2` is not
 * evidence".
 *
 * 🛑 `origin` decides what the card is ALLOWED to claim, and the two cases are
 * not cosmetic variants of each other:
 *
 *   `computed`  a mode over dated sightings of THIS leaf. May be called "most
 *               common" and, when `basedOnRecent`, "last 6 months".
 *   `seeded`    the 2026-10 crawl's median for an entire GENERATION, frozen at
 *               one date. May be called neither.
 */
export interface PriceIndexMarketRowView {
  categoryId: string;
  origin: "computed" | "seeded";
  median: number;
  p25?: number;
  p75?: number;
  sampleSize?: number;
  asOf?: string;
  soldOutShare?: number;
  source?: string;
  /** `computed` only — the price sightings cluster on. */
  mode?: number;
  modeCount?: number;
  low?: number;
  high?: number;
  /** `false` ⇒ the figures are all-time, not the last six months. */
  basedOnRecent?: boolean;
  windowDays?: number;
  lastSeenAt?: string;
  inherited: boolean;
  viaCategoryId?: string;
  viaName?: string;
  taxBasis: string;
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

/**
 * How many options the dropdown offers.
 *
 * Larger than `PRICE_INDEX_SEARCH_LIMIT`'s 8 because this is a PICK list rather
 * than a result set — the cost of an extra row is a line of text, not a
 * Firestore document, so the bound that matters is what a person will read.
 */
const DROPDOWN_LIMIT = 20;

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

/**
 * One figure with its label. Four of these, never one called "the price".
 *
 * `dim` renders the figure at body size in muted ink. It is how a GENERATION
 * band is demoted below a per-model one — the numbers stay readable, because a
 * ballpark is better than nothing, but they stop looking like a measurement of
 * the thing the card is headed by.
 */
function Figure({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <Stack gap="none" className="min-w-0">
      <Text size="xs" color="muted" transform="uppercase" className="tracking-wide">
        {label}
      </Text>
      {/* audit-guest-price-ok: the realised-price index is public by decision —
          see this file's header and the module docstring on searchPriceIndex.
          A completed-sale aggregate is not a live ask. */}
      <Text
        size={dim ? "base" : "lg"}
        weight={dim ? "medium" : "semibold"}
        {...(dim ? { color: "muted" as const } : {})}
        numeric
        className="tabular-nums"
      >
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

/**
 * The competitor-crawl band: what this thing is typically ASKED for.
 *
 * ## 🛑 Side by side with the sold band, never averaged with it
 *
 * `price-bands.md` states the rule this component exists to honour: "They are
 * rendered side by side and never averaged. The gap between them is the most
 * useful thing we can tell a seller." An ask and a sale are different events,
 * and a blended figure would be a statistic describing neither.
 *
 * ## 🛑 "Sold out" is not "sold"
 *
 * 76–93% of the crawled catalogues are sold out, and a sold-out row proves the
 * item is GONE, not that it changed hands at that price. So `soldOutShare` is
 * rendered as prose rather than dropped — without it, a reader takes the median
 * for a clearing price, which is the single wrong conclusion this data invites.
 *
 * ## 🛑 An inherited band says whose band it is
 *
 * `MARKET_BANDS` is keyed on era and part-group leaves, never on the ~216
 * named-model leaves — the crawl measured a generation, not a bey. So a model
 * lookup resolves its era's band, and the card must attribute it: "typical for
 * Burst DB" is true, "typical for Rage Longinus" is not.
 */
function MarketCard({ market }: { market: PriceIndexMarketRowView }) {
  const soldOutPct =
    market.soldOutShare === undefined ? null : Math.round(market.soldOutShare * 100);

  /*
   * 🛑 A SEEDED band is a generation median and a COMPUTED one is a mode over
   * dated sightings of this exact leaf. They are rendered differently because
   * they support different claims, not because one looks nicer — the single
   * worst thing this card could do is print a generation's figure in the
   * typography of a per-model measurement, which is what it used to do and is
   * why Dragoon MS and Strata Dragoon MS read as the same bey.
   */
  const isComputed = market.origin === "computed";

  if (isComputed) return <ComputedMarketCard market={market} />;

  const hasRange = market.p25 !== undefined && market.p75 !== undefined;

  return (
    <Stack gap="sm" padding="sm" rounded="lg" border="subtle" surface="muted" className="min-w-0">
      <Row align="center" justify="between" gap="sm" wrap className="min-w-0">
        {/*
          🛑 "Generation estimate", not "Typical asking price". The old label
          described the figure's TYPE and said nothing about its SCOPE, so a
          reader took a Hard Metal System median for a Dragoon MS price. The
          badge now leads with the limitation.
        */}
        <Badge variant="secondary">
          {market.inherited ? "Generation estimate" : "Typical asking price"}
        </Badge>
        {/*
          🛑 Absent `sampleSize` renders as nothing at all. The Beyblade-top
          table carries no per-leaf n, and printing "0 listings" or inventing a
          figure to fill the row is exactly what the research doc forbids.
        */}
        {market.sampleSize !== undefined && (
          <Text size="xs" color="muted">
            {market.sampleSize} {market.sampleSize === 1 ? "listing" : "listings"}
          </Text>
        )}
      </Row>

      {/*
        🛑 The caveat goes ABOVE the numbers for an inherited band. Below them
        it was read after the figures had already landed, which is too late —
        the reader has the number by then and the sentence reads as a footnote
        rather than as a correction.
      */}
      {market.inherited && (
        <Text size="sm" color="muted">
          We have no figure for this exact item. These are typical asks for{" "}
          <Span weight="semibold">{market.viaName ?? market.viaCategoryId}</Span> as a
          whole, so every item in that generation shows the same range.
        </Text>
      )}

      <Row gap="lg" wrap className="min-w-0">
        {hasRange && (
          <Figure label="Usual low" value={money(market.p25 as number)} dim={market.inherited} />
        )}
        <Figure label="Typical ask" value={money(market.median)} dim={market.inherited} />
        {hasRange && (
          <Figure label="Usual high" value={money(market.p75 as number)} dim={market.inherited} />
        )}
      </Row>

      {soldOutPct !== null && (
        <Text size="sm" color="muted">
          These are asking prices from other shops, and about {soldOutPct}% of
          listings at this level are sold out — so an ask is not proof anything
          changed hands at it.
        </Text>
      )}

      {/*
        🛑 NO COMPETITOR NAME. It is not stored either (see MARKET_BANDS' own
        header) — stripping it here alone would leave it in the database, one
        careless spread away from publication, which is Root Cause #70 exactly.
        The METHODOLOGY still prints, because "pooled across all Burst parts" is
        what stops a pooled band being read as a per-leaf measurement.
      */}
      <Text size="xs" color="muted" className="min-w-0 break-words">
        Aggregated from Indian shop listings
        {market.source ? ` · ${market.source}` : ""} · tax-inclusive
        {market.asOf
          ? ` · measured ${new Date(market.asOf).toLocaleDateString("en-IN")}`
          : ""}
      </Text>
    </Stack>
  );
}

/**
 * The per-leaf band computed from dated sightings.
 *
 * ## 🛑 The headline is the MODE, and it is labelled as one
 *
 * "Most commonly listed at" is a different claim from "typical ask" and the
 * card has to make the right one. A median answers "what is the middle of this
 * list"; a mode answers "what do people actually charge", and on a collectible
 * those diverge — six sightings at ₹6,500 and three clearance ones at ₹3,000
 * have a median that moves to ₹3,000 the moment two more cheap ones appear,
 * while the going rate has not moved at all.
 *
 * ## 🛑 Where there is no mode, the label CHANGES
 *
 * `mode` is absent when no price bucket held two or more sightings — every
 * observed price was different, so there is no cluster. The card then shows the
 * median under "Typical ask". Printing a lone sighting under "most common"
 * would dress one data point as a consensus.
 *
 * ## 🛑 `basedOnRecent` decides the low/high label, and it must
 *
 * False means the six-month window held too little to stand alone, so the
 * figures are all-time. A card that says "last 6 months" over a two-year-old
 * sighting is indistinguishable from an accurate one once printed — which is
 * the whole reason the flag travels with the band instead of being inferred.
 */
function ComputedMarketCard({ market }: { market: PriceIndexMarketRowView }) {
  const recent = market.basedOnRecent === true;
  const rangeLabel = recent ? "last 6 months" : "all time";
  const hasRange = market.low !== undefined && market.high !== undefined;

  return (
    <Stack gap="sm" padding="sm" rounded="lg" border="default" className="min-w-0">
      <Row align="center" justify="between" gap="sm" wrap className="min-w-0">
        <Badge variant="primary">
          {recent ? "Going rate · last 6 months" : "Going rate · all time"}
        </Badge>
        {market.sampleSize !== undefined && (
          <Text size="xs" color="muted">
            {market.sampleSize} {market.sampleSize === 1 ? "sighting" : "sightings"}
          </Text>
        )}
      </Row>

      <Row gap="lg" wrap className="min-w-0">
        {hasRange && (
          <Figure label={`Lowest · ${rangeLabel}`} value={money(market.low as number)} />
        )}
        {market.mode !== undefined ? (
          <Figure label="Most commonly listed at" value={money(market.mode)} />
        ) : (
          <Figure label="Typical ask" value={money(market.median)} />
        )}
        {hasRange && (
          <Figure label={`Highest · ${rangeLabel}`} value={money(market.high as number)} />
        )}
      </Row>

      {market.mode !== undefined && market.modeCount !== undefined && (
        <Text size="sm" color="muted">
          {market.modeCount} of {market.sampleSize} sightings were around this
          price — it is the figure this item is listed at most often, not the
          middle of the range.
        </Text>
      )}

      {/*
        🛑 Said out loud when the window could not carry the band. Silence here
        reads as "these are current", and the reader has no other way to tell.

        🛑 It reports HOW OLD the newest sighting is, NOT `windowDays`. Those
        are different quantities and the first draft printed the wrong one: a
        set of sightings from 400–500 days ago has a SPAN of 100 days, so it
        rendered "about 3 months" over data more than a year stale — which
        reads as recent and is the exact misreading this whole branch exists to
        prevent. The span of the evidence says nothing about its age.
      */}
      {!recent && (
        <Text size="sm" color="muted">
          Too few sightings in the last six months to stand on their own, so
          these cover everything we have recorded
          {market.lastSeenAt && relativeDay(market.lastSeenAt)
            ? ` — the newest is from ${relativeDay(market.lastSeenAt)}`
            : ""}
          .
        </Text>
      )}

      <Text size="xs" color="muted" className="min-w-0 break-words">
        Asking prices from Indian shops and listings · tax-inclusive
        {market.lastSeenAt
          ? ` · most recent sighting ${relativeDay(market.lastSeenAt) || new Date(market.lastSeenAt).toLocaleDateString("en-IN")}`
          : ""}
      </Text>
    </Stack>
  );
}

/**
 * What a signed-out visitor sees where the market band would be.
 *
 * 🛑 This is NOT the guest price gate. The sold band above it is public by
 * decision (see this file's header). The market band is withheld for a
 * different reason, already settled at
 * `categories/api/[id]/price-guidance/route.ts`: it is competitor-derived, and
 * publishing it on an unauthenticated, cacheable surface is the "neighbouring
 * surface publishes the range" leak. The copy therefore says what is behind
 * sign-in and why it is worth having, rather than implying no data exists.
 */
function MarketSignInPrompt() {
  return (
    <Stack gap="xs" padding="sm" rounded="lg" surface="muted" className="min-w-0">
      <Text size="sm" weight="semibold">Asking prices elsewhere</Text>
      <Text size="sm" color="muted">
        We measured what other Indian shops ask for this, from a crawl of
        fifteen catalogues.{" "}
        <TextLink href={String(ROUTES.AUTH.LOGIN)}>Sign in</TextLink> to see the
        range.
      </Text>
    </Stack>
  );
}

function ResultCard({
  row,
  threshold,
  market,
  canSeeMarket,
}: {
  row: PriceIndexResultRow;
  threshold: number;
  /** The crawl band for this leaf, when one exists AND the viewer may see it. */
  market?: PriceIndexMarketRowView;
  /** Signed in. Decides prompt-vs-nothing when `market` is absent. */
  canSeeMarket: boolean;
}) {
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

      {/*
        🛑 MARKET FIRST when we have no sales of our own, and that ordering is
        the point of this change. The tool used to answer every lookup with
        "No completed sales recorded here yet" while a measured competitor band
        sat on the taxonomy unread — the crawl was paid for and never reached
        the surface it was crawled for. With no sold band, the ask IS the
        answer; with one, the sold band leads and the ask is context.
      */}
      {(!row.bands || row.bands.length === 0) &&
        (market ? <MarketCard market={market} /> : canSeeMarket ? null : <MarketSignInPrompt />)}

      {row.bands && row.bands.length > 0 ? (
        <>
          <Stack gap="sm" className="min-w-0">
            {row.bands.map((b) => (
              <BandCard key={b.listingType} band={b} threshold={threshold} />
            ))}
          </Stack>
          {market ? <MarketCard market={market} /> : canSeeMarket ? null : <MarketSignInPrompt />}
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
         *
         * 🛑 The wording is DIFFERENT when a market band is showing above it.
         * "Prices appear once something sells" was written for a card that had
         * nothing else on it; printed under a real asking-price band it reads
         * as though the band were not a price, which is the opposite of what
         * this card now says.
         */
        <Text size="sm" color="muted">
          {market
            ? "Nothing has sold here on LetItRip yet, so the figures above are asking prices elsewhere rather than our own sales."
            : canSeeMarket
              ? /*
                 * 🛑 BOTH halves are empty here, and saying so is the point.
                 * The old copy named only the sold half, so a lookup for an
                 * item nobody has crawled either — Dragoon G and every other
                 * Engine Gear top, an era the 2026-10 crawl skipped entirely —
                 * read as "it just has not sold yet" when the truth is that we
                 * have no price evidence of any kind. Those are different
                 * states and only one of them is about our marketplace.
                 */
                "No price evidence for this one yet — nothing sold here, and no asking prices recorded for it either. It appears as soon as either exists."
              : "No completed sales recorded here yet. Prices appear once something sells on LetItRip."}
        </Text>
      )}
    </Stack>
  );
}

/** Stable identity — a `useMemo` dependency inside `useSiteSearch`. */
const identityLabel = (typeKey: string) => typeKey;

export interface PriceIndexToolViewProps {
  /** Seeded from `?q=` so a shared link reproduces the lookup. */
  initialQuery?: string;
  initialData?: PriceIndexToolResponse | null;
  /** `siteSettings.search?.indexEnabled`. Read as `!== false`. */
  searchIndexEnabled?: boolean;
}

export function PriceIndexToolView({
  initialQuery = "",
  initialData = null,
  searchIndexEnabled,
}: PriceIndexToolViewProps) {
  const [draft, setDraft] = useState(initialQuery);
  /**
   * The SUBMITTED term, distinct from `draft`.
   *
   * 🛑 Two pieces of state, not one, and that is the whole reason the lookup is
   * a `useQuery`. Keying the query on `draft` would fire a request per
   * keystroke against a route that holds a Firestore query plus a multi-get —
   * which is Root Cause #94's recurring server bill, and `audit-client-poll-cost`
   * exists because of it. The query key only moves when somebody submits.
   *
   * 🛑 Still here after the dropdown landed, because it drives the FALLBACK
   * path: the dropdown's options come from the local search artifact, so when
   * that artifact is disabled or fails to load there is nothing to pick from
   * and the tool must still work. Deleting this would have made a kill-switch
   * flip turn the whole page into an empty combobox.
   */
  const [term, setTerm] = useState(initialQuery.trim());

  /**
   * What the dropdown picked: the category id to price, plus its label.
   *
   * 🛑 The LABEL is kept alongside the id, not looked up again. The option list
   * is rebuilt per keystroke inside `loadOptions`, so by the time results
   * arrive the option that produced the selection may no longer be in the list
   * — and `PaginatedSelect` renders the trigger from the value it was given.
   * Without this the chosen item's name would vanish from the control the
   * moment the query that found it changed.
   */
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);

  /** Signed in? Decides whether the market half is requested at all. */
  const session = useOptionalSession();
  const canSeeMarket = Boolean(session?.user?.uid);

  /*
   * The artifact, for the dropdown. `active` is true as soon as the control is
   * on the page: unlike the old submit-driven flow there is no "intent"
   * threshold to wait for — a combobox the user has just clicked must have
   * options, and the artifact is a one-time ~420 KB load with a module-scope
   * singleton behind it, not a per-keystroke cost.
   */
  const dropdownIndex = useSearchIndex({
    active: true,
    indexEnabled: searchIndexEnabled,
  });

  /**
   * Options for the dropdown, resolved LOCALLY on every keystroke.
   *
   * 🛑 `async` only to satisfy `loadOptions`' signature — nothing here awaits.
   * `searchIndex` is a linear scan over ~3,700 prepared records, measured at
   * 0.76 ms by `verify-search-local.mjs`, so there is no network round trip to
   * debounce and no Firestore read to bill. This is the whole reason the
   * dropdown can be a dropdown.
   *
   * 🛑 Hits that cannot be priced are DROPPED, not shown disabled. An option
   * that selects to a card reading "no data" is worse than an absent one — it
   * looks like the tool failed rather than like the item is not priceable. See
   * `priceLookupTargetFor` for which types resolve and why.
   */
  const loadOptions = useCallback(
    async (query: string, page: number) => {
      const idx = dropdownIndex.index;
      if (!idx || !query.trim()) return { items: [], hasMore: false };

      const hits = searchIndex(idx.artifact, idx.prepared, query, {
        types: PRICE_LOOKUP_INDEX_TYPES,
        limit: DROPDOWN_LIMIT,
      });

      const seen = new Set<string>();
      const items: PaginatedSelectOption<string>[] = [];
      for (const hit of hits) {
        const target = priceLookupTargetFor(hit.href);
        if (!target || seen.has(target)) continue;
        seen.add(target);
        items.push({
          value: target,
          /*
           * The type and the detail both earn their place: `detail` is the
           * taxonomy path for a category and the classification for a part,
           * which is how a reader tells three results named "105" apart.
           */
          label: `${hit.title}${hit.detail ? ` — ${hit.detail}` : ""}`,
        });
      }

      // One page: the matcher already ranked and capped. Paging a ranked list
      // would invite scrolling past the answer rather than refining the query.
      return { items, hasMore: false, nextPage: page };
    },
    [dropdownIndex.index],
  );

  /**
   * 🛑 The dropdown is only usable with an artifact behind it. On `disabled` or
   * `failed` the page falls back to the original text box, which hits the
   * server-side `searchTxt` path. Reported as a state rather than silently
   * degrading, because an empty combobox is indistinguishable from an empty
   * catalogue.
   */
  const dropdownUsable =
    dropdownIndex.status === "ready" || dropdownIndex.status === "loading" ||
    dropdownIndex.status === "idle";

  /*
   * 🛑 TIER 1 ADOPTION, kept for the FALLBACK path only.
   *
   * `searchPriceIndex` pays a `searchTxt` push-down query to turn a free-text
   * term into category leaves — the resolution the local artifact does for
   * free. When the dropdown is driving, no term is ever submitted and this
   * stays idle; it matters when somebody lands on a shared `?q=` link.
   *
   * 🛑 Its `types` now come from `PRICE_LOOKUP_INDEX_TYPES`, not a hand-written
   * `["model", "category"]`. That literal is why spares were unreachable: the
   * index has had a `part` type the whole time and this call never asked for
   * it, so no amount of typing a part name could surface one.
   */
  const local = useSiteSearch(term, {
    active: term.length >= 2,
    indexEnabled: searchIndexEnabled,
    types: PRICE_LOOKUP_INDEX_TYPES,
    label: identityLabel,
  });

  const localIds = React.useMemo(() => {
    if (!local.result) return [];
    const ids = new Set<string>();
    for (const group of local.result.groups) {
      for (const hit of group.hits) {
        /*
         * 🛑 `priceLookupTargetFor`, not a bare `/categories/` regex. The old
         * `categoryIdFromHref` matched that one shape and returned `null` for
         * everything else, so a part hit was discarded here even on the rare
         * occasion one arrived.
         */
        const id = priceLookupTargetFor(hit.href);
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }, [local.result]);

  const localReady = local.status === "ready";

  /**
   * The ids actually being looked up.
   *
   * A dropdown pick wins outright: it is an explicit choice of ONE thing, and
   * mixing it with the term-resolved set would answer a question the user
   * stopped asking the moment they picked.
   */
  const lookupIds = React.useMemo(
    () => (picked ? [picked.id] : localReady ? localIds : []),
    [picked, localReady, localIds],
  );

  /*
   * The bands-only request. Enabled ONLY once local resolution has actually
   * produced something — an empty `localIds` with the gate open would be a
   * request shaped `?ids=`, which the route already treats as "no results"
   * but which is still a request worth not making.
   */
  const bandsQuery = useQuery({
    queryKey: ["tool", "price-index", "bands", lookupIds],
    queryFn: () =>
      apiClient.get<{ results: PriceIndexResultRow[] }>(TOOL_ENDPOINTS.PRICE_INDEX_BANDS(lookupIds)),
    enabled: lookupIds.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  /**
   * The MARKET half — a separate request, on purpose.
   *
   * 🛑 `enabled: canSeeMarket && …`. A guest never issues it, so the gate costs
   * a signed-out visitor nothing and cannot 401-spam the console. The server
   * enforces it too (`auth: true`); this is the client half of one decision,
   * not the decision itself.
   *
   * 🛑 A separate request rather than two more fields on `bandsQuery`, because
   * that route is PUBLIC and edge-cached: folding viewer-dependent content into
   * it would let one signed-in lookup populate the entry every guest then
   * reads. The full argument is in `price-index/market.ts`.
   *
   * 🛑 Its failure is deliberately NOT surfaced as the page's error. The sold
   * band is the page; the ask is context. A 401 or a cold-start blip on the
   * context must not replace a working result with "could not look that up".
   */
  const marketQuery = useQuery({
    queryKey: ["tool", "price-index", "market", lookupIds],
    queryFn: () =>
      apiClient.get<{ results: PriceIndexMarketRowView[] }>(
        TOOL_ENDPOINTS.PRICE_INDEX_MARKET(lookupIds),
      ),
    enabled: canSeeMarket && lookupIds.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  /** `categoryId` -> its market band, for the per-card join. */
  const marketById = React.useMemo(() => {
    const m = new Map<string, PriceIndexMarketRowView>();
    for (const row of marketQuery.data?.results ?? []) m.set(row.categoryId, row);
    return m;
  }, [marketQuery.data]);

  /*
   * The FALLBACK. Fires only when the local index is off, failed, or
   * (rarely) resolved to nothing — never alongside the local path, so a
   * working index never pays for both. Same cache posture as it always had.
   */
  const fallbackEnabled =
    !picked && term.length >= 2 &&
    (local.status === "failed" || local.status === "disabled" ||
      (localReady && localIds.length === 0));
  const fallbackQuery = useQuery({
    queryKey: ["tool", "price-index", term],
    queryFn: () => apiClient.get<PriceIndexToolResponse>(TOOL_ENDPOINTS.PRICE_INDEX_SEARCH(term)),
    enabled: fallbackEnabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    ...(initialData && initialData.query === initialQuery.trim()
      ? { initialData }
      : {}),
  });

  /*
   * One shape out, regardless of which path answered. `truncated` is always
   * `false` on the local path — `PRICE_INDEX_SEARCH_LIMIT` already bounded
   * how many ids were resolved, so there is nothing left uncounted the way
   * the query-based path's search step could leave behind.
   */
  const query = lookupIds.length > 0
    ? {
        data: bandsQuery.data
          ? {
              query: picked ? picked.label : term,
              results: bandsQuery.data.results,
              truncated: false,
              /*
               * The confidence threshold is a server-side constant
               * (`PRICE_INDEX_MIN_CONFIDENT_SAMPLES = 3`), not something
               * resolved per-request — the bands endpoint does not echo it
               * back because it is already baked into each band's own
               * `confident` flag. Hardcoded to match the renderer's own
               * existing fallback below (`data?.minConfidentSamples ?? 3`),
               * so the two paths show the same explanatory copy.
               */
              minConfidentSamples: 3,
            }
          : undefined,
        isFetching: bandsQuery.isFetching,
        isError: bandsQuery.isError,
        error: bandsQuery.error,
      }
    : fallbackQuery;

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
              Pick any bey, part or set to see what it actually sold for on
              LetItRip — the range, the median, the average and the most recent
              sale, broken down by condition — alongside what other Indian shops
              are asking for the same thing.
            </Text>
          </Stack>

          {/*
            🛑 A SEARCHABLE DROPDOWN, not a text box, and the reason is a
            reported bug rather than taste. A free-text box let a query like
            "dragoon g" through to a matcher where a one-character term matched
            almost everything, so the page answered with eight near-identical
            cards. A combobox makes the user pick one real taxonomy node, which
            removes the ambiguity at the source instead of ranking around it.

            CLAUDE.md § "Select / Dropdown Rules" also requires it: any
            selection over five options goes through `<PaginatedSelect>`, and
            this one spans ~1,185 categories, 216 models and 753 parts.
          */}
          {dropdownUsable ? (
            <Stack gap="xs" className="min-w-0">
              <PaginatedSelect<string>
                value={picked?.id ?? null}
                onChange={(value, option) =>
                  setPicked(value && option ? { id: value, label: option.label } : null)
                }
                loadOptions={loadOptions}
                placeholder="Pick a bey, part or set…"
                searchPlaceholder="Type a name, code or part — e.g. Dragoon G, 1B, rubber flat"
                noResultsText="Nothing in our catalogue matches that."
                ariaLabel="Search the catalogue for a price lookup"
              />
              <Text size="xs" color="muted">
                Models, parts and spares, eras and brands — straight from our own
                catalogue, so what you pick is a real thing we can price.
              </Text>
            </Stack>
          ) : (
            /*
             * 🛑 The fallback, for a disabled or failed search artifact. Without
             * it a kill-switch flip would leave an empty combobox and no way to
             * search at all — the dropdown has no options without the artifact,
             * but the server-side `searchTxt` path still works.
             */
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
          )}

          {error && (
            <Text size="sm" color="error" role="alert">
              {error}
            </Text>
          )}

          {!hasQuery && !loading && !error && (
            <Stack gap="xs" padding="card" rounded="lg" surface="muted" className="min-w-0">
              <Text weight="semibold">Two numbers, and the gap matters</Text>
              <Text size="sm" color="muted">
                <Span weight="semibold">Sold</Span> is a completed sale on
                LetItRip — not an asking price and not a guess. We publish a
                figure only once {threshold} or more sales support it, and the
                index is recomputed once a day, so it is deliberately a day
                behind.
              </Text>
              {/*
                🛑 Says the asks exist even to a guest who cannot see them. The
                alternative is a page that silently has less on it when signed
                out, which reads as missing data rather than as a gate.
              */}
              <Text size="sm" color="muted">
                <Span weight="semibold">Asked</Span> is what other Indian shops
                list the same thing for, measured across fifteen catalogues.
                {canSeeMarket
                  ? " Shown beside our own sales — never averaged with them, because an ask is not a sale."
                  : " Sign in to see it beside our own sales."}
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
                <ResultCard
                  key={row.categoryId}
                  row={row}
                  threshold={threshold}
                  market={marketById.get(row.categoryId)}
                  canSeeMarket={canSeeMarket}
                />
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
