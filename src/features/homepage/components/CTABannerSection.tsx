import React from "react";
import Link from "next/link";
import { Section } from "../../../ui";

export interface CTABannerSectionProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function CTABannerSection({
  title = "Thousands of collectibles. One marketplace.",
  subtitle,
  primaryLabel = "Shop All Products →",
  primaryHref = "/products",
  secondaryLabel = "Browse Auctions →",
  secondaryHref = "/auctions",
  className = "",
}: CTABannerSectionProps) {
  return (
    <Section className={`bg-gradient-to-r from-primary-600 to-primary-700 py-16 px-4 ${className}`}>
      <div className="mx-auto max-w-3xl text-center" data-section="ctabannersection-div-313">
        <span className="mb-4 inline-block text-2xl" aria-hidden="true">
          ✨
        </span>
        <h2 className="text-2xl font-bold text-white md:text-3xl lg:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base text-white/80">{subtitle}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4" data-section="ctabannersection-div-314">
          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center rounded-full border-2 border-white/80 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </Section>
  );
}
