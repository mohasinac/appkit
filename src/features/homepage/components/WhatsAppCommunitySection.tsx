import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Grid, Heading, Section, Span, Text } from "../../../ui";
import { MessageCircle } from "lucide-react";
import { getDefaultLocale } from "../../../core/baseline-resolver";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhatsAppCommunitySectionProps {
  title: string;
  /** HTML string for the description (safe server-rendered HTML). */
  descriptionHtml?: string;
  memberCount?: number;
  memberCountLabel?: string;
  testimonial?: string;
  benefits?: string[];
  buttonText?: string;
  groupLink?: string;
  isLoading?: boolean;
  className?: string;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function WhatsAppCommunitySection({
  title,
  descriptionHtml,
  memberCount,
  memberCountLabel = "members",
  testimonial,
  benefits = [],
  buttonText = "Join our WhatsApp community",
  groupLink,
  isLoading = false,
  className = "",
}: WhatsAppCommunitySectionProps) {
  const { themed, flex } = THEME_CONSTANTS;

  if (isLoading) {
    return (
      <Section className={`p-8 ${themed.bgSecondary} ${className}`}>
        <div className="w-full max-w-7xl mx-auto">
          <div className="h-80 bg-zinc-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        </div>
      </Section>
    );
  }

  if (!title && !groupLink) return null;

  const handleJoin = () => {
    if (groupLink) window.open(groupLink, "_blank");
  };

  return (
    <Section className={`p-8 ${themed.bgSecondary} ${className}`}>
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-green-700 to-green-800 dark:from-emerald-800 dark:to-emerald-900 rounded-2xl p-8 text-white overflow-hidden relative">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10" aria-hidden>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="wa-dots"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="20" cy="20" r="2" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wa-dots)" />
            </svg>
          </div>

          <div className="relative z-10 text-center">
            {/* WhatsApp Icon */}
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6 mx-auto`}
            >
              <MessageCircle className="w-10 h-10 text-white" />
            </div>

            {/* Heading */}
            <Heading level={2} className="mb-3 text-white">
              {title}
            </Heading>

            {descriptionHtml && (
              <div
                className="text-lg md:text-xl mb-2 opacity-90 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}

            {/* Facepile + member counter */}
            {memberCount && (
              <div className={`${flex.center} gap-3 mb-4`}>
                <div className="flex -space-x-2">
                  {["A", "R", "S", "M", "P"].map((initial, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full border-2 border-white bg-green-700 ${flex.center} text-white text-xs font-bold`}
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <Text variant="none" className="text-white font-bold">
                  <Span className="text-xl font-extrabold">
                    {memberCount.toLocaleString(getDefaultLocale())}
                  </Span>{" "}
                  {memberCountLabel}
                </Text>
              </div>
            )}

            {/* Testimonial */}
            {testimonial && (
              <Text
                size="sm"
                variant="none"
                className="italic text-white/90 max-w-sm mx-auto mb-6"
              >
                &ldquo;{testimonial}&rdquo;
              </Text>
            )}

            {/* Benefits */}
            {benefits.length > 0 && (
              <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 max-w-2xl mx-auto my-8">
                {benefits.slice(0, 4).map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-left bg-white/10 backdrop-blur-sm p-4 rounded-lg"
                  >
                    <svg
                      className="w-6 h-6 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <Span className="text-sm md:text-base">{benefit}</Span>
                  </div>
                ))}
              </Grid>
            )}

            {/* CTA Button */}
            {groupLink && (
              <div className="relative inline-block">
                <div
                  className="absolute inset-0 rounded-full bg-lime-400/30 animate-pulse blur-md scale-110"
                  aria-hidden
                />
                <Button
                  variant="primary"
                  size="lg"
                  aria-label={buttonText}
                  onClick={handleJoin}
                  className="relative bg-white text-green-600 hover:bg-zinc-100 shadow-xl hover:shadow-2xl"
                >
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
