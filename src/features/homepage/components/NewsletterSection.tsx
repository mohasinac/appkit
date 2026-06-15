import React from "react";
import { Div, Heading, Section, Text, TextLink } from "../../../ui";
import { Mail } from "lucide-react";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface NewsletterSectionProps {
  title: string;
  subtitle?: string;
  privacyLabel?: string;
  privacyHref?: string;
  renderForm: () => React.ReactNode;
  className?: string;
}

// --- Section -----------------------------------------------------------------

export function NewsletterSection({
  title,
  subtitle,
  privacyLabel,
  privacyHref,
  renderForm,
  className = "",
}: NewsletterSectionProps) {
  return (
    <Section className={`py-16 px-4 relative ${__O.hidden} ${className}`}>
      {/* Gradient background layer */}
      <Div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cobalt/5 to-secondary/10 dark:from-primary/15 dark:via-cobalt/10 dark:to-secondary/15 pointer-events-none"
        aria-hidden
      />
      {/* Decorative circles */}
      <Div
        className="absolute -top-20 -right-20 w-80 h-80 bg-primary/5 dark:bg-primary/10 pointer-events-none" rounded="full"
        aria-hidden
      />
      <Div
        className="absolute -bottom-16 -left-16 w-64 h-64 bg-cobalt/5 dark:bg-cobalt/10 pointer-events-none" rounded="full"
        aria-hidden
      />

      <Div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Icon badge */}
        <Div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 dark:bg-primary/20 border border-primary/20 mb-5 mx-auto" rounded="2xl">
          <Mail className="w-7 h-7 text-primary" />
        </Div>

        <Heading
          level={2}
          className="sm:text-3xl mb-3" color="primary" size="2xl" weight="bold"
        >
          {title}
        </Heading>
        {subtitle && (
          <Text
            size="base"
            className="mb-8 max-w-md mx-auto" color="muted"
          >
            {subtitle}
          </Text>
        )}

        {/* Form slot */}
        {renderForm()}

        {/* Privacy */}
        {privacyLabel && privacyHref && (
          <Text size="xs" className="mt-4" color="faint">
            {privacyLabel}{" "}
            <TextLink
              href={privacyHref}
              className="underline underline-offset-2 hover:text-primary"
            >
              Privacy Policy
            </TextLink>
            .
          </Text>
        )}
      </Div>
    </Section>
  );
}
