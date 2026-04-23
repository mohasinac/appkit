"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BlockFooter,
  Div,
  Heading,
  Li,
  Row,
  Span,
  Text,
  Ul,
} from "../../ui";

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
      className="bg-zinc-50 dark:bg-slate-950 border-t border-zinc-200 dark:border-slate-800"
    >
      {/* Trust bar */}
      {showTrustBar && visibleTrustItems.length > 0 && (
              <Div className="border-b border-zinc-100 dark:border-slate-800 py-8">
          <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
            <Row as="ul" wrap justify="center" gap="lg" className="lg:gap-10">
              {visibleTrustItems.map((item, i) => (
                <Li key={item.id ?? String(i)}>
                  <Row gap="sm" className="text-sm min-w-[160px]">
                    <Span className="flex-shrink-0 text-primary-600 dark:text-secondary-400 w-5 h-5">
                      {item.icon}
                    </Span>
                    <Span>
                      <Span className="font-bold text-zinc-900 dark:text-zinc-100 block text-sm">
                        {item.label}
                      </Span>
                      {item.subtitle && (
                        <Span className="text-zinc-500 dark:text-zinc-400 text-xs block">
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

      <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px] py-10 lg:py-14">
        <Div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <Div className="lg:col-span-2 space-y-4">
            <Heading level={5} className="text-zinc-900 dark:text-zinc-50 font-bold text-xl">
              {brandName}
            </Heading>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm">
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
                      className="flex items-center justify-center w-9 h-9 rounded-full border border-zinc-200 dark:border-slate-700 text-zinc-500 dark:text-zinc-400 hover:text-primary dark:hover:text-secondary hover:border-primary/40 dark:hover:border-secondary/40 transition-colors"
                    >
                      {link.icon}
                    </Link>
                  </Li>
                ))}
              </Row>
            )}

            {/* Newsletter slot */}
            {newsletterEnabled && newsletterSlot && (
              <Div className="pt-2">{newsletterSlot}</Div>
            )}
          </Div>

          {/* Link groups — desktop: columns, mobile: accordions */}
          <Div className={`lg:col-span-3 grid grid-cols-1 gap-0 lg:gap-8 ${
            linkGroups.length <= 3 ? "lg:grid-cols-3" :
            linkGroups.length === 4 ? "lg:grid-cols-4" :
            "lg:grid-cols-5"
          }`}>
            {linkGroups.map((group, idx) => (
              <Div key={idx}>
                {/* Mobile accordion header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(idx)}
                  className="flex w-full items-center justify-between border-b border-zinc-200 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:text-zinc-950 dark:border-slate-800 dark:text-zinc-100 dark:hover:text-white lg:hidden"
                  aria-expanded={!!openGroups[idx]}
                >
                  {group.heading}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${openGroups[idx] ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Mobile content */}
                <Ul
                  className={`lg:hidden overflow-hidden transition-all duration-200 ${openGroups[idx] ? "max-h-96 py-3" : "max-h-0"} space-y-2.5`}
                >
                  {group.links.map((link) => (
                    <Li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-primary dark:hover:text-secondary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </Li>
                  ))}
                </Ul>

                {/* Desktop column */}
                <Div className="hidden lg:block">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    {group.heading}
                  </Text>
                  <Ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <Li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-primary dark:hover:text-secondary transition-colors"
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
