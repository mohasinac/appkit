import { ReactNode } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Grid, Heading, Row, Section, Span, Text } from "../../../ui";

// --- Types -------------------------------------------------------------------

export interface HowItWorksInfoStep {
  number: number;
  icon: string;
  title: string;
  text: string;
  /** Optional accent colour class for the step number badge, e.g. "bg-success-surface …" */
  accentClass?: string;
  /** Optional text colour class for the number */
  textClass?: string;
}

export interface HowItWorksInfoDetail {
  title: string;
  text: string;
}

export interface HowItWorksInfoViewProps {
  /** Page hero heading */
  title: string;
  subtitle?: string;
  /** Extra className for the hero <Section>. The themed brand-banner gradient is applied automatically via tone="accent-banner". */
  heroClass?: string;
  /** Step-by-step section heading */
  stepsTitle?: string;
  steps: HowItWorksInfoStep[];
  /** "Important things to know" or similar detail cards below the steps */
  detailsSectionTitle?: string;
  details?: HowItWorksInfoDetail[];
  /** Optional: render the flow/status diagram above the steps list */
  renderDiagram?: () => ReactNode;
  /** Optional extra content at the bottom (CTAs, links, etc.) */
  renderFooter?: () => ReactNode;
  /** Accent colour for the step number badges (default: cobalt/blue) */
  accentClass?: string;
  className?: string;
}

// --- View ---------------------------------------------------------------------

export function HowItWorksInfoView({
  title,
  subtitle,
  heroClass = "",
  stepsTitle,
  steps,
  detailsSectionTitle,
  details = [],
  renderDiagram,
  renderFooter,
  accentClass = "bg-info-surface dark:bg-info-surface text-info dark:text-info",
  className = "",
}: HowItWorksInfoViewProps) {
  const { themed, flex, spacing } = THEME_CONSTANTS;

  return (
    <Div
      className={`-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10 ${className}`}
    >
      {/* Header */}
      <Section color="inverse" tone="accent-banner" className={`${heroClass} md:py-16 lg:py-20`} padding="y-2-5xl">
        <Div className="max-w-4xl mx-auto sm:px-6 lg:px-8 text-center" padding="x-md">
          <Heading color="inverse" level={1} variant="none" className="mb-4">
            {title}
          </Heading>
          {subtitle && (
            <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto">
              {subtitle}
            </Text>
          )}
        </Div>
      </Section>

      <Div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 md:py-12 lg:py-16" padding="y-2xl">
        {/* Optional diagram slot */}
        {renderDiagram?.()}

        {/* Steps */}
        {stepsTitle && (
          <Heading level={2} className="mb-6">
            {stepsTitle}
          </Heading>
        )}

        <Div className={`${spacing.stack} mb-14`}>
          {steps.map(
            ({
              number,
              icon,
              title: stepTitle,
              text,
              accentClass: stepAccent,
              textClass,
            }) => (
              <Section
                key={number}
                className={`flex gap-4 items-start`} border="default" surface="subtle" rounded="xl" padding="lg"
              >
                <Row textWeight="bold" align="center" justify="center" textSize="sm" 
                  className={`shrink-0 w-10 h-10 ${stepAccent ?? accentClass}`} rounded="xl"
                >
                  <Span className={textClass}>{number}</Span>
                </Row>
                <Div>
                  <Heading level={3} className="mb-1" weight="semibold">
                    {icon} {stepTitle}
                  </Heading>
                  <Text
                    variant="secondary"
                    size="sm"
                    className="leading-relaxed"
                  >
                    {text}
                  </Text>
                </Div>
              </Section>
            ),
          )}
        </Div>

        {/* Detail cards */}
        {details.length > 0 && (
          <>
            {detailsSectionTitle && (
              <Heading level={2} className="mb-6">
                {detailsSectionTitle}
              </Heading>
            )}
            <Grid className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 mb-12">
              {details.map(({ title: dt, text: dx }) => (
                <div
                  key={dt}
                  className={`${themed.bgSecondary} border ${themed.border} rounded-xl p-5`}
                >
                  <Heading level={3} className="mb-2" weight="semibold">
                    {dt}
                  </Heading>
                  <Text
                    variant="secondary"
                    size="sm"
                    className="leading-relaxed"
                  >
                    {dx}
                  </Text>
                </div>
              ))}
            </Grid>
          </>
        )}

        {/* Footer slot (CTAs, links) */}
        {renderFooter?.()}
      </Div>
    </Div>
  );
}
