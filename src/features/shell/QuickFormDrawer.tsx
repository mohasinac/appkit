"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ZodType } from "zod";
import { Button } from "../../ui/components/Button";
import { IconButton } from "../../ui/components/IconButton";
import { FormField } from "../../ui/components/FormField";
import { Toggle } from "../../ui/components/Toggle";
import { Div, Form, Row, Stack, Text } from "../../ui";
import { FormShellContext, FormErrorSummary, type FormShellContextValue } from "../../ui/forms";
import type { FormFieldValue, FormValues } from "../../schemas/types";
import { useHandMode } from "../../_internal/client/hand-mode";
export type QuickFieldType = "text" | "number" | "select" | "toggle" | "date" | "textarea" | "email" | "url";

export interface QuickFieldDef {
  name: string;
  label: string;
  type: QuickFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: FormFieldValue;
}

export interface QuickFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: QuickFieldDef[];
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  /**
   * Zod schema covering every field. When supplied, replaces the manual
   * `required` check — the Zod parse becomes the single source of validation
   * truth. `audit-quick-form-drawer-schema` requires every callsite to pass
   * this prop.
   */
  schema?: ZodType<FormValues> | ZodType<unknown>;
  /** Extra content rendered below auto-generated fields. */
  renderExtra?: (
    values: FormValues,
    onChange: (name: string, value: FormFieldValue) => void,
  ) => ReactNode;
}

function initValues(
  fields: QuickFieldDef[],
  defaults: FormValues = {},
): FormValues {
  const out: FormValues = {};
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
  const { hand } = useHandMode();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormValues>(() =>
    initValues(fields, defaultValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Re-initialise when defaultValues change (e.g. edit mode)
  useEffect(() => {
    if (isOpen) setValues(initValues(fields, defaultValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const set = (name: string, value: FormFieldValue) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const validate = (): boolean => {
    // Schema-first: when a Zod schema is supplied, it is the single source of
    // truth — manual `required` checks are skipped entirely. Falls back to
    // the manual check only when the callsite has not yet been migrated.
    if (schema) {
      const parsed = (schema as ZodType<unknown>).safeParse(values);
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

  // Live-derived (not state — a pure function of the current values, so it
  // never needs a separate effect) validation for the error summary below.
  // Deliberately kept SEPARATE from the `errors` state above: `errors` only
  // populates on submit and gates each field's inline error display, which
  // must stay submit-gated so an untouched, freshly-opened drawer doesn't
  // show every required field as invalid immediately. The summary is meant
  // to be live per the shared error-summary requirement; the per-field
  // inline errors are not.
  const liveErrors: Record<string, string> = (() => {
    if (schema) {
      const parsed = (schema as ZodType<unknown>).safeParse(values);
      if (parsed.success) return {};
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errs[path]) errs[path] = issue.message;
      }
      return errs;
    }
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (v === undefined || v === null || v === "") errs[f.name] = `${f.label} is required`;
      }
    }
    return errs;
  })();

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

  // Synthesize a FormShellContextValue from `liveErrors` (not the submit-gated
  // `errors` state) so <FormErrorSummary> — the shared live-error-summary
  // primitive — can be reused here without migrating this drawer's
  // already-working schema/errors mechanism onto useFormShellState. Kept
  // separate from `errors` deliberately: this context only backs the
  // summary, never the per-field inline `error={errors[field.name]}` props
  // above, which must stay submit-gated.
  const shellCtx = useMemo<FormShellContextValue>(() => ({
    errors: liveErrors,
    touched: {},
    setFieldError: () => {},
    setFieldTouched: () => {},
    clearFieldError: () => {},
    steps: [],
    currentStep: 0,
    goToStep: () => {},
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: Object.keys(liveErrors).length === 0,
    isDirty: false,
    isSubmitting: submitting,
    stepErrorCounts: [],
  }), [liveErrors, submitting]);

  if (!isOpen) return null;

  const busy = submitting || isLoading;

  return (
    <FormShellContext.Provider value={shellCtx}>
    <>
      {/* Backdrop */}
      <Div surface="overlay-xs"
        className="fixed inset-0 backdrop-blur-[2px] [z-index:calc(var(--appkit-z-modal)+1)]"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Drawer panel: 100% mobile / 40% desktop */}
      <Div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        layout="flex-col"
        shadow="2xl"
        className={`fixed inset-y-0 ${hand === "left" ? "left-0" : "right-0"} bg-[var(--appkit-color-surface)] w-full lg:w-[40%] [z-index:calc(var(--appkit-z-modal)+2)]`}
      >
        {/* Header */}
        <Row className="flex-shrink-0 border-b border-[var(--appkit-color-border)]" padding="md" align="center" gap="3" reverse={hand === "left"}>
          <Text className="flex-1 text-[var(--appkit-color-text)]" size="base" weight="semibold">{title}</Text>
          <IconButton
            type="button"
            onClick={handleClose}
            aria-label="Close"
            variant="ghost"
            rounded="lg"
            className="text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)]"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </Row>

        {/* Scrollable body */}
        <Form
          className="flex-1"
          overflow="y-auto"
          paddingX="x-md"
          paddingY="y-md-lg"
          spacing="md"
          onSubmit={handleSubmit}
          noValidate
        >
          {fields.map((field) => {
            const value = values[field.name];
            if (field.type === "toggle") {
              return (
                <Stack key={field.name} gap="xs">
                  <Toggle
                    checked={!!value}
                    onChange={(checked) => set(field.name, checked)}
                    label={field.label}
                  />
                  {field.helperText && (
                    <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{field.helperText}</Text>
                  )}
                </Stack>
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
        </Form>

        {/* Footer */}
        <Div className="flex-shrink-0 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-bg)]">
          <Div paddingX="x-md" padding="t-sm">
            <FormErrorSummary />
          </Div>
          <Row padding="md" align="center" justify="between" gap="sm">
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
        </Div>
      </Div>
    </>
    </FormShellContext.Provider>
  );
}
