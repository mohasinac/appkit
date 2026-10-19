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
import {
  PART_SLOT_LABEL,
  type PartGlossaryDocument,
  type ModelCompositionDocument,
} from "../schemas/firestore";

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
