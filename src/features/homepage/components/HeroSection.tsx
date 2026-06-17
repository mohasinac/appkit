import { Button, Div, Heading, Section, Text } from "../../../ui";
import type { HomepageSection } from "../types";

interface HeroSectionProps {
  section: HomepageSection;
  onCtaClick?: () => void;
}

export function HeroSection({ section, onCtaClick }: HeroSectionProps) {
  const { content } = section;
  return (
    // audit-variant-ok: hero section — min-h-[60vh] custom + bg-neutral-900 dark surface (Section.tone lacks hero-dark variant); flex+items-center handled by layout/align
    <Section layout="flex" align="center"
      className="relative min-h-[60vh] overflow-hidden bg-neutral-900"
      style={
        content?.imageUrl
          ? {
              backgroundImage: `url(${content.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <Div surface="overlay-xs" className="absolute inset-0" />
      <Div paddingX="x-page" className="relative mx-auto max-w-7xl text-center text-white" padding="y-4xl">
        {content?.title && (
          <Heading
            level={1}
            className="leading-tight" smSize="5xl" size="4xl" lgSize="6xl" weight="bold"
          >
            {content.title}
          </Heading>
        )}
        {content?.subtitle && (
          <Text className="mx-auto mt-4 max-w-2xl opacity-90" size="lg">
            {content.subtitle}
          </Text>
        )}
        {content?.ctaLabel && (
          // audit-variant-ok: hero CTA Button — bespoke white-on-dark CTA + zinc-900 text + hover-neutral; Button.variant lacks light-tone-on-dark
          <Button rounded="full"
            onClick={onCtaClick}
            paddingX="xl" paddingY="md" textSize="sm" weight="semibold"
            className="mt-8 inline-block bg-white text-zinc-900 dark:text-zinc-100 transition hover:bg-neutral-100 dark:bg-neutral-800"
          >
            {content.ctaLabel}
          </Button>
        )}
      </Div>
    </Section>
  );
}
