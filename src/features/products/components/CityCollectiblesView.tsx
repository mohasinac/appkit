import { ROUTES } from "../../../next/routing/route-map";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY } from "../../../_internal/shared/styles/themed";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { safeRead } from "../../../errors/safe-read";
import { Alert } from "../../../ui/components/Alert";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { TextLink } from "../../../ui/components/TextLink";
import { listPublicProducts } from "../../../_internal/server/features/products/list-public";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { MEETUP_CITIES, type MeetupCity } from "../constants/meetup-cities";
import { ProductGrid } from "./ProductGrid";
import type { ProductItem } from "../types";
import { getBrandName } from "../../../core/brand-resolver";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

/** Listings read per city page. One bounded query, Rule #6. */
const CITY_LISTING_LIMIT = 24;

export interface CityCollectiblesViewProps {
  city: MeetupCity;
}

/**
 * D5 — local SEO: the collectibles people are selling in ONE city.
 *
 * ## 🛑 What makes this a real page rather than a doorway
 *
 * Google's own guidance on local pages is that they must carry content specific
 * to the place; a template with the city name swapped in is the doorway pattern
 * it penalises. So everything on this page is city-SPECIFIC and comes from the
 * city's own data:
 *
 *   - the classified listings whose seller named THIS city as the meet-up
 *     point, which is a real field (`classified.meetupArea.city`) with its own
 *     composite index, not a text match on a description;
 *   - the count, stated plainly;
 *   - and when the count is zero it SAYS so, with the national browse as the
 *     next step. An empty grid under a city headline is the failure mode this
 *     page type is famous for.
 *
 * ## 🛑 Classifieds only, deliberately
 *
 * A shipped listing has no city — it has a seller's warehouse, which is not
 * where the buyer is and not a fact about the buyer's town. Only the classified
 * type carries a meet-up place, so only classifieds can honestly appear under a
 * city heading. Padding the page with shippable national inventory is what
 * turns a local page into the same page six times.
 */
export async function CityCollectiblesView({ city }: CityCollectiblesViewProps) {
  const page = { container: PAGE_CONTAINER };

  const result = await safeRead(
    () =>
      listPublicProducts({
        listingTypes: ["classified"],
        // The city is a TYPE FACET, resolved to `classified.meetupArea.city` by
        // the shared query — never a hand-written Sieve clause here.
        typeFacets: { [TABLE_KEYS.CITY]: city.city },
        availability: "available",
        page: 1,
        pageSize: CITY_LISTING_LIMIT,
      }),
    {
      route: "/collectibles/[city]",
      key: "city.classifieds",
      fallback: null,
    },
  );

  /*
   * The metadata comes off the result FIRST, then the rows are narrowed — so
   * nothing reads the raw result after the projection exists. That ordering is
   * what `audit-projection-shadow` is for: a narrowed copy beside a live
   * source is how a raw document reaches a client prop (Root Cause #70), and
   * the rule holds even when the later read is innocent.
   *
   * 🛑 `truncated` means `total` is a FLOOR, so it renders as "24+" and never
   * as an exact figure — the same rule every other bounded listing follows. A
   * floor presented as a total compounds into a wrong "page 2 of 1".
   */
  const total = result?.total ?? 0;
  const truncated = result?.truncated === true;
  const items = hidePublicTestData(result?.items ?? []) as unknown as ProductItem[];
  const countLabel = truncated ? `${items.length}+` : String(total);

  const others = MEETUP_CITIES.filter((c) => c.slug !== city.slug);

  return (
    <Div>
      <Section className={THEMED_BG_PRIMARY} padding="y-2xl">
        <Div className={page.container.lg}>
          <Heading level={1} size="3xl" mdSize="4xl" weight="bold" className="mb-3">
            {`Collectibles for sale in ${city.city}`}
          </Heading>
          <Text size="lg" color="muted" className="max-w-3xl">
            {`Classified listings where the seller meets buyers in ${city.city}, ${city.state} — pay in person, inspect before you buy, no shipping involved.`}
          </Text>
        </Div>
      </Section>

      <Section padding="y-xl">
        <Div className={page.container.lg}>
          {items.length > 0 ? (
            <>
              <Row align="center" justify="between" wrap className="mb-4">
                <Heading level={2} size="xl" weight="semibold">
                  {`${countLabel} listing${items.length === 1 ? "" : "s"} in ${city.city}`}
                </Heading>
                <TextLink href={String(ROUTES.PUBLIC.CLASSIFIED)}>
                  All classifieds
                </TextLink>
              </Row>
              <ProductGrid products={items} />
            </>
          ) : (
            /*
             * 🛑 Says what is true. A city page with no listings is a normal
             * state for a local marketplace — the dishonest version is an empty
             * grid under a confident headline, which reads as a broken page and
             * is also the doorway pattern this page type is penalised for.
             */
            <Alert variant="info">
              <Text weight="semibold">{`Nobody is selling in ${city.city} right now`}</Text>
              <Text size="sm">
                {`Classified listings come and go quickly — this page lists them whenever a seller names ${city.city} as their meet-up point. In the meantime, everything on ${getBrandName()} ships nationwide.`}
              </Text>
              <Row gap="md" wrap className="mt-3">
                <TextLink href={String(ROUTES.PUBLIC.PRODUCTS)}>Browse everything</TextLink>
                <TextLink href={String(ROUTES.PUBLIC.CLASSIFIED)}>All classifieds</TextLink>
              </Row>
            </Alert>
          )}
        </Div>
      </Section>

      <Section padding="y-xl">
        <Div className={page.container.lg}>
          <Stack gap="md">
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={2} size="lg" weight="semibold" className="mb-2">
                {`Meeting a seller in ${city.city}`}
              </Heading>
              <Text color="muted">
                Meet somewhere public and busy, in daylight. Bring the exact
                amount if you are paying cash, and check the item against its
                listing photos before you hand anything over — a classified sale
                is between you and the seller, so {getBrandName()}&apos;s buyer
                protection does not cover a cash handover.
              </Text>
              <Row gap="md" wrap className="mt-3">
                <TextLink href={String(ROUTES.PUBLIC.SPOT_A_FAKE)}>
                  How to spot a fake
                </TextLink>
                <TextLink href={String(ROUTES.PUBLIC.SCAMS)}>Scam registry</TextLink>
              </Row>
            </Div>
          </Stack>

          <Heading level={2} size="lg" weight="semibold" className="mt-8 mb-3">
            Other cities
          </Heading>
          <Grid cols="navTiles" gap="sm">
            {others.map((c) => (
              <TextLink key={c.slug} href={String(ROUTES.PUBLIC.CITY_COLLECTIBLES(c.slug))}>
                {c.city}
              </TextLink>
            ))}
          </Grid>
        </Div>
      </Section>
    </Div>
  );
}
