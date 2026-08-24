"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BlockFooter, Button, Div, Heading, Li, Nav, Row, Span, Stack, Text, Ul } from "../../ui";
export interface FooterLinkGroup {
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterSocialLink {
  platform: string;
  href: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

export interface TrustBarItem {
  id?: string;
  icon: React.ReactNode;
  /** Primary label text. */
  label: string;
  /** Optional secondary text shown below the label. */
  subtitle?: string;
  visible?: boolean;
}

export interface FooterBottomLink {
  label: string;
  href: string;
}

export interface FooterLayoutProps {
  brandName: string;
  brandDescription: string;
  socialLinks: FooterSocialLink[];
  linkGroups: FooterLinkGroup[];
  copyrightText: string;
  madeInText?: string;
  /** Optional newsletter subscription slot. */
  newsletterSlot?: React.ReactNode;
  newsletterEnabled?: boolean;
  /** When true, renders the trust bar above the main footer content. */
  showTrustBar?: boolean;
  trustBarItems?: TrustBarItem[];
  /** SEO/utility links shown in the bottom bar (sitemap, robots, etc.) */
  bottomLinks?: FooterBottomLink[];
  id?: string;
}

export function FooterLayout({
  brandName,
  brandDescription,
  socialLinks,
  linkGroups,
  copyrightText,
  madeInText,
  newsletterSlot,
  newsletterEnabled = true,
  showTrustBar = false,
  trustBarItems = [],
  bottomLinks = [],
  id = "footer",
}: FooterLayoutProps) {
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const toggleGroup = (idx: number) =>
    setOpenGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const visibleTrustItems = trustBarItems.filter(
    (item) => item.visible !== false,
  );

  return (
    <BlockFooter
      id={id}
      // The footer is the last thing on the page, so it is what the fixed bottom
      // chrome actually covers — the copyright and bottom-links rows used to sit
      // under the nav bar and CTA tier, unreadable. <Main> carried a margin for
      // this, but <Main> is a SIBLING before the footer, so that only ever opened
      // a gap between the two and never cleared the page's own end.
      //
      // Padding here rather than on the scroll container so the footer's own
      // background continues behind the translucent chrome — otherwise scrolling
      // to the end shows a band of bare page background under the nav.
      className="bg-[var(--appkit-color-bg)] border-t border-[var(--appkit-color-border-subtle)] pb-[calc(var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px))]"
    >
      {/* Trust bar */}
      {showTrustBar && visibleTrustItems.length > 0 && (
              <Div border="subtle" className="border-b" padding="y-xl">
          <Div paddingX="x-page" className="container mx-auto max-w-[1920px]">
            <Row as="ul" wrap justify="center" gap="lg" className="lg:gap-[var(--appkit-space-10)]">
              {visibleTrustItems.map((item, i) => (
                <Li key={item.id ?? String(i)}>
                  <Row textSize="sm" gap="sm" className="min-w-[160px]">
                    <Span className="flex-shrink-0 text-primary-600 dark:text-secondary-400 w-5 h-5">
                      {item.icon}
                    </Span>
                    <Span>
                      <Span size="sm" weight="bold" className="block" color="primary">
                        {item.label}
                      </Span>
                      {item.subtitle && (
                        <Span size="xs" className="block" color="muted" weight="medium">
                          {item.subtitle}
                        </Span>
                      )}
                    </Span>
                  </Row>
                </Li>
              ))}
            </Row>
          </Div>
        </Div>
      )}

      <Div paddingX="x-page" className="container mx-auto max-w-[1920px] lg:py-[var(--appkit-space-14)]" padding="y-2xl">
        <Div className="grid grid-cols-1 lg:grid-cols-5 gap-[var(--appkit-space-10)] lg:gap-[var(--appkit-space-16)]">
          {/* Brand column */}
          <Stack className="lg:col-span-2" gap="md">
            <Heading level={5} size="xl" weight="bold" color="primary">
              {brandName}
            </Heading>
            <Text className="leading-relaxed max-w-sm" color="muted" size="sm" weight="medium">
              {brandDescription}
            </Text>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <Row as={Ul} gap="sm">
                {socialLinks.map((link) => (
                  <Li key={link.platform}>
                    <Link
                      href={link.href}
                      aria-label={link.ariaLabel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:text-primary dark:hover:text-secondary hover:border-primary/40 dark:hover:border-secondary/40 transition-colors"
                    >
                      {link.icon}
                    </Link>
                  </Li>
                ))}
              </Row>
            )}

            {/* Newsletter slot */}
            {newsletterEnabled && newsletterSlot && (
              <Div padding="t-xs">{newsletterSlot}</Div>
            )}
          </Stack>

          {/* Link groups — desktop: columns, mobile: accordions */}
          <Div className={`lg:col-span-3 grid grid-cols-1 gap-[var(--appkit-space-0)] lg:gap-[var(--appkit-space-8)] ${
 linkGroups.length <= 3 ? "lg:grid-cols-3" :
 linkGroups.length === 4 ? "lg:grid-cols-4" :
 "lg:grid-cols-5"
 }`}>
            {linkGroups.map((group, idx) => (
              <Div key={idx}>
                {/* Mobile accordion header */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleGroup(idx)}
                  className="w-full justify-between border-b py-[var(--appkit-space-3)] text-left text-[length:var(--appkit-text-sm)] font-semibold transition-colors border-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text)] hover:text-primary dark:hover:text-secondary lg:hidden"
                  aria-expanded={!!openGroups[idx]}
                >
                  {group.heading}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${openGroups[idx] ? "rotate-180" : ""}`}
                  />
                </Button>

                {/* Mobile content */}
                <Ul
                  className={`lg:hidden overflow-hidden transition-all duration-200 ${openGroups[idx] ? "max-h-96 py-[var(--appkit-space-3)]" : "max-h-0"} space-y-2.5`}
                >
                  {group.links.map((link) => (
                    <Li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)] hover:text-primary dark:hover:text-secondary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </Li>
                  ))}
                </Ul>

                {/* Desktop column */}
                <Div className="hidden lg:block">
                  <Text className="tracking-wider mb-3" color="muted" size="xs" weight="bold" transform="uppercase">
                    {group.heading}
                  </Text>
                  <Ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <Li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)] hover:text-primary dark:hover:text-secondary transition-colors"
                        >
                          {link.label}
                        </Link>
                      </Li>
                    ))}
                  </Ul>
                </Div>
              </Div>
            ))}
          </Div>
        </Div>

        {/* Bottom bar */}
        <Stack direction="sm-row" color="muted" textSize="xs" justify="between" border="default" className="mt-10 border-t border-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)]" padding="t-lg" align="center" gap="3">
          <Text size="xs" color="muted" weight="medium">
            {copyrightText}
          </Text>
          {bottomLinks.length > 0 && (
            <Nav aria-label="Site utilities">
              <Ul className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
                {bottomLinks.map((link) => (
                  <Li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[length:var(--appkit-text-xs)] font-medium text-[var(--appkit-color-text-muted)] hover:text-primary dark:hover:text-secondary transition-colors underline-offset-2 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </Li>
                ))}
              </Ul>
            </Nav>
          )}
          {madeInText && (
            <Text size="xs" color="muted" weight="medium">
              {madeInText}
            </Text>
          )}
        </Stack>
      </Div>
    </BlockFooter>
  );
}
