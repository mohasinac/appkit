"use client";
import React, { useId } from "react";
import { Button, Div, Heading, Input, Span, Stack, Text } from "../../../ui";
import type { CustomField, CustomSection } from "../schemas/firestore";
import { MAX_CUSTOM_SECTIONS } from "../schemas/firestore";
import { CustomFieldsEditor } from "./CustomFieldsEditor";

const CLS_REMOVE = "text-zinc-400 hover:text-error dark:hover:text-error text-xs";

export interface CustomSectionsEditorProps {
  sections: CustomSection[];
  onChange: (sections: CustomSection[]) => void;
}

function generateSectionId() {
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptySection(): CustomSection {
  return { id: generateSectionId(), title: "", fields: [] };
}

export function CustomSectionsEditor({
  sections,
  onChange,
}: CustomSectionsEditorProps) {
  const baseId = useId();

  function update(index: number, patch: Partial<CustomSection>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function add() {
    if (sections.length >= MAX_CUSTOM_SECTIONS) return;
    onChange([...sections, emptySection()]);
  }

  return (
    <Stack gap="md">
      {sections.map((section, i) => (
        <Div
          key={section.id}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-3"
        >
          <Div className="flex items-center justify-between gap-2">
            <Heading
              level={4}
              className="text-zinc-700 dark:text-zinc-200" size="sm" weight="semibold"
            >
              Section {i + 1}
            </Heading>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              className={CLS_REMOVE}
            >
              Remove
            </Button>
          </Div>

          {/* Title */}
          <Div>
            <label
              htmlFor={`${baseId}-title-${i}`}
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Section title <span className="text-error">*</span>
            </label>
            <Input
              id={`${baseId}-title-${i}`}
              value={section.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder='e.g. "Box Contents", "Compatibility", "Grading Details"'
              maxLength={80}
            />
          </Div>

          {/* Text body */}
          <Div>
            <label
              htmlFor={`${baseId}-text-${i}`}
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Body text{" "}
              <Span weight="normal" color="faint">(optional)</Span>
            </label>
            <textarea
              id={`${baseId}-text-${i}`}
              value={section.text ?? ""}
              onChange={(e) => update(i, { text: e.target.value || undefined })}
              placeholder="Additional details for this section…"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </Div>

          {/* Custom fields within section */}
          <Div>
            <Text className="mb-2 text-zinc-600 dark:text-zinc-400" size="xs" weight="medium">
              Fields{" "}
              <Span weight="normal" color="faint">(optional)</Span>
            </Text>
            <CustomFieldsEditor
              fields={section.fields ?? []}
              onChange={(fields: CustomField[]) => update(i, { fields: fields.length > 0 ? fields : undefined })}
              showUnit
            />
          </Div>
        </Div>
      ))}

      <Div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={add}
          disabled={sections.length >= MAX_CUSTOM_SECTIONS}
          className="text-primary-600 dark:text-primary-400"
        >
          + Add section
        </Button>
        <Text className="text-zinc-400 dark:text-zinc-400" size="xs">
          {sections.length} / {MAX_CUSTOM_SECTIONS} sections
        </Text>
      </Div>
    </Stack>
  );
}
