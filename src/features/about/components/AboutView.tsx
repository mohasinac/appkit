import React from "react";
import { Anchor, Avatar, Badge, Card, Div, Heading, Row, Section, Span, Stack, Text, TextLink } from "../../../ui";
import { ROUTES } from "../../../constants";
import type { AboutHowItem, AboutValueItem, AboutMilestone, AboutTeamMember } from "../schemas/firestore";

export type { AboutHowItem, AboutValueItem, AboutMilestone, AboutTeamMember } from "../schemas/firestore";

export interface AboutViewProps {
  labels?: {
    title?: string;
    subtitle?: string;
    missionTitle?: string;
    missionText?: string;
    howItWorksTitle?: string;
    valuesTitle?: string;
    valuesSubtitle?: string;
    /** When set, renders a link from the values section through to `/ethics`. */
    valuesLinkLabel?: string;
    milestonesTitle?: string;
    teamTitle?: string;
    teamSubtitle?: string;
    ctaTitle?: string;
    ctaSell?: string;
    ctaShop?: string;
  };
  howItems?: AboutHowItem[];
  valueItems?: AboutValueItem[];
  milestones?: AboutMilestone[];
  teamMembers?: AboutTeamMember[];
  ctaBannerClass?: string;
  /** Render the CTA action buttons  */
  renderCtaButtons?: () => React.ReactNode;
}

export function AboutView({
  labels = {},
  howItems = [],
  valueItems = [],
  milestones = [],
  teamMembers = [],
  ctaBannerClass = "",
  renderCtaButtons,
}: AboutViewProps) {
  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section color="inverse" tone="accent-banner" padding="y-4xl">
        <Div paddingX="x-page" className="max-w-4xl mx-auto text-center">
          <Heading color="inverse" level={1} variant="none" className="mb-6" mdSize="5xl" size="4xl" weight="bold">
            {labels.title}
          </Heading>
          <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto" size="xl">
            {labels.subtitle}
          </Text>
        </Div>
      </Section>

      <Div paddingX="x-page" className="max-w-5xl mx-auto" padding="y-4xl">
        <Section className="text-center max-w-3xl mx-auto">
          <Heading level={2} className="mb-4">{labels.missionTitle}</Heading>
          <Text size="lg" variant="secondary" className="leading-relaxed">
            {labels.missionText}
          </Text>
        </Section>

        <Section>
          <Heading level={2} className="mb-12" align="center">{labels.howItWorksTitle}</Heading>
          <Div className="grid md:grid-cols-3" gap="6">
            {howItems.map(({ title, text, icon, tone }) => (
              <Card
                key={title}
                variant={`gradient-${tone ?? "indigo"}`}
                padding="md" spacing="sm">
                <Div><Span size="4xl">{icon}</Span></Div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
              </Card>
            ))}
          </Div>
        </Section>

        <Section>
          <Heading level={2} className={labels.valuesSubtitle ? "mb-3" : "mb-12"} align="center">
            {labels.valuesTitle}
          </Heading>
          {labels.valuesSubtitle && (
            <Text
              size="base"
              variant="secondary"
              align="center"
              className="mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {labels.valuesSubtitle}
            </Text>
          )}
          <Div className="grid md:grid-cols-3" gap="5">
            {valueItems.map(({ title, text, icon, detail }) => (
              <Stack
                key={title}
                gap="3"
                surface="default"
                padding="lg"
                rounded="xl"
                border="default"
              >
                <Div><Span size="3xl">{icon}</Span></Div>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" variant="secondary" className="leading-relaxed">
                  {text}
                </Text>
                {detail && (
                  <Text size="sm" color="muted" className="leading-relaxed">
                    {detail}
                  </Text>
                )}
              </Stack>
            ))}
          </Div>
          {/* Values state the position; /ethics is where it is spelled out and held to. */}
          {labels.valuesLinkLabel && (
            <Div className="mt-8 text-center">
              <TextLink href={String(ROUTES.PUBLIC.ETHICS)} size="sm">
                {labels.valuesLinkLabel}
              </TextLink>
            </Div>
          )}
        </Section>

        <Section>
          <Heading level={2} className="mb-10" align="center">{labels.milestonesTitle}</Heading>
          <Stack className="relative border-l-2 border-primary/30 max-w-2xl mx-auto pl-[2rem]" gap="xl">
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

        {teamMembers.length > 0 && (
          <Section>
            <Heading level={2} className="mb-2" align="center">{labels.teamTitle}</Heading>
            {labels.teamSubtitle && (
              <Text size="lg" variant="secondary" align="center" className="mb-12 max-w-2xl mx-auto">
                {labels.teamSubtitle}
              </Text>
            )}
            <Div className="grid md:grid-cols-3" gap="6">
              {teamMembers.map((member) => (
                <Stack key={member.name} gap="3" surface="default" padding="lg" rounded="xl" border="default" align="center" className="text-center">
                  <Avatar src={member.photoUrl} name={member.name} alt={member.name} size="lg" />
                  <Heading level={3}>{member.name}</Heading>
                  <Row gap="xs" wrap justify="center">
                    <Span size="xs" weight="bold" className="text-primary tracking-wide" transform="uppercase">
                      {member.role}
                    </Span>
                    {member.isFounder && <Badge variant="primary" size="xs">Founder</Badge>}
                    {member.isDeveloper && <Badge variant="secondary" size="xs">Developer</Badge>}
                  </Row>
                  <Text size="sm" variant="secondary" className="leading-relaxed">
                    {member.bio}
                  </Text>
                  {member.githubUrl && (
                    <Anchor href={member.githubUrl} tone="muted" size="sm" underline="hover">
                      GitHub ↗
                    </Anchor>
                  )}
                </Stack>
              ))}
            </Div>
          </Section>
        )}

        <Section color="inverse" tone="accent-banner" className={`text-center ${ctaBannerClass}`} padding="xl" rounded="2xl">
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
