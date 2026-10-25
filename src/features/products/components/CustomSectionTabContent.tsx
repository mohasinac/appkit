
import React from "react";
import { RichText } from "../../../ui/rich-text/RichText";
import { SpecTable } from "../../../ui/components/SpecTable";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { CustomSection } from "../schemas/firestore";

/**
 * Shape `ProductTabsShell` expects for `customTabs`. Duplicated here rather
 * than imported from `ProductTabsShell.tsx` — that file is `"use client"` and
 * this one is a plain function, so importing its type keeps this module
 * server-renderable. The two must stay structurally compatible; they already
 * do (`{ id, label, content }`).
 */
interface CustomSectionTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * `customSections` → `ProductTabsShell`'s `customTabs` prop, in one place.
 *
 * Six detail views (`ProductDetailPageView`, `AuctionDetailPageView`,
 * `PreOrderDetailPageView`, `ClassifiedDetailPageView`,
 * `DigitalCodeDetailPageView`, `LiveItemDetailPageView`) had this EXACT
 * five-line block — the same `Array.isArray` guard and the same `.map` —
 * copy-pasted six times. Rule-of-Three material by the Duplication Decision
 * Framework (same prop surface, same shape, a bug fix would have needed six
 * commits), consolidated here rather than left as six places that could
 * silently drift the next time one of them is touched and the other five are
 * not.
 *
 * Takes the raw, possibly-untyped `customSections` field directly (every call
 * site reads it off a cast Firestore document) so callers do one line instead
 * of two: `customTabs={toCustomSectionTabs(p.customSections)}`.
 */
export function toCustomSectionTabs(input: unknown): CustomSectionTab[] {
  const sections: CustomSection[] = Array.isArray(input)
    ? (input as CustomSection[])
    : [];
  return sections.map((s) => ({
    id: s.id,
    label: s.title,
    content: <CustomSectionTabContent section={s} />,
  }));
}

export function CustomSectionTabContent({ section }: { section: CustomSection }) {
  const html = section.text ? normalizeRichTextHtml(section.text) : null;
  const fields = section.fields?.filter((f) => f.key && f.value) ?? [];

  return (
    <Stack gap="md">
      {html && (
        <RichText
          html={html}
          proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
          className="text-[var(--appkit-color-text-muted)]"
        />
      )}
      {fields.length > 0 && (
        <SpecTable rows={fields.map((f) => ({ name: f.key, value: String(f.value), unit: f.unit }))} />
      )}
      {!html && fields.length === 0 && (
        <Text size="sm" color="faint">No content in this section.</Text>
      )}
    </Stack>
  );
}
