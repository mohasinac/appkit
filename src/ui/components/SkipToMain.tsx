"use client";

import React from "react";
import { TextLink } from "./TextLink";

export interface SkipToMainProps {
  href?: string;
  label?: string;
  className?: string;
}

export function SkipToMain({
  href = "#main-content",
  label = "Skip to main content",
  className = "",
}: SkipToMainProps) {
  return (
    <TextLink
      href={href}
      variant="none"
      className={[
        "sr-only focus-visible:not-sr-only focus-visible:fixed",
        "focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100]",
        "focus-visible:rounded-lg focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2.5",
        "focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </TextLink>
  );
}
