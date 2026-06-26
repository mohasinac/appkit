"use client"
import React, { useState } from "react";
import {
  Button,
  Div,
  Heading,
  Section,
  Span,
  Text,
} from "../../../ui";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";

const CLS_ERROR_TEXT = "mt-3 text-sm text-error";

export interface NewsletterBannerProps {
  /**
   * Called when the user submits the form. Throw on failure — the component
   * will show a generic error message.
   */
  onSubscribe: (email: string) => Promise<void>;
  /** Eyebrow label. Default: "STAY CONNECTED". */
  eyebrow?: string;
  /** Section heading. Default: "Join Our Newsletter". */
  heading?: string;
  /** Sub-heading. Default: "Get exclusive offers, new arrivals and more." */
  subheading?: string;
  /** Email placeholder text. Default: "Enter your email". */
  placeholder?: string;
  /** CTA button label. Default: "Subscribe". */
  ctaLabel?: string;
  /** Success message shown after subscribe. Default: "You're in! Check your inbox." */
  successMessage?: string;
  /** Error message on failure. Default: "Something went wrong. Please try again." */
  errorMessage?: string;
}

export function NewsletterBanner({
  onSubscribe,
  eyebrow = "STAY CONNECTED",
  heading = "Join Our Newsletter",
  subheading = "Get exclusive offers, new arrivals and more.",
  placeholder = "Enter your email",
  ctaLabel = "Subscribe",
  successMessage = "You're in! Check your inbox.",
  errorMessage = "Something went wrong. Please try again.",
}: NewsletterBannerProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(false);
    try {
      await onSubscribe(email);
      setEmail("");
      setSuccess(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DynamicBgDiv
      background="var(--newsletter-bg, linear-gradient(135deg, var(--appkit-color-primary) 0%, var(--appkit-color-secondary) 100%))"
      className="py-24 relative overflow-hidden"
    >
      {/* Decorative rings */}
      <Div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 border border-white/[0.06]" rounded="full" />
      <Div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 border border-dashed border-white/[0.08]" rounded="full" />

      <Div className="relative mx-auto max-w-2xl text-center sm:px-[1.5rem]" padding="x-md">
        <Span color="inverse" size="xs" weight="semibold" className="mb-4 inline-flex border border-white/20 tracking-widest /70" rounded="full" padding="pill-md" transform="uppercase">
          {eyebrow}
        </Span>
        <Heading color="inverse" 
          level={2} smSize="4xl" size="3xl" weight="bold"
        >
          {heading}
        </Heading>
        <Text color="inverse" className="mt-4 /60">{subheading}</Text>

        {success ? (
          <Text paddingY="md" color="inverse" className="mt-8 border border-white/20 bg-[rgba(255,255,255,0.1)]" paddingX="x-lg" size="sm" weight="semibold" rounded="xl">
            {successMessage}
          </Text>
        ) : (
          <Form onSubmit={handleSubmit} className="mt-8 flex gap-[0.75rem]">
            <FieldInput
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={placeholder}
              required
              className="flex-1"
            />
            <Button rounded="xl"
              type="submit"
              disabled={loading}
              variant="primary"
              paddingX="lg" textSize="sm"
              className="shrink-0 py-[0.75rem] font-[700] transition-opacity disabled:opacity-60 bg-[var(--color-yellow)] text-black"
            >
              {loading ? "…" : ctaLabel}
            </Button>
          </Form>
        )}

        {error && (
          <Text className={CLS_ERROR_TEXT}>{errorMessage}</Text>
        )}

        <Text color="inverse" className="mt-4 /40" size="xs">
          No spam, ever. Unsubscribe anytime.
        </Text>
      </Div>
    </DynamicBgDiv>
  );
}
