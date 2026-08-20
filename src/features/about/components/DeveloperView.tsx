import { normalizeError } from "../../../errors/normalize";
import { Anchor, Avatar, Badge, Div, Heading, Row, Section, Span, Stack, Text, TextLink } from "../../../ui";
import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { siteSettingsRepository } from "../../../repositories";
import type { AboutTeamMember, AboutMilestone } from "../schemas/firestore";

export interface DeveloperViewProps {
  labels?: {
    title?: string;
    subtitle?: string;
    journeyTitle?: string;
    backToTeam?: string;
    empty?: string;
  };
}

/**
 * Reuses the existing `siteSettings.aboutContent.teamMembers` /
 * `.milestones` data (already admin-editable via Site Settings → About) —
 * filtered to `isDeveloper` members — rather than inventing a separate
 * content model just for this page. See CLAUDE.md's About-family notes.
 */
export async function DeveloperView({ labels = {} }: DeveloperViewProps) {
  const page = { container: PAGE_CONTAINER };

  let teamMembers: AboutTeamMember[] = [];
  let milestones: AboutMilestone[] = [];
  try {
    const settings = await siteSettingsRepository.getSingleton();
    const aboutContent = (settings as { aboutContent?: { teamMembers?: AboutTeamMember[]; milestones?: AboutMilestone[] } })?.aboutContent ?? {};
    teamMembers = Array.isArray(aboutContent.teamMembers) ? aboutContent.teamMembers : [];
    milestones = Array.isArray(aboutContent.milestones) ? aboutContent.milestones : [];
  } catch (_err) {
    void normalizeError(_err);
    // Firestore unavailable — render the empty state below rather than crash.
  }

  const developers = teamMembers.filter((m) => m.isDeveloper);

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section color="inverse" tone="accent-banner" padding="banner">
        <Div className={`${page.container.sm}`}>
          <Heading color="inverse" level={1} variant="none" className="mb-3">
            {labels.title ?? "Meet the Developer"}
          </Heading>
          <Text color="inverse" variant="none" className="/80" size="sm">
            {labels.subtitle ?? "The person building LetItRip, one feature at a time."}
          </Text>
        </Div>
      </Section>

      <Div className={`${page.container.sm}`} padding="content-banner">
        {developers.length === 0 ? (
          <Text variant="secondary">{labels.empty ?? "Developer profile coming soon."}</Text>
        ) : (
          <Stack gap="xl">
            {developers.map((dev) => (
              <Stack key={dev.name} gap="md" surface="default" padding="lg" rounded="xl" border="default">
                <Row gap="md" align="center">
                  <Avatar src={dev.photoUrl} name={dev.name} alt={dev.name} size="lg" />
                  <Stack gap="xs">
                    <Heading level={2}>{dev.name}</Heading>
                    <Row gap="xs" wrap>
                      <Span size="xs" weight="bold" className="text-primary tracking-wide" transform="uppercase">
                        {dev.role}
                      </Span>
                      {dev.isFounder && <Badge variant="primary" size="xs">Founder</Badge>}
                      <Badge variant="secondary" size="xs">Developer</Badge>
                    </Row>
                  </Stack>
                </Row>
                <Text variant="secondary" className="leading-relaxed">
                  {dev.bio}
                </Text>
                {dev.githubUrl && (
                  <Anchor href={dev.githubUrl} tone="brand" size="sm" underline="hover">
                    GitHub ↗
                  </Anchor>
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {milestones.length > 0 && (
          <Div className="mt-14 border-t" border="default" padding="t-xl">
            <Heading level={3} className="mb-6" color="muted" size="sm" weight="semibold" transform="uppercase">
              {labels.journeyTitle ?? "The Journey"}
            </Heading>
            <Stack className="relative border-l-2 border-primary/30 max-w-2xl pl-[2rem]" gap="lg">
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
          </Div>
        )}

        <Div className="mt-10">
          <TextLink href={String(ROUTES.PUBLIC.ABOUT)} variant="muted" size="sm">
            {labels.backToTeam ?? "← Meet the whole team"}
          </TextLink>
        </Div>
      </Div>
    </Div>
  );
}
