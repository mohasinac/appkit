"use client";

import React from "react";
import { Button, Card, Div, Grid, Heading, Icon, RichText, Row, Section, Span, Stack, Text } from "../../../ui";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { WhatsAppGlyph } from "./WhatsAppGlyph";

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

/**
 * The community invite.
 *
 * ## 🛑 It looks like a chat because it IS a chat invite
 *
 * This was a single flat card: icon row → heading → description → a 2-column
 * grid of four identical `✓` circles → an italic blockquote → a button, all
 * left-aligned in one top-down stack. Two of those blocks (the `✓` grid and the
 * blockquote) spent a lot of vertical space *telling* you the group is useful.
 * As bubbles on WhatsApp's own wallpaper they *show* it, in less room.
 *
 * Everything needed already existed and had no consumer: `Card`'s
 * `chat-bubble-mine` / `chat-bubble-theirs` variants (with the correct corner
 * notches and an auto-margin for right alignment) and the
 * `--appkit-color-whatsapp-bg` beige token.
 *
 * ## 🛑 Three things that are deliberate
 *
 * 1. **No fabricated timestamps and no `✓✓` read receipts.** Tempting, and the
 *    same category of claim as a made-up member count — which this feature
 *    already refuses to invent. The bubble shape carries the motif on its own.
 * 2. **`align="start"` on the thread is load-bearing.** `chat-bubble-*` is
 *    `display:inline-block; max-width:80%`, and a stretched flex item defeats
 *    both, so the bubbles would become full-width boxes.
 * 3. **`tone="whatsapp"`, not `tone="accent-banner"`.** The old tone is brand
 *    primary→secondary — the SAME gradient as `CTABannerSection` a couple of
 *    sections below, which is a real part of why the page read monotonous.
 */
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
  if (isLoading) {
    return (
      <Section paddingX="x-md-2xl" className={className} surface="subtle" paddingY="y-4xl">
        <Div className="w-full max-w-7xl mx-auto">
          <Div className="h-72 animate-pulse" surface="subtle" rounded="2xl" />
        </Div>
      </Section>
    );
  }

  if (!title && !groupLink) return null;

  const handleJoin = () => {
    if (groupLink) window.open(groupLink, "_blank", "noopener,noreferrer");
  };

  /* The thread. Benefits read as incoming messages; the testimonial closes it.
     Below two there is no conversation to show, so the panel stands down and
     the pitch column takes the full width rather than sitting beside an
     almost-empty box. */
  const thread = [...benefits.slice(0, 4), ...(testimonial ? [`“${testimonial}”`] : [])];
  const showThread = thread.length >= 2;

  return (
    <Section paddingX="x-md-2xl" className={className} surface="subtle" paddingY="y-4xl">
      <Div className="w-full max-w-7xl mx-auto">
        <Section
          color="inverse"
          tone="whatsapp"
          rounded="3xl"
          shadow="xl"
          className="relative overflow-hidden"
        >
          {/* A dot field rather than the previous 45° hatch: a diagonal hatch at
              6% reads as a printing artefact, a dot field reads as material. */}
          <Div
            className="absolute inset-0 opacity-[0.10] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:18px_18px]"
            aria-hidden
          />

          <Grid
            cols={showThread ? "halves" : "autoLg"}
            gap="hero"
            align="center"
            className="relative z-10 px-[1.5rem] py-[2.5rem] sm:px-[2.5rem] sm:py-[3rem]"
          >
            {/* ── Left: the pitch ─────────────────────────────────────────── */}
            <Stack gap="lg">
              <Row align="center" gap="md" wrap>
                <Row
                  surface="frost"
                  rounded="full"
                  padding="x-sm"
                  paddingY="y-2xs-tall"
                  align="center"
                  gap="xs"
                  className="backdrop-blur-sm"
                >
                  <WhatsAppGlyph className="h-4 w-4" />
                  <Span
                    color="inverse"
                    size="xs"
                    weight="semibold"
                    transform="uppercase"
                    className="tracking-[0.18em]"
                  >
                    WhatsApp Community
                  </Span>
                </Row>

                {memberCount && (
                  <Row align="center" gap="xs">
                    {/* The one piece of motion that earns its place: "this group
                        is active right now" is the actual pitch.

                        🛑 `--appkit-color-surface`, not `bg-white`. A literal
                        white is arguably *correct* on a card that stays
                        brand-dark in every theme, and still wrong to write: it
                        is a palette literal with no dark counterpart, which
                        `audit-dark-mode` and `audit-variant-prop-coverage` both
                        block. Surface-fill-on-a-branded-card is exactly the
                        pairing `Button variant="inverse"` uses (added in this
                        same pass), so the dot and the CTA beneath it resolve
                        from one token rather than two opinions.

                        `rounded` is the PROP, not a `rounded-full` className —
                        the utility was masked behind the bg finding until the
                        bg was fixed, which is why it needed two passes. */}
                    <Span layout="flex" className="relative h-2 w-2" aria-hidden>
                      <Span rounded="full" className="absolute inline-flex h-full w-full animate-ping bg-[var(--appkit-color-surface)] opacity-75" />
                      <Span rounded="full" className="relative inline-flex h-2 w-2 bg-[var(--appkit-color-surface)]" />
                    </Span>
                    <Span color="inverse-muted" size="xs" weight="medium" numeric>
                      {memberCount.toLocaleString(getDefaultLocale())}+ {memberCountLabel}
                    </Span>
                  </Row>
                )}
              </Row>

              <Heading
                color="inverse"
                level={2}
                size="3xl"
                mdSize="4xl"
                weight="bold"
                className="leading-[1.1] tracking-tight"
              >
                {title}
              </Heading>

              {descriptionHtml && (
                /* No colour class here. `prose-invert` sets `--tw-prose-body`
                   itself, so ANY wrapper colour loses to it — the previous
                   `text-white/80` on this element did nothing. */
                <RichText
                  html={descriptionHtml}
                  proseClass="prose prose-sm prose-invert max-w-none"
                  className="max-w-md text-[length:var(--appkit-text-base)] leading-relaxed"
                />
              )}

              {groupLink && (
                <Row>
                  {/* `variant="inverse"` replaces four `!important` overrides.
                      A green button on a green card was invisible, which is
                      why those existed. */}
                  <Button
                    variant="inverse"
                    size="lg"
                    shadow="lg"
                    gap="md"
                    onClick={handleJoin}
                    aria-label={buttonText}
                  >
                    <WhatsAppGlyph className="h-5 w-5" />
                    {buttonText}
                  </Button>
                </Row>
              )}
            </Stack>

            {/* ── Right: a real thread on WhatsApp's own wallpaper ────────── */}
            {showThread && (
              <Stack
                gap="sm"
                align="start"
                rounded="2xl"
                padding="md"
                shadow="2xl"
                className="bg-[var(--appkit-color-whatsapp-bg)]"
                role="img"
                aria-label="Example messages from the community group"
              >
                {thread.map((line, i) => (
                  <Card
                    key={i}
                    padding="none"
                    variant={i % 2 === 1 ? "chat-bubble-mine" : "chat-bubble-theirs"}
                  >
                    <Text size="sm" className="leading-snug">
                      {line}
                    </Text>
                  </Card>
                ))}
                <Row align="center" gap="xs" className="self-end pt-[var(--appkit-space-1)]">
                  <Icon name="lock" size="xs" tone="muted" />
                  <Span size="xs" color="muted">End-to-end encrypted by WhatsApp</Span>
                </Row>
              </Stack>
            )}
          </Grid>
        </Section>
      </Div>
    </Section>
  );
}
