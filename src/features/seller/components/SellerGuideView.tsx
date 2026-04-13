"use client";

import type { ReactNode } from "react";
import { Div, Heading } from "../../../ui";

export interface SellerGuideViewProps {
  labels?: { title?: string };
  sections?: ReactNode;
  cta?: ReactNode;
  renderSections?: () => ReactNode;
  renderCTA?: () => ReactNode;
  className?: string;
}

export function SellerGuideView({
  labels = {},
  sections,
  cta,
  renderSections,
  renderCTA,
  className = "",
}: SellerGuideViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="mb-6 text-2xl font-bold">
          {labels.title}
        </Heading>
      )}
      {sections ?? renderSections?.()}
      {cta ?? renderCTA?.()}
    </Div>
  );
}
