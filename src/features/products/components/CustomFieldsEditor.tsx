"use client";
import React from "react";
import { Button, Div, Input, Row, Select, Stack, Text } from "../../../ui";
import type { SelectOption } from "../../../ui";
import type { CustomField, CustomFieldType } from "../schemas/firestore";
import { MAX_CUSTOM_FIELDS } from "../schemas/firestore";

const CLS_REMOVE = "text-zinc-400 hover:text-error dark:hover:text-error px-2";

const TYPE_OPTIONS: SelectOption<CustomFieldType>[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "url", label: "URL" },
];

const BOOL_OPTIONS: SelectOption[] = [
  { value: "", label: "— Select —" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export interface CustomFieldsEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  /** If true, adds `unit` input beside value. Default false. */
  showUnit?: boolean;
}

function emptyField(): CustomField {
  return { key: "", type: "text", value: "" };
}

export function CustomFieldsEditor({
  fields,
  onChange,
  showUnit = false,
}: CustomFieldsEditorProps) {
  function update(index: number, patch: Partial<CustomField>) {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function add() {
    if (fields.length >= MAX_CUSTOM_FIELDS) return;
    onChange([...fields, emptyField()]);
  }

  return (
    <Stack gap="xs">
      {fields.map((field, i) => (
        <Div
          key={i}
          className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-start"
        >
          {/* Key */}
          <Input
            value={field.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="Field name"
            aria-label={`Custom field ${i + 1} name`}
          />

          {/* Type */}
          <Select
            options={TYPE_OPTIONS}
            value={field.type}
            onChange={(e) => update(i, { type: e.target.value as CustomFieldType, value: "" })}
            aria-label={`Custom field ${i + 1} type`}
          />

          {/* Value */}
          {field.type === "boolean" ? (
            <Select
              options={BOOL_OPTIONS}
              value={field.value}
              onChange={(e) => update(i, { value: e.target.value })}
              aria-label={`Custom field ${i + 1} value`}
            />
          ) : (
            <Div className={showUnit ? "flex gap-1" : ""}>
              <Input
                type={field.type === "number" ? "number" : "text"}
                value={field.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder={field.type === "url" ? "https://" : "Value"}
                aria-label={`Custom field ${i + 1} value`}
                className="flex-1"
              />
              {showUnit && (
                <Input
                  value={field.unit ?? ""}
                  onChange={(e) => update(i, { unit: e.target.value || undefined })}
                  placeholder="Unit"
                  aria-label={`Custom field ${i + 1} unit`}
                  className="w-20 flex-shrink-0"
                />
              )}
            </Div>
          )}

          {/* Remove */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(i)}
            aria-label={`Remove field ${i + 1}`}
            className={CLS_REMOVE}
          >
            ✕
          </Button>
        </Div>
      ))}

      <Row align="center" justify="between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={add}
          disabled={fields.length >= MAX_CUSTOM_FIELDS}
          className="text-primary-600 dark:text-primary-400"
        >
          + Add field
        </Button>
        {fields.length > 0 && (
          <Text className="text-xs text-zinc-400 dark:text-zinc-400">
            {fields.length} / {MAX_CUSTOM_FIELDS}
          </Text>
        )}
      </Row>
    </Stack>
  );
}
