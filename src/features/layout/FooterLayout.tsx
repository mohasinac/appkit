"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BlockFooter,
  Button,
  Div,
  Heading,
  Li,
  Row,
  Span,
  Text,
  Ul,
} from "@mohasinac/ui";

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
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  visible?: boolean;
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
      className="bg-zinc-50 dark:bg-slate-900 border-t border-zinc-200 dark:border-slate-800"
    >
      {/* Trust bar */}
      {showTrustBar && visibleTrustItems.length > 0 && (
        <Div className="border-b border-zinc-200 dark:border-slate-800 py-6">
          <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
            <Row as="ul" wrap justify="center" gap="lg" className="lg:gap-10">
              {visibleTrustItems.map((item) => (
                <Li
                  key={item.id}
                  className="flex items-center gap-3 text-sm min-w-[160px]"
                >
                  <Span className="flex-shrink-0 text-primary-600 dark:text-secondary-400">
                    {item.icon}
                  </Span>
                  <Span>
                    <Span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </Span>
                    <Span className="text-zinc-500 dark:text-zinc-400 text-xs">
                      {item.subtitle}
                    </Span>
                  </Span>
                </Li>
              ))}
            </Row>
          </Div>
        </Div>
      )}

      <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px] py-10 lg:py-14">
        <Div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <Div className="lg:col-span-2 space-y-4">
            <Heading level={5} className="text-zinc-900 dark:text-zinc-100">
              {brandName}
            </Heading>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm">
              {brandDescription}
            </Text>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <Ul className="flex items-center gap-3">
                {socialLinks.map((link) => (
                  <Li key={link.platform}>
                    <Link
                      href={link.href}
                      aria-label={link.ariaLabel}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-full border border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-slate-600 transition-colors"
                    >
                      {link.icon}
                    </Link>
                  </Li>
                ))}
              </Ul>
            )}

            {/* Newsletter slot */}
            {newsletterEnabled && newsletterSlot && (
              <Div className="pt-2">{newsletterSlot}</Div>
            )}
          </Div>

          {/* Link groups — desktop: columns, mobile: accordions */}
          <Div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-8">
            {linkGroups.map((group, idx) => (
              <Div key={idx}>
                {/* Mobile accordion header */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(idx)}
                  className="sm:hidden flex items-center justify-between w-full py-3 border-b border-zinc-200 dark:border-slate-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {group.heading}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${openGroups[idx] ? "rotate-180" : ""}`}
                  />
                </Button>

                {/* Mobile content */}
                <Ul
                  className={`sm:hidden overflow-hidden transition-all duration-200 ${openGroups[idx] ? "max-h-96 py-3" : "max-h-0"} space-y-2.5`}
                >
                  {group.links.map((link) => (
                    <Li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </Li>
                  ))}
                </Ul>

                {/* Desktop column */}
                <Div className="hidden sm:block">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    {group.heading}
                  </Text>
                  <Ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <Li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
        <Div className="mt-10 pt-6 border-t border-zinc-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <Text className="text-xs text-zinc-600 dark:text-zinc-400">
            {copyrightText}
          </Text>
          {madeInText && (
            <Text className="text-xs text-zinc-600 dark:text-zinc-400">
              {madeInText}
            </Text>
          )}
        </Div>
      </Div>
    </BlockFooter>
  );
}
