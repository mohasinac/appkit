import React from "react";
import { Heading, Section, Span, Text } from "../../../ui";

export interface AboutHowItem {
  title: string;
  text: string;
  icon: string;
  color?: string;
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
  labels: {
    title: string;
    subtitle: string;
    missionTitle: string;
    missionText: string;
    howItWorksTitle: string;
    valuesTitle: string;
    milestonesTitle: string;
    ctaTitle: string;
    ctaSell: string;
    ctaShop: string;
  };
  howItems: AboutHowItem[];
  valueItems: AboutValueItem[];
  milestones: AboutMilestone[];
  heroBannerClass?: string;
  ctaBannerClass?: string;
  /** Render the CTA action buttons  */
  renderCtaButtons?: () => React.ReactNode;
}

export function AboutView({
  labels,
  howItems,
  valueItems,
  milestones,
  heroBannerClass = "bg-gradient-to-br from-violet-600 to-indigo-600",
  ctaBannerClass = "bg-gradient-to-br from-violet-600 to-indigo-600",
  renderCtaButtons,
}: AboutViewProps) {
  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section className={`${heroBannerClass} text-white py-16 md:py-20 lg:py-24`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heading level={1} variant="none" className="text-4xl md:text-5xl font-bold mb-6 text-white">
            {labels.title}
          </Heading>
          <Text variant="none" className="text-xl text-white/80 max-w-2xl mx-auto">
            {labels.subtitle}
          </Text>
        </div>
      </Section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 space-y-16 md:space-y-20">
        <Section className="text-center max-w-3xl mx-auto">
          <Heading level={2} className="mb-4">{labels.missionTitle}</Heading>
          <Text size="lg" variant="secondary" className="leading-relaxed">
            {labels.missionText}
          </Text>
        </Section>

        <Section>
          <Heading level={2} className="text-center mb-12">{labels.howItWorksTitle}</Heading>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {howItems.map(({ title, text, icon, color }) => (
              <div
                key={title}
                className={`bg-gradient-to-br ${color ?? "from-primary/5 to-primary/5"} rounded-2xl p-6 space-y-3`}
              >
                <div className="text-4xl">{icon}</div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <Heading level={2} className="text-center mb-12">{labels.valuesTitle}</Heading>
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {valueItems.map(({ title, text, icon }) => (
              <div
                key={title}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 space-y-3 border border-neutral-200 dark:border-slate-700"
              >
                <div className="text-3xl">{icon}</div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <Heading level={2} className="text-center mb-10">{labels.milestonesTitle}</Heading>
          <div className="relative border-l-2 border-primary/30 pl-8 space-y-8 max-w-2xl mx-auto">
            {milestones.map(({ year, text }) => (
              <div key={year} className="relative">
                <div className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-primary border-2 border-white dark:border-slate-900" />
                <Span size="xs" weight="bold" className="text-primary uppercase tracking-wide">
                  {year}
                </Span>
                <Text className="mt-1">{text}</Text>
              </div>
            ))}
          </div>
        </Section>

        <Section className={`text-center ${ctaBannerClass} rounded-2xl p-8 md:p-12 text-white`}>
          <Heading level={2} variant="none" className="text-3xl font-bold mb-8 text-white">
            {labels.ctaTitle}
          </Heading>
          {renderCtaButtons ? (
            renderCtaButtons()
          ) : (
            <div className="flex justify-center gap-3 flex-wrap">
              <Span className="text-white/70 text-sm">
                {labels.ctaSell} · {labels.ctaShop}
              </Span>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
