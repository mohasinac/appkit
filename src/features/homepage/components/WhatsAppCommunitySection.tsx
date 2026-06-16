"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Blockquote, Button, Div, Heading, RichText, Row, Section, Span, Text } from "../../../ui";
import { Users } from "lucide-react";
import { getDefaultLocale } from "../../../core/baseline-resolver";

// --- Types -------------------------------------------------------------------

export interface WhatsAppCommunitySectionProps {
  title: string;
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

// --- Section -----------------------------------------------------------------

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
      <Section className={`px-4 sm:px-8 ${className}`} surface="subtle" padding="y-4xl">
        <Div className="w-full max-w-7xl mx-auto">
          <Div className="h-72 animate-pulse" surface="subtle" rounded="2xl" />
        </Div>
      </Section>
    );
  }

  if (!title && !groupLink) return null;

  const handleJoin = () => {
    if (groupLink) window.open(groupLink, "_blank");
  };

  return (
    <Section className={`px-4 sm:px-8 ${className}`} surface="subtle" padding="y-4xl">
      <Div className="w-full max-w-7xl mx-auto">

        {/* Card */}
        <Section
          tone="accent-banner"
          rounded="2xl"
          shadow="lg"
          className="relative overflow-hidden text-white"
        >
          {/* Subtle diagonal-line texture for depth */}
          <Div
            className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[repeating-linear-gradient(45deg,white_0,white_1px,transparent_0,transparent_50%)] bg-[size:10px_10px]"
            aria-hidden
          />

          <Div className="relative z-10 px-6 sm:px-10 sm:py-12" padding="y-2xl">

            {/* Top row — WhatsApp icon + member pill */}
            <Div className={`${flex.between} flex-wrap gap-4 mb-8`}>
              {/* WhatsApp branded icon */}
              <Row align="center" gap="3">
                <Row className="w-12 h-12 bg-[#25D366] flex-shrink-0" align="center" justify="center" rounded="xl" shadow="lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </Row>
                <Span color="inverse" size="sm" weight="medium" className="/80 tracking-wide" transform="uppercase">
                  WhatsApp Community
                </Span>
              </Row>

              {/* Member count pill */}
              {memberCount && (
                <Row className="backdrop-blur-sm py-1.5" surface="default" padding="x-md" align="center" gap="sm" rounded="full">
                  <Users className="w-4 h-4 text-white/80" />
                  <Span color="inverse" size="sm" weight="semibold">
                    {memberCount.toLocaleString(getDefaultLocale())}+ {memberCountLabel}
                  </Span>
                </Row>
              )}
            </Div>

            {/* Heading + description */}
            <Heading color="inverse" level={2} className="mb-3 leading-tight" smSize="3xl" size="2xl" weight="bold">
              {title}
            </Heading>

            {descriptionHtml && (
              <RichText
                html={descriptionHtml}
                proseClass="prose prose-sm max-w-none prose-invert"
                className="text-white/80 text-base mb-6 max-w-2xl leading-relaxed"
              />
            )}

            {/* Benefits grid */}
            {benefits.length > 0 && (
              <Div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-2xl">
                {benefits.slice(0, 4).map((benefit, i) => (
                  <Row key={i} align="start" gap="2.5">
                    <Span className="mt-0.5 flex-shrink-0 w-5 h-5 bg-white/20 flex items-center justify-center" rounded="full">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Span>
                    <Span color="inverse" size="sm" className="/90 leading-snug">{benefit}</Span>
                  </Row>
                ))}
              </Div>
            )}

            {/* Testimonial */}
            {testimonial && (
              <Blockquote className="border-l-2 border-white/30 pl-4 mb-8 max-w-xl">
                <Text color="inverse" variant="none" className="/75 italic leading-relaxed" size="sm">
                  &ldquo;{testimonial}&rdquo;
                </Text>
              </Blockquote>
            )}

            {/* CTA */}
            {groupLink && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleJoin}
                aria-label={buttonText}
                className="!bg-[#25D366] hover:!bg-[#1ebe5d] !text-white !border-0 shadow-lg font-semibold gap-2.5"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {buttonText}
              </Button>
            )}
          </Div>
        </Section>

      </Div>
    </Section>
  );
}
