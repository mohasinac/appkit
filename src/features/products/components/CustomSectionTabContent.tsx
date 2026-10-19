import { Row } from "@mohasinac/appkit/ui";
import React from "react";
import { Anchor, Dd, Dl, Dt, RichText, Stack, Text } from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { CustomField, CustomSection } from "../schemas/firestore";

function renderFieldValue(f: CustomField): string {
  if (f.type === "boolean") return f.value === "true" ? "Yes" : "No";
  return f.value + (f.unit ? ` ${f.unit}` : "");
}

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
export function toCustomSectionTabs(customSections: unknown): CustomSectionTab[] {
  const sections: CustomSection[] = Array.isArray(customSections)
    ? (customSections as CustomSection[])
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
        <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
          {fields.map((f, i) => (
            <Row gap="md" oddEven="zebra"
              key={i}
              surface="default" padding="inline"
            >
              <Dt weight="medium" className="w-36 flex-shrink-0 capitalize" color="primary">
                {f.key}
              </Dt>
              <Dd className="flex-1" color="muted">
                {f.type === "url" ? (
                  <Anchor href={f.value} tone="none" underline="hover" className="text-primary-600 dark:text-primary-400 break-all">
                    {f.value}
                  </Anchor>
                ) : (
                  renderFieldValue(f)
                )}
              </Dd>
            </Row>
          ))}
        </Dl>
      )}
      {!html && fields.length === 0 && (
        <Text size="sm" color="faint">No content in this section.</Text>
      )}
    </Stack>
  );
}
