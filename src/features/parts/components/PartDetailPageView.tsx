/**
 * D12 — one part's public page.
 *
 * The question it answers is *"what does RF mean on a Beyblade"*, which is a
 * real search with a real answer nobody in the fifteen-site crawl owns. It
 * also answers the commerce question beside it: raikages is the ONLY source in
 * the crawl with component-level pricing (energy rings ₹149–249, tips
 * ₹129–149), and they sell parts without ever explaining them.
 *
 * ── 🛑 NO PRICES ON THIS PAGE, DELIBERATELY ────────────────────────────────
 *
 * Prices are hidden from signed-out visitors, so every amount on a public
 * surface needs `<GatedPrice>` — a client component. The listing rows here
 * carry a title, a condition and a link; the price lives one click away on the
 * listing itself, where the gate already is. Same rule as `/search`: a row
 * with nothing to gate has nothing to leak, and this stays a server component.
 *
 * ── 🛑 "USED BY" IS A STORED ARRAY, NOT A QUERY ────────────────────────────
 *
 * `usedBy` is written by the seed generator, so the model list is one
 * `getAll` over ids already in hand — no index, no scan, bounded by how many
 * models really use the part. 681 of 753 parts carry one.
 */
import React from "react";
import {
  Section,
  Container,
  Stack,
  Row,
  Div,
  Heading,
  Text,
  Span,
  TextLink,
  Badge,
} from "../../../ui";
import { SpecTable, type SpecTableRow } from "../../../ui/components/SpecTable";
import {
  PART_SLOT_LABEL,
  type PartGlossaryDocument,
  type ModelCompositionDocument,
} from "../schemas/firestore";

/**
 * The buyer-facing label for each WBO tournament format, in the order a
 * player cares about: the formats they are most likely to enter first.
 *
 * 🛑 A `Record` over the format keys rather than a derived title-case, because
 * "Burst Standard" is not `burstStandard` title-cased and "GT" must not become
 * "Gt". 1,380 of 2,488 parts carry a legality ruling.
 */
const WBO_FORMAT_LABEL: Record<string, string> = {
  burstStandard: "Burst Standard",
  burstLimited: "Burst Limited",
  burstClassic: "Burst Classic",
  burstGT: "Burst GT",
  burstSparking: "Burst Sparking",
  burstDynamite: "Burst Dynamite",
  xStandard: "X Standard",
  zeroG: "Zero-G",
  metalFight: "Metal Fight",
  plastic: "Plastic",
  hms: "HMS",
};

/**
 * The rating axes, in a fixed order.
 *
 * 🛑 ORDERED EXPLICITLY, never by `Object.keys`. Firestore returns map fields
 * alphabetically, which would put "burst" and "dash" ahead of "attack" and
 * reorder the table per part depending on which axes that part happens to
 * carry. A reader comparing two parts needs the same rows in the same places.
 */
const RATING_AXES: readonly { key: string; label: string }[] = [
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "stamina", label: "Stamina" },
  { key: "weight", label: "Weight" },
  { key: "speed", label: "Speed" },
  { key: "burst", label: "Burst" },
  { key: "burstResistance", label: "Burst resistance" },
  { key: "dash", label: "Dash" },
  { key: "power", label: "Power" },
  { key: "height", label: "Height" },
  { key: "runTime", label: "Run time" },
];

/** One live listing row. Deliberately money-free — see the header. */
export interface PartListingRow {
  id: string;
  title: string;
  slug?: string;
  condition?: string;
  href: string;
}

