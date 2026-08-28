import { FLEX_BETWEEN } from "../../../_internal/shared/styles/themed";
import { SKELETON } from "../../../_internal/shared/styles/skeleton";
import { Div, Grid, Row, Section, Stack } from "../../../ui";

const __P = {
  p8: "p-[var(--appkit-space-8)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

/** Full-page skeleton shown while homepage data loads. */
export function HomepageSkeleton() {
const flex = { between: FLEX_BETWEEN };
const skeleton = SKELETON;
// Hardcoded clamp values (extended THEME_CONSTANTS keys not in @mohasinac/tokens)
  const heroSkeletonH = "h-[clamp(420px,72vh,680px)]";
  const trustCardH = "h-[clamp(120px,18vh,170px)]";
  const categoryTileH = "h-[clamp(112px,16vh,160px)]";
  const newsletterH = "h-[clamp(220px,28vh,320px)]";

  return (
    <Div className={`w-full ${__O.hidden}`}>
      {/* Hero Carousel skeleton */}
      <Div
        className={`${skeleton.card} w-full ${heroSkeletonH}`}
        aria-hidden="true"
      />

      {/* Trust Features skeleton — 4 cards */}
      <Section className={`${__P.p8}`} surface="muted">
        <Grid cols="statTiles">
          {Array.from({ length: 4 }).map((_, i) => (
            <Stack
              key={i}
              className={`${skeleton.card} ${trustCardH}`} align="center" gap="3" padding="lg"
            />
          ))}
        </Grid>
      </Section>

      {/* Top Categories skeleton — 6 tiles */}
      <Section className={`${__P.p8}`} surface="subtle">
        <Div className={`${skeleton.heading} w-48 mx-auto mb-6`} />
        <Grid cols="statTiles">
          {Array.from({ length: 6 }).map((_, i) => (
            <Div key={i} className={`${skeleton.card} ${categoryTileH}`} />
          ))}
        </Grid>
      </Section>

      {/* Featured Products skeleton — 5 cards */}
      <Section className={`${__P.p8}`} surface="muted">
        <Row className={`${flex.between} mb-6`}>
          <Div className={`${skeleton.heading} w-52`} />
          <Div className={`${skeleton.text} w-24`} />
        </Row>
        <Grid cols="cards">
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack key={i} gap="xs">
              <Div className={`${skeleton.image} w-full pb-[100%]`} />
              <Div className={`${skeleton.text} w-3/4`} />
              <Div className={`${skeleton.text} w-1/2`} />
            </Stack>
          ))}
        </Grid>
      </Section>

      {/* Featured Auctions skeleton — 5 cards */}
      <Section className={`${__P.p8}`} surface="subtle">
        <Row className={`${flex.between} mb-6`}>
          <Div className={`${skeleton.heading} w-56`} />
          <Div className={`${skeleton.text} w-24`} />
        </Row>
        <Grid cols="cards">
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack key={i} gap="xs">
              <Div className={`${skeleton.image} w-full pb-[100%]`} />
              <Div className={`${skeleton.text} w-3/4`} />
              <Div className={`${skeleton.text} w-1/2`} />
            </Stack>
          ))}
        </Grid>
      </Section>

      {/* Newsletter skeleton */}
      <Section className={`${__P.p8}`} surface="muted">
        <Div
          className={`${skeleton.card} max-w-2xl mx-auto ${newsletterH}`} rounded="2xl"
        />
      </Section>
    </Div>
  );
}
