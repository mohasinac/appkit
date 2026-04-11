"use client";

import React from "react";
import { Heading, Section, Text, TextLink } from "@mohasinac/ui";
import { Mail } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsletterSectionProps {
  title: string;
  subtitle?: string;
  privacyLabel?: string;
  privacyHref?: string;
  renderForm: () => React.ReactNode;
  className?: string;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function NewsletterSection({
  title,
  subtitle,
  privacyLabel,
  privacyHref,
  renderForm,
  className = "",
}: NewsletterSectionProps) {
  return (
    <Section className={`py-16 px-4 relative overflow-hidden ${className}`}>
      {/* Gradient background layer */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cobalt/5 to-secondary/10 dark:from-primary/15 dark:via-cobalt/10 dark:to-secondary/15 pointer-events-none"
        aria-hidden
      />
      {/* Decorative circles */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 dark:bg-primary/10 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-cobalt/5 dark:bg-cobalt/10 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Icon badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 mb-5 mx-auto">
          <Mail className="w-7 h-7 text-primary" />
        </div>

        <Heading
          level={2}
          className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3"
        >
          {title}
        </Heading>
        {subtitle && (
          <Text
            size="base"
            className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto"
          >
            {subtitle}
          </Text>
        )}

        {/* Form slot */}
        {renderForm()}

        {/* Privacy */}
        {privacyLabel && privacyHref && (
          <Text size="xs" className="text-zinc-400 dark:text-zinc-500 mt-4">
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
      </div>
    </Section>
  );
}