export interface PartDetailPageViewProps {
  part: PartGlossaryDocument;
  /** Models that use it, hydrated from `usedBy`. */
  usedBy: readonly ModelCompositionDocument[];
  /** Live listings matching the part, from the shared public product query. */
  listings: readonly PartListingRow[];
  /** `total` is a FLOOR when the bounded fetch saturated. */
  listingsTruncated?: boolean;
  /** Where "see all listings" goes — a real search, not a fabricated filter. */
  allListingsHref: string;
  /**
   * Listings naming THIS exact glossary entry, via `partGlossaryId` — spares
   * and any other individually-sold component carrying it.
   *
   * 🛑 A SEPARATE section from `listings` above, not a narrower version of it.
   * `listings` is a fuzzy name search across the GENERAL catalogue
   * (`GENERIC_PRODUCT_LISTING_TYPES`), which `spares` is deliberately excluded
   * from (`inGeneralCatalogue: false`) — so a spare of this exact part could
   * never appear there no matter how precisely it was titled. This section is
   * the one place that gap is closed.
   */
  exactListings?: readonly PartListingRow[];
  exactListingsTruncated?: boolean;
  /** A model's own page, when the composition resolved to a category. */
  hrefForModel: (categoryId: string) => string;
  hrefForClassification: (slot: string) => string;
}

