/**
 * One bey's public page — what it is, what it is built from, who used it.
 *
 * ── 🛑 NO MONEY ON THIS PAGE, DELIBERATELY ─────────────────────────────────
 *
 * Prices are hidden from signed-out visitors, so any amount here would need
 * `<GatedPrice>` and make this a client component. Listing rows carry a title,
 * a condition and a link; the price lives one click away on the listing, where
 * the gate already is. Same rule as `PartDetailPageView` and `/search`: a row
 * with nothing to gate has nothing to leak, and no `offers.price` is emitted
 * so no paywall declaration is needed either.
 *
 * 🛑 `price` IS on the document and is deliberately not rendered. It is the
 * source's original retail price (`1404¥`), not our listing price — showing it
 * beside real listings would read as an offer.
 *
 * ── 🛑 THE SOURCE LINK IS NOT OPTIONAL ────────────────────────────────────
 *
 * The facts here are extracted from a CC-BY-SA corpus. Taking facts only and
 * linking back is what keeps us clear of share-alike, and `sourceUrl` was
 * stored on ~5,500 rows while being rendered on NONE of them. Storing it is
 * not discharging the obligation.
 */
import React from "react";
import { Section } from "../../../ui/components/Semantic";
import { Container, Stack, Row } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Heading, Text, Span } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Anchor } from "../../../ui/components/Anchor";
import { Badge } from "../../../ui/components/Badge";
import { SpecTable, type SpecTableRow } from "../../../ui/components/SpecTable";
import { ROUTES } from "../../../next/routing/route-map";
import { PART_SLOT_LABEL, type PartSlot } from "../../parts/schemas/firestore";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";
import type { BeyDocument, BeyProductDocument } from "../schemas/firestore";

/**
 * The rating axes, in a fixed order.
 *
 * 🛑 ORDERED EXPLICITLY, never by `Object.keys`. Firestore returns map fields
 * alphabetically, which would put "burst" and "dash" above "attack" and
 * reorder the table per bey depending on which axes it happens to carry — so
 * two beys could not be compared row against row.
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
export interface BeyListingRow {
  id: string;
  title: string;
  slug?: string;
  condition?: string;
  href: string;
}

export interface BeyDetailPageViewProps {
  bey: BeyDocument;
  /** Products whose assortment contains this bey. */
  products: readonly BeyProductDocument[];
  /** Live listings, from the shared public product query. */
  listings: readonly BeyListingRow[];
  /** `total` is a FLOOR when the bounded fetch saturated. */
  listingsTruncated?: boolean;
  allListingsHref: string;
  /** A part's own page, when the composition entry resolved to a glossary id. */
  hrefForPart: (partId: string) => string | null;
  /** This bey's category leaf, when one exists (116 beys have no leaf). */
  categoryHref?: string | null;
  /** A character's page, for a resolved owner. */
  hrefForCharacter?: (slug: string) => string;
}

