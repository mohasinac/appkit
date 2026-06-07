import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Grid, Row, Section, Stack } from "../../../ui";

const __O = {
  hidden: "overflow-hidden",
} as const;

/** Full-page skeleton shown while homepage data loads. */
export function HomepageSkeleton() {
  const { skeleton, flex, themed } = THEME_CONSTANTS;

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
      <Section className={`p-8 ${themed.bgPrimary}`}>
        <Grid className="grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Div
              key={i}
              className={`${skeleton.card} flex flex-col items-center gap-3 p-6 ${trustCardH}`}
            />
          ))}
        </Grid>
      </Section>

      {/* Top Categories skeleton — 6 tiles */}
      <Section className={`p-8 ${themed.bgSecondary}`}>
        <Div className={`${skeleton.heading} w-48 mx-auto mb-6`} />
        <Grid className="grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Div key={i} className={`${skeleton.card} ${categoryTileH}`} />
          ))}
        </Grid>
      </Section>

      {/* Featured Products skeleton — 5 cards */}
      <Section className={`p-8 ${themed.bgPrimary}`}>
        <Row className={`${flex.between} mb-6`}>
          <Div className={`${skeleton.heading} w-52`} />
          <Div className={`${skeleton.text} w-24`} />
        </Row>
        <Grid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
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
      <Section className={`p-8 ${themed.bgSecondary}`}>
        <Row className={`${flex.between} mb-6`}>
          <Div className={`${skeleton.heading} w-56`} />
          <Div className={`${skeleton.text} w-24`} />
        </Row>
        <Grid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
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
      <Section className={`p-8 ${themed.bgPrimary}`}>
        <Div
          className={`${skeleton.card} rounded-2xl max-w-2xl mx-auto ${newsletterH}`}
        />
      </Section>
    </Div>
  );
}
