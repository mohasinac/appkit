import React from "react";
import { Card, Div, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
const __P = {
  p8: "p-8",
} as const;

export interface AboutHowItem {
  title: string;
  text: string;
  icon: string;
  tone?: "indigo" | "teal" | "amber" | "rose";
}

export interface AboutValueItem {
  title: string;
  text: string;
  icon: string;
}

export interface AboutMilestone {
  year: string;
  text: string;
}

export interface AboutViewProps {
  labels?: {
    title?: string;
    subtitle?: string;
    missionTitle?: string;
    missionText?: string;
    howItWorksTitle?: string;
    valuesTitle?: string;
    milestonesTitle?: string;
    ctaTitle?: string;
    ctaSell?: string;
    ctaShop?: string;
  };
  howItems?: AboutHowItem[];
  valueItems?: AboutValueItem[];
  milestones?: AboutMilestone[];
  ctaBannerClass?: string;
  /** Render the CTA action buttons  */
  renderCtaButtons?: () => React.ReactNode;
}

export function AboutView({
  labels = {},
  howItems = [],
  valueItems = [],
  milestones = [],
  ctaBannerClass = "",
  renderCtaButtons,
}: AboutViewProps) {
  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/* audit-variant-ok: responsive md:py-20 lg:py-24 override on y-4xl base; PADDING_MAP lacks responsive ladder past y-4xl */}
      <Section color="inverse" tone="accent-banner" className="md:py-20 lg:py-24" padding="y-4xl">
        <Div paddingX="x-page" className="max-w-4xl mx-auto text-center">
          <Heading color="inverse" level={1} variant="none" className="mb-6" mdSize="5xl" size="4xl" weight="bold">
            {labels.title}
          </Heading>
          <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto" size="xl">
            {labels.subtitle}
          </Text>
        </Div>
      </Section>

      {/* audit-variant-ok: page-wrapper Div — md:py-20 responsive override + space-y-{16,20} between sections (Div has no space-y variant) */}
      <Div paddingX="x-page" className="max-w-5xl mx-auto md:py-20 space-y-16 md:space-y-20" padding="y-4xl">
        <Section className="text-center max-w-3xl mx-auto">
          <Heading level={2} className="mb-4">{labels.missionTitle}</Heading>
          <Text size="lg" variant="secondary" className="leading-relaxed">
            {labels.missionText}
          </Text>
        </Section>

        <Section>
          <Heading level={2} className="mb-12" align="center">{labels.howItWorksTitle}</Heading>
          {/* audit-variant-ok: responsive grid — md:grid-cols-3 + responsive gap-{6,8}; Div lacks responsive grid layout variants */}
          <Div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {howItems.map(({ title, text, icon, tone }) => (
              <Card
                key={title}
                variant={`gradient-${tone ?? "indigo"}`}
                padding="md" spacing="sm">
                {/* audit-variant-ok: emoji icon — text-4xl typography scale on a Div container; Div lacks size variant */}
                <Div className="text-4xl">{icon}</Div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
              </Card>
            ))}
          </Div>
        </Section>

        <Section>
          <Heading level={2} className="mb-12" align="center">{labels.valuesTitle}</Heading>
          {/* audit-variant-ok: responsive grid — md:grid-cols-3 + responsive gap-{5,6}; Div lacks responsive grid layout variants */}
          <Div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {valueItems.map(({ title, text, icon }) => (
              <div
                key={title}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 space-y-3 border border-neutral-200 dark:border-slate-700"
              >
                {/* audit-variant-ok: emoji icon — text-3xl typography scale on a Div container; Div lacks size variant */}
                <Div className="text-3xl">{icon}</Div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
              </div>
            ))}
          </Div>
        </Section>

        <Section>
          <Heading level={2} className="mb-10" align="center">{labels.milestonesTitle}</Heading>
          {/* audit-variant-ok: timeline with left-only border-l-2 + pl-8; PADDING_MAP has no left-only token + Stack lacks left-border variant */}
          <Stack className="relative border-l-2 border-primary/30 pl-8 max-w-2xl mx-auto" gap="xl">
            {milestones.map(({ year, text }) => (
              <Div key={year} className="relative">
                <Div className="absolute -left-10 top-1 w-4 h-4 bg-primary border-2 border-white" rounded="full" />
                <Span size="xs" weight="bold" className="text-primary tracking-wide" transform="uppercase">
                  {year}
                </Span>
                <Text className="mt-1">{text}</Text>
              </Div>
            ))}
          </Stack>
        </Section>

        {/* audit-variant-ok: CTA banner — p-8 → md:p-12 responsive override on PADDING_MAP scale; dynamic ctaBannerClass slot */}
        <Section color="inverse" tone="accent-banner" className={`text-center ${ctaBannerClass} ${__P.p8} md:p-12`} rounded="2xl">
          <Heading color="inverse" level={2} variant="none" className="mb-8" size="3xl" weight="bold">
            {labels.ctaTitle}
          </Heading>
          {renderCtaButtons ? (
            renderCtaButtons()
          ) : (
            <Row justify="center" gap="3" wrap>
              <Span color="inverse" size="sm" className="/70">
                {labels.ctaSell} · {labels.ctaShop}
              </Span>
            </Row>
          )}
        </Section>
      </Div>
    </Div>
  );
}
