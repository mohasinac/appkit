import React from "react";
import { Button, Div, Heading, Section, Text } from "@mohasinac/ui";
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
      <Div className="absolute inset-0 bg-black/40" />
      <Div className="relative mx-auto max-w-7xl px-4 py-16 text-center text-white sm:px-6 lg:px-8">
        {content?.title && (
          <Heading
            level={1}
            className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          >
            {content.title}
          </Heading>
        )}
        {content?.subtitle && (
          <Text className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
            {content.subtitle}
          </Text>
        )}
        {content?.ctaLabel && (
          <Button
            onClick={onCtaClick}
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            {content.ctaLabel}
          </Button>
        )}
      </Div>
    </Section>
  );
}