export function BeyDetailPageView({
  bey,
  products,
  listings,
  listingsTruncated,
  allListingsHref,
  hrefForPart,
  categoryHref,
  hrefForCharacter,
}: BeyDetailPageViewProps) {
  /*
   * ── THE SPEC TABLE ────────────────────────────────────────────────────────
   *
   * Only what the source states. 🛑 A row is omitted when the fact is absent
   * rather than rendered with an em-dash: "Element —" would claim we looked it
   * up and found none, and `element` is on 45 of 1,988 beys precisely because
   * it is a Beyblade-X-only attribute, not missing data.
   */
  const specRows: SpecTableRow[] = [
    ...(bey.type ? [{ name: "Type", value: bey.type }] : []),
    ...(bey.spinDirection ? [{ name: "Spin", value: bey.spinDirection }] : []),
    ...(bey.system ? [{ name: "System", value: bey.system }] : []),
    ...(bey.series ? [{ name: "Series", value: bey.series }] : []),
    ...(bey.element ? [{ name: "Element", value: bey.element }] : []),
    /*
     * 🛑 MASS: the stated figure wins, and a SUMMED one is labelled as summed
     * and marked approximate when the parts are only partly weighed. Printing
     * a partial sum as a plain total is the one thing this must not do — the
     * generator deliberately refuses to scale it up for the same reason.
     */
    ...(typeof bey.weightG === "number"
      ? [{ name: "Weight", value: String(bey.weightG), unit: "g" }]
      : typeof bey.weightGFromParts === "number"
        ? [
            {
              name: "Weight",
              value: String(bey.weightGFromParts),
              unit: bey.weightGFromPartsCoverage?.complete
                ? "g (summed from parts)"
                : `g (from ${bey.weightGFromPartsCoverage?.weighed ?? 0} of ` +
                  `${bey.weightGFromPartsCoverage?.total ?? 0} parts)`,
              approximate: !bey.weightGFromPartsCoverage?.complete,
            },
          ]
        : []),
    ...(bey.productCodes?.length
      ? [{ name: bey.productCodes.length > 1 ? "Product codes" : "Product code", value: bey.productCodes.join(" · ") }]
      : []),
    ...(bey.releaseJP ? [{ name: "Released (JP)", value: bey.releaseJP }] : []),
    ...(bey.releaseUS ? [{ name: "Released (US)", value: bey.releaseUS }] : []),
    ...(bey.jpName ? [{ name: "Japanese name", value: bey.jpName }] : []),
    ...(bey.romaji ? [{ name: "Romaji", value: bey.romaji }] : []),
    ...(bey.creator ? [{ name: "Creator", value: bey.creator }] : []),
  ];

  const ratings = bey.ratingsFromParts ?? null;
  const ratingRows = ratings
    ? RATING_AXES.map((a) => ({ ...a, value: (ratings as Record<string, unknown>)[a.key] })).filter(
        (r): r is { key: string; label: string; value: number } => typeof r.value === "number",
      )
    : [];

  const composition = bey.composition ?? [];
  const aliases = (bey.aka ?? []).filter((a) => a && a !== bey.name);

  return (
    <Section padding="y-lg">
      <Container size="lg">
        <Stack gap="lg" className="min-w-0">
          <Stack gap="xs" className="min-w-0">
            {categoryHref && (
              <Text size="sm" color="muted">
                <TextLink href={categoryHref}>Listings for this model</TextLink>
              </Text>
            )}
            <Heading level={1}>{bey.name}</Heading>
            {/*
              ── 🛑 EDIT AND DELETE, FOR STAFF ONLY ───────────────────────────
              `OwnerQuickActions` renders nothing at all for a signed-out
              visitor or an ordinary buyer, so this costs a public reader
              nothing. It is the same component the category, brand and bundle
              pages use — one implementation, so the affordance cannot drift
              into three shapes.

              🛑 `onMedia` is NOT passed. Both these pages are type on the
              page surface with no cover image behind the title, so the default
              (ghost on surface) is correct. Passing it would force the
              on-media treatment and put light ink on a light background —
              Root Cause #67, which shipped 26 invisible surfaces exactly that
              way.
            */}
            <RecordOwnerQuickActions
              resource="BEY"
              recordId={bey.id}
              placement="detail"
              recordLabel={bey.name}
            />

            <Row gap="xs" wrap align="center" className="min-w-0">
              {bey.type && <Badge variant="info">{bey.type}</Badge>}
              {bey.spinDirection && <Badge variant="default">{bey.spinDirection}</Badge>}
              {bey.system && <Badge variant="secondary">{bey.system}</Badge>}
            </Row>
            {aliases.length > 0 && (
              <Text size="sm" color="muted">
                {/* The Hasbro ↔ Takara-Tomy map, stated by the source. */}
                Also known as: {aliases.join(" · ")}
              </Text>
            )}
          </Stack>

          {/* ── what it is built from ─────────────────────────────────────── */}
          {composition.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Parts
              </Heading>
              <Stack gap="xs" className="min-w-0">
                {composition.map((c, i) => {
                  const href = c.partId ? hrefForPart(c.partId) : null;
                  const label = PART_SLOT_LABEL[c.slot as PartSlot] ?? c.slot;
                  return (
                    <Row
                      key={`${c.slot}-${c.partName}-${i}`}
                      gap="md"
                      align="center"
                      className="min-w-0"
                    >
                      <Text size="sm" color="muted" className="w-36 flex-shrink-0">
                        {label}
                      </Text>
                      {/*
                       * 🛑 An unresolved part still renders its NAME. The join
                       * reaches 88.9%, so ~850 slots name a part we hold no row
                       * for — and rendering nothing there would read as a bey
                       * with an incomplete build rather than as a part page we
                       * happen not to have.
                       */}
                      {href ? (
                        <TextLink href={href}>{c.partName}</TextLink>
                      ) : (
                        <Span>{c.partName}</Span>
                      )}
                    </Row>
                  );
                })}
              </Stack>
            </Stack>
          )}

          {/* ── ratings ──────────────────────────────────────────────────── */}
          {ratingRows.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Ratings
              </Heading>
              <SpecTable rows={ratingRows.map((r) => ({ name: r.label, value: String(r.value) }))} />
              {/*
               * 🛑 STATED AS DERIVED, AND STATED AS AVERAGED. These are not the
               * source's numbers for this bey — the source rates PARTS, so
               * these are the mean of its parts' normalised vectors. Two scales
               * live in that data (Beyblade X 0-100, everything earlier 0-6),
               * which is why they are normalised first and why a raw average
               * would be meaningless. Presenting them unlabelled would pass our
               * arithmetic off as the source's measurement.
               */}
              <Text size="xs" color="faint">
                Averaged from this bey&rsquo;s parts and rescaled to 0&ndash;100 for
                comparison across generations
                {bey.ratingsFromPartsCoverage
                  ? `; from ${bey.ratingsFromPartsCoverage.rated ?? 0} of ` +
                    `${bey.ratingsFromPartsCoverage.total} parts`
                  : ""}
                .
              </Text>
            </Stack>
          )}

          {/* ── modes ────────────────────────────────────────────────────────
              Only 4 of 1,988 carry this, and the section is simply absent for
              the rest — `modes` is undefined there, never `[]`, so "we do not
              know" never renders as "it has none".

              🛑 NO THRESHOLD IS SHOWN because none is stored: every numeric
              threshold in the source disagreed across its own cases (Cosmic
              Pegasus F:D is documented twice with the transition running in
              OPPOSITE directions). `trigger` carries the thing a reader
              actually needs — whether they set the mode, or the bey changes by
              itself as spin falls.

              🛑 A SPECIAL MOVE IS NOT A MODE, which is why the "In the anime"
              block below stays separate: `specialMoves` is fiction about a
              character, `modes` is a property of the object. Merging them would
              put anime finishers on a product reference page as though they
              were specifications. */}
          {bey.modes?.length ? (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Modes
              </Heading>
              <Stack gap="md" className="min-w-0">
                {bey.modes.map((mode) => (
                  <Stack key={mode.name} gap="xs" className="min-w-0">
                    <Row gap="sm" align="center" wrap className="min-w-0">
                      <Text weight="semibold">{mode.name}</Text>
                      {/*
                        🛑 "Set before launch" vs "changes by itself" is the
                        single most useful thing to know about a mode, and it is
                        the distinction `switchKind` exists to carry: Dragoon S
                        and Wyborg both switch tip shape, but one is done by
                        hand and the other mid-battle on impact (owner,
                        2026-10-21). A reader who cannot tell them apart will go
                        looking for a setting that is not there.
                      */}
                      <Text size="xs" color="muted">
                        {mode.switchKind === "speed" || mode.switchKind === "impact"
                          ? "changes on its own"
                          : "set before launch"}
                      </Text>
                    </Row>
                    <Text size="sm">{mode.behaviour}</Text>
                    <Text size="sm" color="muted">
                      {mode.trigger}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          ) : null}

          {/* ── who used it ──────────────────────────────────────────────── */}
          {(bey.ownerNames?.length || bey.specialMoves?.length || bey.appearAnime) && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                In the anime
              </Heading>
              <SpecTable
                rows={[
                  ...(bey.ownerNames?.length
                    ? [{ name: "Used by", value: bey.ownerNames.join(" · ") }]
                    : []),
                  ...(bey.appearAnime ? [{ name: "First appearance", value: bey.appearAnime }] : []),
                  ...(bey.appearManga ? [{ name: "In the manga", value: bey.appearManga }] : []),
                  ...(bey.specialMoves?.length
                    ? [{ name: "Special moves", value: bey.specialMoves.join(" · ") }]
                    : []),
                ]}
              />
              {/* A resolved owner gets a real link; an unresolved one stays text
                  above, which is why both are rendered from different fields. */}
              {hrefForCharacter && (bey.ownerCharacters?.length ?? 0) > 0 && (
                <Row gap="xs" wrap align="center" className="min-w-0">
                  {bey.ownerCharacters!.map((slug) => (
                    <TextLink key={slug} href={hrefForCharacter(slug)}>
                      {slug.replace(/-/g, " ")}
                    </TextLink>
                  ))}
                </Row>
              )}
            </Stack>
          )}

          {/* ── specifications ───────────────────────────────────────────── */}
          {specRows.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Specifications
              </Heading>
              <SpecTable rows={specRows} />
            </Stack>
          )}

          {/* ── which products ship it ───────────────────────────────────── */}
          {products.length > 0 && (
            <Stack gap="sm" className="min-w-0">
              <Heading level={2} size="lg">
                Found in
              </Heading>
              <Stack gap="xs" className="min-w-0">
                {products.map((p) => (
                  <Row key={p.id} gap="md" align="center" className="min-w-0">
                    <Span>{p.name}</Span>
                    {p.productType && (
                      <Text size="xs" color="muted">
                        {p.productType}
                      </Text>
                    )}
                  </Row>
                ))}
              </Stack>
            </Stack>
          )}

          {/* ── listings ─────────────────────────────────────────────────── */}
          <Stack gap="sm" className="min-w-0">
            <Heading level={2} size="lg">
              {listings.length > 0 ? "Currently listed" : "Listings"}
            </Heading>
            {listings.length === 0 ? (
              <Text color="muted" size="sm">
                {/* Honest: a statement about our catalogue, phrased as one. */}
                Nothing matching this model is listed right now.
              </Text>
            ) : (
              <Stack gap="xs" className="min-w-0">
                {listings.map((l) => (
                  <Row key={l.id} gap="md" align="center" className="min-w-0">
                    <TextLink href={l.href}>{l.title}</TextLink>
                    {l.condition && (
                      <Text size="xs" color="muted">
                        {l.condition}
                      </Text>
                    )}
                  </Row>
                ))}
              </Stack>
            )}
            <Text size="sm">
              <TextLink href={allListingsHref}>
                {listingsTruncated ? "See all listings" : "Search listings for this model"}
              </TextLink>
            </Text>
          </Stack>

          {/* ── attribution ──────────────────────────────────────────────── */}
          <Div>
            <Text size="xs" color="faint">
              {/*
               * 🛑 The licence link-back. The facts above are extracted from a
               * CC-BY-SA source; we take facts only and compose our own prose,
               * and this link is the other half of staying clear of
               * share-alike. It is not decoration and must not be dropped to
               * tidy the page.
               */}
              Facts on this page are drawn from a community wiki under CC&nbsp;BY-SA.{" "}
              <Anchor href={bey.sourceUrl} tone="muted" underline="always">
                Source
              </Anchor>
              {bey.wboThreadUrl ? (
                <>
                  {" · "}
                  <Anchor href={bey.wboThreadUrl} tone="muted" underline="always">
                    Community discussion
                  </Anchor>
                </>
              ) : null}
              {/* The same Credits link the part view carries. It was missing
                  here, so the two surfaces built from ONE corpus credited it
                  two different ways — and the one that names the licence holder
                  is the half that matters. */}
              {" · "}
              <TextLink href={String(ROUTES.PUBLIC.CREDITS)}>Credits</TextLink>
            </Text>
          </Div>
        </Stack>
      </Container>
    </Section>
  );
}
