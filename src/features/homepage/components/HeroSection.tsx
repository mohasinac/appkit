import { Button, Div, Heading, Section, Text } from "../../../ui";
import type { HomepageSection } from "../types";

interface HeroSectionProps {
  section: HomepageSection;
  onCtaClick?: () => void;
}

export function HeroSection({ section, onCtaClick }: HeroSectionProps) {
  const { content } = section;
  return (
    <Section
      className="relative flex min-h-[60vh] items-center overflow-hidden bg-neutral-900"
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
      <Div className="relative mx-auto max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8" padding="y-4xl">
        {content?.title && (
          <Heading
            level={1}
            className="leading-tight lg:text-6xl" smSize="5xl" size="4xl" weight="bold"
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
          <Button rounded="full" 
            onClick={onCtaClick}
            className="mt-8 inline-block bg-white px-8 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition hover:bg-neutral-100"
          >
            {content.ctaLabel}
          </Button>
        )}
      </Div>
    </Section>
  );
}
