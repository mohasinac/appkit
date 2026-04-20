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
      className={["appkit-skip-to-main", className].filter(Boolean).join(" ")}
    >
      {label}
    </TextLink>
  );
}
