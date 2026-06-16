import React from "react";
import { Dd, Div, Dl, Dt, RichText, Stack, Text } from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { CustomField, CustomSection } from "../schemas/firestore";

function renderFieldValue(f: CustomField): string {
  if (f.type === "boolean") return f.value === "true" ? "Yes" : "No";
  return f.value + (f.unit ? ` ${f.unit}` : "");
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
          className="text-zinc-700 dark:text-zinc-300"
        />
      )}
      {fields.length > 0 && (
        <Dl divide="subtle" rounded="xl" border="subtle" className="overflow-hidden">
          {fields.map((f, i) => (
            <Div
              key={i}
              className="flex gap-4 even:bg-zinc-50 dark:even:bg-zinc-800/50" surface="default" padding="inline"
            >
              <Dt className="w-36 flex-shrink-0 font-medium capitalize" color="primary">
                {f.key}
              </Dt>
              <Dd className="flex-1" color="muted">
                {f.type === "url" ? (
                  <a
                    href={f.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline dark:text-primary-400 break-all"
                  >
                    {f.value}
                  </a>
                ) : (
                  renderFieldValue(f)
                )}
              </Dd>
            </Div>
          ))}
        </Dl>
      )}
      {!html && fields.length === 0 && (
        <Text size="sm" color="faint">No content in this section.</Text>
      )}
    </Stack>
  );
}
