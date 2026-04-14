"use client";

import { Select } from "../../ui";

export interface LocaleSwitcherOption {
  value: string;
  label: string;
}

export interface LocaleSwitcherProps {
  /** Currently active locale. */
  locale: string;
  /** Available locale options. */
  options: LocaleSwitcherOption[];
  /** Called when the user selects a different locale. */
  onChange: (locale: string) => void;
  /** ARIA label for the select element. */
  ariaLabel?: string;
  className?: string;
}

/**
 * LocaleSwitcher — generic locale selector.
 *
 * Renders a minimal `<select>` element. The parent is responsible for
 * calling `router.replace` with the chosen locale (project-specific routing).
 */
export function LocaleSwitcher({
  locale,
  options,
  onChange,
  ariaLabel = "Switch language",
  className = "",
}: LocaleSwitcherProps) {
  return (
    <Select
      value={locale}
      onValueChange={onChange}
      options={options}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
