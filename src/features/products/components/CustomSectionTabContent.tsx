import React from "react";
import { Div, RichText, Text } from "../../../ui";
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
    <Div className="space-y-4">
      {html && (
        <RichText
          html={html}
          proseClass="prose prose-sm sm:prose max-w-none dark:prose-invert"
          className="text-zinc-700 dark:text-zinc-300"
        />
      )}
      {fields.length > 0 && (
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden text-sm">
          {fields.map((f, i) => (
            <div
              key={i}
              className="flex gap-4 px-4 py-3 bg-white dark:bg-zinc-900 even:bg-zinc-50 dark:even:bg-zinc-800/50"
            >
              <dt className="w-36 flex-shrink-0 font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                {f.key}
              </dt>
              <dd className="flex-1 text-zinc-600 dark:text-zinc-400">
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
              </dd>
            </div>
          ))}
        </dl>
      )}
      {!html && fields.length === 0 && (
        <Text className="text-sm text-zinc-400 dark:text-zinc-400">No content in this section.</Text>
      )}
    </Div>
  );
}
