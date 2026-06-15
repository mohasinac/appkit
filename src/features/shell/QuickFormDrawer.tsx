"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ZodType } from "zod";
import { Button } from "../../ui/components/Button";
import { FormField } from "../../ui/components/FormField";
import { Toggle } from "../../ui/components/Toggle";
import { Div, Row, Text } from "../../ui";
export type QuickFieldType = "text" | "number" | "select" | "toggle" | "date" | "textarea" | "email" | "url";

export interface QuickFieldDef {
  name: string;
  label: string;
  type: QuickFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: unknown;
}

export interface QuickFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: QuickFieldDef[];
  defaultValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  /**
   * Zod schema covering every field. When supplied, replaces the manual
   * `required` check — the Zod parse becomes the single source of validation
   * truth. `audit-quick-form-drawer-schema` requires every callsite to pass
   * this prop.
   */
  schema?: ZodType<Record<string, unknown>> | ZodType<unknown>;
  /** Extra content rendered below auto-generated fields. */
  renderExtra?: (
    values: Record<string, unknown>,
    onChange: (name: string, value: unknown) => void,
  ) => ReactNode;
}

function initValues(
  fields: QuickFieldDef[],
  defaults: Record<string, unknown> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.name] =
      f.name in defaults
        ? defaults[f.name]
        : (f.defaultValue ?? (f.type === "toggle" ? false : ""));
  }
  return out;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function QuickFormDrawer({
  isOpen,
  onClose,
  title,
  fields,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  schema,
  renderExtra,
}: QuickFormDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initValues(fields, defaultValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Re-initialise when defaultValues change (e.g. edit mode)
  useEffect(() => {
    if (isOpen) setValues(initValues(fields, defaultValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const set = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const validate = (): boolean => {
    // Schema-first: when a Zod schema is supplied, it is the single source of
    // truth — manual `required` checks are skipped entirely. Falls back to
    // the manual check only when the callsite has not yet been migrated.
    if (schema) {
      const parsed = schema.safeParse(values);
      if (parsed.success) {
        setErrors({});
        return true;
      }
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errs[path]) errs[path] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (v === undefined || v === null || v === "") {
          errs[f.name] = `${f.label} is required`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await onSubmit(values);
        setValues(initValues(fields, defaultValues));
        setErrors({});
      } finally {
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, fields, defaultValues, onSubmit],
  );

  const handleClose = useCallback(() => {
    setValues(initValues(fields, defaultValues));
    setErrors({});
    onClose();
     
  }, [fields, defaultValues, onClose]);

  // Keyboard: Esc → close; Tab → trap focus
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); handleClose(); return; }
      if (e.key === "Tab" && drawerRef.current) {
        const els = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!els.length) { e.preventDefault(); return; }
        if (e.shiftKey) {
          if (document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
        } else {
          if (document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const busy = submitting || isLoading;

  return (
    <>
      {/* Backdrop */}
      <Div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        // audit-inline-style-ok: z-index token
        style={{ zIndex: "calc(var(--appkit-z-modal) + 1)" }}
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Drawer panel: 100% mobile / 40% desktop */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 flex flex-col bg-[var(--appkit-color-surface)] shadow-2xl w-full lg:w-[40%]"
        // audit-inline-style-ok: z-index token
        style={{ zIndex: "calc(var(--appkit-z-modal) + 2)" }}
      >
        {/* Header */}
        <Row className="flex-shrink-0 px-4 border-b border-[var(--appkit-color-border)]" padding="y-md" align="center" gap="3">
          <Text className="flex-1 text-[var(--appkit-color-text)]" size="base" weight="semibold">{title}</Text>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </Row>

        {/* Scrollable body */}
        <form
          className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
          onSubmit={handleSubmit}
          noValidate
        >
          {fields.map((field) => {
            const value = values[field.name];
            if (field.type === "toggle") {
              return (
                <Div key={field.name} className="space-y-1">
                  <Toggle
                    checked={!!value}
                    onChange={(checked) => set(field.name, checked)}
                    label={field.label}
                  />
                  {field.helperText && (
                    <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{field.helperText}</Text>
                  )}
                </Div>
              );
            }
            return (
              <Div key={field.name}>
                <FormField
                  name={field.name}
                  label={field.label}
                  type={
                    field.type === "textarea"
                      ? "textarea"
                      : field.type === "select"
                        ? "select"
                        : "text"
                  }
                  value={String(value ?? "")}
                  onChange={(v) =>
                    set(field.name, field.type === "number" ? Number(v) : v)
                  }
                  options={field.options}
                  placeholder={field.placeholder}
                  disabled={busy}
                  error={errors[field.name]}
                />
                {field.helperText && !errors[field.name] && (
                  <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="xs">
                    {field.helperText}
                  </Text>
                )}
              </Div>
            );
          })}
          {renderExtra?.(values, set)}
        </form>

        {/* Footer */}
        <Row className="flex-shrink-0 px-4 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-bg)]" padding="y-md" align="center" justify="between" gap="sm">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={busy}
            isLoading={busy}
          >
            {submitLabel} →
          </Button>
        </Row>
      </div>
    </>
  );
}