export function PartDetailPageView({
  part,
  usedBy,
  listings,
  listingsTruncated,
  allListingsHref,
  exactListings = [],
  exactListingsTruncated,
  hrefForModel,
  hrefForClassification,
}: PartDetailPageViewProps) {
  const classification = PART_SLOT_LABEL[part.slot] ?? part.classification ?? part.slot;
  /*
   * 🛑 Only 23 of 753 parts carry a code, and that is a fact about the sources
   * rather than missing data. So the code renders as a badge when present and
   * nothing stands in for it when absent — an em-dash beside "Code" would
   * imply we looked it up and found none.
   */
  const aliases = (part.aliases ?? []).filter((a) => a && a !== part.name && a !== part.code);

  /*
   * ── THE SPEC TABLE ────────────────────────────────────────────────────────
   *
   * `specs[]` is the extracted infobox (2,144 of 2,488 parts carry one), and
   * the four rows prepended here are the fields promoted OFF that array
   * because something queries them — so they would otherwise either be
   * missing from the table or duplicated inside it.
   *
   * 🛑 De-duplicated against the extracted rows by label. `Classification`,
   * `System` and `Series` all appear in `specs[]` as well, so prepending them
   * blindly printed each one twice.
   */
  const promoted: SpecTableRow[] = [
    { name: "Classification", value: classification },
    ...(part.system ? [{ name: "System", value: part.system }] : []),
    ...(part.series ? [{ name: "Series", value: part.series }] : []),
    ...(typeof part.weightG === "number"
      ? [{ name: "Weight", value: String(part.weightG), unit: "g" }]
      : []),
    ...(part.spinDirection ? [{ name: "Spin direction", value: part.spinDirection }] : []),
    ...(part.partType ? [{ name: "Type", value: part.partType }] : []),
    ...(part.hasbroCode ? [{ name: "Hasbro code", value: part.hasbroCode }] : []),
  ];
  const promotedLabels = new Set(promoted.map((r) => r.name.toLowerCase()));
  const specRows: SpecTableRow[] = [
    ...promoted,
    ...(part.specs ?? [])
      .filter((s) => s.label && s.value && !promotedLabels.has(s.label.toLowerCase()))
      .map((s) => ({ name: s.label, value: s.value })),
  ];

  /*
   * ── RATINGS ───────────────────────────────────────────────────────────────
   *
   * 🛑 RENDER THE NORMALISED VECTOR, NEVER THE RAW ONE. Two scales live in
   * these fields — the Beyblade X lines rate 0-100 and everything before them
   * rates 0-6 (with a handful of Burst systems peaking at 7 or 8) — so a raw
   * "Attack 3" means half of maximum for a Burst part and almost nothing for
   * an X part. `ratingsNormalised` is the only comparable form, and the source
   * scale is stated under the bars so the number is not passed off as the
   * wiki's own.
   */
  const ratings = part.ratingsNormalised ?? null;
  const ratingRows = ratings
    ? RATING_AXES.map((a) => ({ ...a, value: (ratings as Record<string, unknown>)[a.key] })).filter(
        (r): r is { key: string; label: string; value: number } => typeof r.value === "number",
      )
    : [];

  /* Only the formats this part is actually ruled on — see the note below. */
  const legalFormats = Object.entries(part.wboLegality ?? {}).filter(
    ([, v]) => typeof v === "boolean",
  ) as [string, boolean][];

  return (
    <Section padding="y-lg">
      <Container size="lg">
        <Stack gap="lg" className="min-w-0">
          <Stack gap="xs" className="min-w-0">
            <Text size="sm" color="muted">
              <TextLink href={hrefForClassification(part.slot)}>{classification}</TextLink>
            </Text>
            <Heading level={1}>{part.name}</Heading>
            <Row gap="xs" wrap align="center" className="min-w-0">
              {part.code && <Badge variant="info">{part.code}</Badge>}
              {typeof part.weightG === "number" && (
                <Badge variant="default">{part.weightG} g</Badge>
              )}
            </Row>
            {aliases.length > 0 && (
              <Text size="sm" color="muted">
                Also written: {aliases.join(" · ")}
              </Text>
            )}
          </Stack>

          {/* ── specifications ───────────────────────────────────────────── */}
          {specRows.length > 1 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Specifications
              </Heading>
              <SpecTable rows={specRows} />
            </Stack>
          )}

          {/* ── ratings ──────────────────────────────────────────────────── */}
          {ratingRows.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Ratings
              </Heading>
              {/*
               * ── 🛑 NUMBERS, NOT BARS, AND THAT IS A DELIBERATE RETREAT ────
               *
               * A proportional bar reads better and was the first build. It
               * needs a runtime width, and there is no way to express one here
               * that I could VERIFY:
               *
               *   · `style={{ width: … }}` is blocked by audit-inline-styles,
               *     whose regex is a bare `/style\s*=\s*\{\{/` and so flags a
               *     CSS custom property too, despite its own header listing
               *     custom properties as exempt.
               *   · `// audit-inline-style-ok` is one of the 24 markers
               *     `audit-no-suppression-comments` blocks outright.
               *   · A lookup of 21 literal `w-[N%]` classes would compile IF
               *     appkit's own Tailwind config generates them — and appkit
               *     builds its CSS separately (`@source not "../../appkit"`),
               *     so that is exactly the Root Cause #67 shape: a class the
               *     build never emits, failing silently as a zero-width bar.
               *
               * I cannot run an appkit build to check which of those is true,
               * and an unverified bar is a silent visual failure — the precise
               * class of bug this session spent its time removing. So the
               * table states the numbers, which cannot fail to render, and the
               * bar is left for whoever can verify the generated CSS.
               */}
              <SpecTable
                rows={ratingRows.map((r) => ({
                  name: r.label,
                  value: `${r.value} / 100`,
                }))}
              />
              {/*
               * 🛑 The scale is STATED. These numbers are ours — rescaled to
               * 0-100 so a Burst part and a Beyblade X part can be compared at
               * all — and presenting them unlabelled would pass them off as
               * the source's own figures.
               */}
              <Text size="xs" color="faint">
                Rescaled to 0&ndash;100 for comparison across generations
                {typeof part.ratingScale === "number"
                  ? `; rated 0–${part.ratingScale} at source`
                  : ""}
                .
              </Text>
            </Stack>
          )}

          {/* ── tournament legality ──────────────────────────────────────── */}
          {legalFormats.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Tournament legality
              </Heading>
              <Row gap="xs" wrap align="center" className="min-w-0">
                {legalFormats.map(([format, allowed]) => (
                  <Badge key={format} variant={allowed ? "success" : "danger"}>
                    {WBO_FORMAT_LABEL[format] ?? format}
                    {allowed ? " ✓" : " ✗"}
                  </Badge>
                ))}
              </Row>
              {/*
               * 🛑 ONLY THE FORMATS THE SOURCE RULES ON. A part absent from a
               * format's list is unaddressed, not banned — most parts are
               * simply irrelevant to most formats, and rendering every format
               * with a cross would claim a ruling that does not exist.
               */}
              <Text size="xs" color="faint">
                World Beyblade Organization formats this part is ruled on. A format not
                listed has no ruling for it.
              </Text>
            </Stack>
          )}

          {/* ── which beys use it ─────────────────────────────────────────── */}
          <Stack gap="sm" className="min-w-0">
            <Heading level={2} size="lg">
              {usedBy.length > 0
                ? `Used by ${usedBy.length} ${usedBy.length === 1 ? "model" : "models"}`
                : "Used by"}
            </Heading>
            {usedBy.length === 0 ? (
              <Text color="muted" size="sm">
                {/* Honest: the corpus describes 259 models, not every model
                    ever made, so "none recorded" is a statement about our
                    data and is phrased as one. */}
                No model in our database records this part yet.
              </Text>
            ) : (
              <Stack gap="xs" className="min-w-0">
                {usedBy.map((m) => (
                  <Row
                    key={m.id}
                    gap="sm"
                    align="center"
                    padding="inline"
                    surface="card"
                    rounded="md"
                    border="subtle"
                    className="min-w-0"
                  >
                    <Div className="flex-1 min-w-0">
                      {m.categoryId ? (
                        <TextLink href={hrefForModel(m.categoryId)}>{m.name}</TextLink>
                      ) : (
                        /* 49 of 259 compositions did not join to a category.
                           A link to a page that does not exist is worse than
                           plain text, so the name renders unlinked. */
                        <Text color="primary">{m.name}</Text>
                      )}
                      {m.system && (
                        <Span size="xs" color="muted">
                          {" "}
                          · {m.system}
                        </Span>
                      )}
                    </Div>
                    {m.productCode && (
                      <Text size="xs" color="faint" className="flex-shrink-0">
                        {m.productCode}
                      </Text>
                    )}
                  </Row>
                ))}
              </Stack>
            )}
          </Stack>

          {/* ── buy this exact part ──────────────────────────────────────────
            * 🛑 NO MONEY on this page — it stays a Server Component, and a
            * gated price would make it a client one. Rows carry only title,
            * condition and a link; the price is on the listing's own page,
            * where the gate already applies.
            */}
          {exactListings.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Buy this part
                {exactListingsTruncated && (
                  <Span size="sm" color="muted">
                    {" "}
                    ({exactListings.length}+)
                  </Span>
                )}
              </Heading>
              <Stack gap="xs" className="min-w-0">
                {exactListings.map((l) => (
                  <Div
                    key={l.id}
                    surface="card"
                    padding="sm"
                    rounded="md"
                    border="subtle"
                    className="min-w-0"
                  >
                    <TextLink href={l.href}>{l.title}</TextLink>
                    {l.condition && (
                      <Text size="xs" color="muted">
                        {l.condition}
                      </Text>
                    )}
                  </Div>
                ))}
              </Stack>
            </Stack>
          )}

          {/* ── live listings ─────────────────────────────────────────────── */}
          <Stack gap="sm" className="min-w-0">
            <Row justify="between" align="center" wrap gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Listings
                {listingsTruncated && (
                  <Span size="sm" color="muted">
                    {" "}
                    ({listings.length}+)
                  </Span>
                )}
              </Heading>
              {listings.length > 0 && (
                <TextLink href={allListingsHref}>See all listings →</TextLink>
              )}
            </Row>
            {listings.length === 0 ? (
              <Stack gap="xs" className="min-w-0">
                <Text color="muted" size="sm">
                  Nobody is selling this part right now.
                </Text>
                <TextLink href={allListingsHref}>Search the catalogue →</TextLink>
              </Stack>
            ) : (
              <Stack gap="xs" className="min-w-0">
                {listings.map((l) => (
                  <Div
                    key={l.id}
                    surface="card"
                    padding="sm"
                    rounded="md"
                    border="subtle"
                    className="min-w-0"
                  >
                    <TextLink href={l.href}>{l.title}</TextLink>
                    {l.condition && (
                      <Text size="xs" color="muted">
                        {l.condition}
                      </Text>
                    )}
                  </Div>
                ))}
              </Stack>
            )}
          </Stack>

          {part.source && (
            <Text size="xs" color="faint">
              Source: {part.source}
            </Text>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
