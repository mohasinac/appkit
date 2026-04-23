import { ReactNode } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Grid, Heading, Section, Span, Text } from "../../../ui";

// --- Types -------------------------------------------------------------------

export interface HowItWorksInfoStep {
  number: number;
  icon: string;
  title: string;
  text: string;
  /** Optional accent colour class for the step number badge, e.g. "bg-emerald-100 …" */
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
  /** Tailwind gradient class for the hero header, e.g. "bg-gradient-to-r from-cobalt-600 to-violet-700" */
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
  heroClass = "bg-gradient-to-br from-cobalt-700 via-cobalt-600 to-violet-700",
  stepsTitle,
  steps,
  detailsSectionTitle,
  details = [],
  renderDiagram,
  renderFooter,
  accentClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  className = "",
}: HowItWorksInfoViewProps) {
  const { themed, flex, spacing } = THEME_CONSTANTS;

  return (
    <div
      className={`-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10 ${className}`}
     data-section="howitworksinfoview-div-333">
      {/* Header */}
      <Section className={`${heroClass} text-white py-14 md:py-16 lg:py-20`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-section="howitworksinfoview-div-334">
          <Heading level={1} variant="none" className="mb-4 text-white">
            {title}
          </Heading>
          {subtitle && (
            <Text variant="none" className="text-white/80 max-w-2xl mx-auto">
              {subtitle}
            </Text>
          )}
        </div>
      </Section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 lg:py-16" data-section="howitworksinfoview-div-335">
        {/* Optional diagram slot */}
        {renderDiagram?.()}

        {/* Steps */}
        {stepsTitle && (
          <Heading level={2} className="mb-6">
            {stepsTitle}
          </Heading>
        )}

        <div className={`${spacing.stack} mb-14`} data-section="howitworksinfoview-div-336">
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
                className={`flex gap-4 items-start ${themed.bgSecondary} rounded-xl p-6 border ${themed.border}`}
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl ${stepAccent ?? accentClass} ${flex.center} text-sm font-bold`}
                 data-section="howitworksinfoview-div-337">
                  <Span className={textClass}>{number}</Span>
                </div>
                <div data-section="howitworksinfoview-div-338">
                  <Heading level={3} className="font-semibold mb-1">
                    {icon} {stepTitle}
                  </Heading>
                  <Text
                    variant="secondary"
                    size="sm"
                    className="leading-relaxed"
                  >
                    {text}
                  </Text>
                </div>
              </Section>
            ),
          )}
        </div>

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
                 data-section="howitworksinfoview-div-339">
                  <Heading level={3} className="font-semibold mb-2">
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
      </div>
    </div>
  );
}
