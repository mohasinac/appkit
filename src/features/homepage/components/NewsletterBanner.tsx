"use client"
import React, { useState } from "react";
import {
  Button,
  Div,
  Heading,
  Input,
  Section,
  Span,
  Text,
} from "../../../ui";

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
    <Section
      className="relative overflow-hidden py-24"
      style={{
        background:
          "var(--newsletter-bg, linear-gradient(135deg, var(--color-primary, #1e40af) 0%, var(--color-secondary, #7c3aed) 100%))",
      }}
    >
      {/* Decorative rings */}
      <Div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full border border-white/[0.06]" />
      <Div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full border border-dashed border-white/[0.08]" />

      <Div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <Span className="mb-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
          {eyebrow}
        </Span>
        <Heading
          level={2}
          className="text-3xl font-bold text-white sm:text-4xl"
        >
          {heading}
        </Heading>
        <Text className="mt-4 text-white/60">{subheading}</Text>

        {success ? (
          <Text className="mt-8 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-semibold text-white">
            {successMessage}
          </Text>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
            />
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-opacity disabled:opacity-60"
              style={{
                background: "var(--color-yellow, #FFE500)",
                color: "#0D0D0D",
              }}
            >
              {loading ? "…" : ctaLabel}
            </Button>
          </form>
        )}

        {error && (
          <Text className="mt-3 text-sm text-red-300">{errorMessage}</Text>
        )}

        <Text className="mt-4 text-xs text-white/40">
          No spam, ever. Unsubscribe anytime.
        </Text>
      </Div>
    </Section>
  );
}
