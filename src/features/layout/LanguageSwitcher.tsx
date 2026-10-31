"use client";

import { Select, type SelectOption } from "../../ui/components/Select";

export interface LanguageSwitcherOption {
  value: string;
  /** Display label — the language's own name ("English", "हिन्दी"), not an ISO code. */
  label: string;
}

export interface LanguageSwitcherProps {
  options: LanguageSwitcherOption[];
  value: string;
  onChange: (next: string) => void;
}

/**
 * Presentational only — mounted via `TitleBarLayout`'s `localeSlot`. The
 * consumer's own wrapper supplies `options`/`value`/`onChange` from
 * `src/i18n/routing.ts` and next-intl's `useRouter`/`usePathname`
 * (`src/i18n/navigation.ts`), which are consumer-specific and cannot live in
 * appkit (`createNavigation()` is called with THIS app's `routing` object).
 *
 * Renders nothing for a single-locale site — `options.length <= 1` has
 * nothing to switch between, and a single-option dropdown is a control that
 * does nothing. This is why it is currently invisible everywhere: `en` is
 * the only entry in `routing.locales`. It activates automatically the day a
 * second locale is added there — no second mount point to remember.
 *
 * `<Select>`, not `<PaginatedSelect>` — a language list is realistically
 * under five entries (Rule #9's own ≤5 threshold).
 */
export function LanguageSwitcher({ options, value, onChange }: LanguageSwitcherProps) {
  if (options.length <= 1) return null;

  const selectOptions: SelectOption<string>[] = options.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <Select
      bare
      aria-label="Language"
      options={selectOptions}
      value={value}
      onValueChange={onChange}
      wrapperClassName="w-auto"
    />
  );
}
