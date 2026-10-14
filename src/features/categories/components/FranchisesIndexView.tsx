import { listActiveFranchises } from "../../../_internal/server/features/franchises/data";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { Container, Grid } from "../../../ui/components/Layout";
import { Main, Section } from "../../../ui/components/Semantic";
import { Heading, Text } from "../../../ui/components/Typography";
import { Div } from "../../../ui/components/Div";
import { TextLink } from "../../../ui/components/TextLink";
import { MediaImage } from "../../media/MediaImage";
import { Alert } from "../../../ui/components/Alert";
import { ROUTES } from "../../../next/routing/route-map";
import type { CategoryDocument } from "../schemas";

/**
 * The FRANCHISE index — the IPs we carry.
 *
 * 🛑 ACTIVE ONLY, and that is the dead-facet guard. `brand-rows.ts` trap 3:
 * "a row with no product is a DEAD FACET, and worse than absent — it renders
 * as a card in the grid that opens an empty page." Seven of the eight seeded
 * franchises have no stock yet; they stay out of here until one flag flips,
 * while their detail pages still resolve for the links that point at them.
 *
 * @tag domain:categories
 * @tag layer:view
 * @tag access:server-only
 */
export async function FranchisesIndexView() {
  const franchises = await safeRead(() => listActiveFranchises().then(hidePublicTestData), {
    route: "/franchise",
    key: "franchises.list",
    fallback: null,
  });

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-2" color="primary" size="3xl" weight="semibold">
            Franchises
          </Heading>
          <Text color="muted" className="mb-8">
            The universes we stock. A franchise is what a collectible is from — a brand
            is who made it.
          </Text>

          {/* A read failure must not render as "we carry nothing". */}
          {franchises === null ? (
            <Alert variant="warning">
              We could not load the franchise list just now. Please try again.
            </Alert>
          ) : franchises.length === 0 ? (
            <Alert variant="info">No franchises are live yet.</Alert>
          ) : (
            <Grid cols="cards" gap="comfortable">
              {(franchises as CategoryDocument[]).map((f) => (
                <TextLink
                  key={f.id}
                  href={ROUTES.PUBLIC.FRANCHISE_DETAIL(String(f.slug ?? f.id))}
                >
                  <Div surface="card" padding="card" rounded="lg" border="default">
                    {f.display?.coverImage ? (
                      <MediaImage
                        src={f.display.coverImage}
                        alt={f.name ?? ""}
                        size="card"
                        rounded="md"
                        className="mb-3"
                      />
                    ) : null}
                    <Heading level={2} size="lg" weight="semibold">
                      {f.name}
                    </Heading>
                    {f.description ? (
                      <Text color="muted" size="sm" className="mt-1" truncate={2}>
                        {f.description}
                      </Text>
                    ) : null}
                  </Div>
                </TextLink>
              ))}
            </Grid>
          )}
        </Container>
      </Section>
    </Main>
  );
}
