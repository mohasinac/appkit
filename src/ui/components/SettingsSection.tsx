"use client";
import React from "react";
import type { ReactNode } from "react";
import { Heading, Text } from "./Typography";
import { Toggle } from "./Toggle";

export interface SettingsSectionProps {
  /** Section title rendered as an h3. */
  title: ReactNode;
  /** Optional supporting copy below the title. */
  description?: ReactNode;
  /** Action slot rendered top-right (e.g. a "Reset" button). */
  action?: ReactNode;
  /** Section body. */
  children: ReactNode;
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

/**
 * `SettingsSection` — a bordered card with a heading and optional description,
 * used by admin/seller/user settings pages to group related controls.
 *
 * W1-31: extracted from inline `<div className="space-y-* rounded-lg border …">`
 * blocks scattered across `AdminSiteSettingsView`, `SellerStoreSettingsView`,
 * `UserSettingsView`, etc.
 */
export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={[
        "appkit-settings-section",
        "space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Heading level={3} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </Heading>
          {description ? (
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </Text>
          ) : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export interface ToggleRowProps {
  /** Row label (rendered next to the toggle). */
  label: ReactNode;
  /** Optional secondary description below the label. */
  description?: ReactNode;
  /** Controlled checked state. */
  checked: boolean;
  /** Change handler. */
  onChange: (next: boolean) => void;
  /** Disabled state. */
  disabled?: boolean;
  /** Toggle size — defaults to `md`. */
  size?: "sm" | "md" | "lg";
  /** Additional classes appended to the outer wrapper. */
  className?: string;
}

/**
 * `ToggleRow` — a labelled toggle with optional description, used wherever a
 * settings page needs a boolean control with explanatory copy. Pair with
 * `SettingsSection` to group related rows.
 *
 * W1-31: replaces the inline `<Toggle label="…" />` + helper-text patterns
 * across admin/seller/user settings views.
 */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = "md",
  className,
}: ToggleRowProps) {
  return (
    <div
      className={[
        "appkit-toggle-row",
        "flex items-start justify-between gap-3 py-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex-1 min-w-0">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </Text>
        ) : null}
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <Toggle
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          size={size}
        />
      </div>
    </div>
  );
}
