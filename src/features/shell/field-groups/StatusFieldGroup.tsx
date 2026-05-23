"use client";
import React, { type ReactNode } from "react";
import { Select } from "../../../ui/components/Select";
import { ToggleRow, SettingsSection } from "../../../ui/components/SettingsSection";

export interface StatusFieldGroupOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface StatusFieldGroupProps<T extends string = string> {
  /** Current status value. */
  status: T;
  /** Available status options. */
  options: readonly StatusFieldGroupOption<T>[];
  /** Setter. */
  onStatusChange: (next: T) => void;
  /** Optional sub-toggles below the status select (e.g. `isFeatured`, `isPromoted`). */
  toggles?: ReadonlyArray<{
    key: string;
    label: ReactNode;
    description?: ReactNode;
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
  }>;
  /** Optional section label override. */
  sectionTitle?: ReactNode;
  sectionDescription?: ReactNode;
  disabled?: boolean;
}

/**
 * `StatusFieldGroup` — status select plus optional sub-toggles (featured /
 * promoted / pinned, etc.) used across Product, Blog, Event, Coupon, FAQ
 * editors.
 *
 * W1-15 — extracted 2026-05-23.
 */
export function StatusFieldGroup<T extends string = string>({
  status,
  options,
  onStatusChange,
  toggles,
  sectionTitle = "Status",
  sectionDescription,
  disabled = false,
}: StatusFieldGroupProps<T>) {
  return (
    <SettingsSection title={sectionTitle} description={sectionDescription}>
      <Select
        label="Visibility status"
        value={status}
        onValueChange={(v) => onStatusChange(v as T)}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        disabled={disabled}
      />
      {toggles?.length
        ? toggles.map((t) => (
            <ToggleRow
              key={t.key}
              label={t.label}
              description={t.description}
              checked={t.checked}
              onChange={t.onChange}
              disabled={t.disabled ?? disabled}
            />
          ))
        : null}
    </SettingsSection>
  );
}
