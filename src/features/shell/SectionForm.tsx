"use client";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import type { ZodTypeAny } from "zod";
import { Button } from "../../ui/components/Button";
import { CollapsibleSection } from "../../ui/components/CollapsibleSection";
import { Badge } from "../../ui/components/Badge";
import { Div, Row, Span, Stack } from "../../ui";
import type { FormShellStep } from "../../ui/forms/FormShell";
import { FormSchemaContext } from "./FormShell";

/**
 * A collapsible form segment. Replaces `StepDef` — the differences are the
 * point, not incidental:
 *
 *  - there is no `goNext` gate, so a section can never block access to a
 *    later one. Everything is reachable at all times;
 *  - `required` sections sort first and open on mount;
 *  - one shared submit at the bottom, never per-section.
 */
export interface SectionDef<T extends object = Record<string, JsonValue>> {
  /** Stable, URL-safe. Becomes the `?section=` value and the DOM anchor id. */
  id: string;
  label: string;
  /** Longer heading for the open panel. Defaults to `label`. */
  heading?: string;
  /**
   * Mandatory section: sorted first, open on mount, and its header renders
   * without a collapse control so it can't be hidden.
   */
  required?: boolean;
  /**
   * This section's fields belong to quick mode. Consumed by
   * `deriveQuickFields` in `entity-form.ts`, not by SectionForm itself.
   */
  quick?: boolean;
  /**
   * Keep the panel mounted while collapsed. Set on any section holding
   * uncommitted state — media uploads, rich-text buffers. See
   * `CollapsibleSection.keepMounted`.
   */
  keepMounted?: boolean;
  render: (props: {
    values: T;
    onChange: (partial: Partial<T>) => void;
    errors: Record<string, string>;
  }) => ReactNode;
  /**
   * Schema field names this section owns — drives error→section attribution
   * so `<FormErrorSummary>` can offer a jump link.
   */
  fields?: string[];
  /** Per-section schema. Falls back to `schema`, then `FormSchemaContext`. */
  schema?: ZodTypeAny;
  /** Hide the section entirely (conditional per-type sections). */
  when?: (values: T) => boolean;
}

export interface SectionFormProps<T extends object = Record<string, JsonValue>> {
  sections: SectionDef<T>[];
  values: T;
  onChange: (partial: Partial<T>) => void;
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  /** Whole-form schema for sections that don't declare their own. */
  schema?: ZodTypeAny;
  /** Controlled open set. Omit to let SectionForm own it. */
  openIds?: string[];
  onOpenChange?: (ids: string[]) => void;
  /** `"single"` = accordion. Default `"multi"` — independent sections. */
  expandMode?: "single" | "multi";
  /** Suppress the built-in submit row (a FormShell footer owns it instead). */
  hideActions?: boolean;
  /**
   * Fires whenever live validation recomputes. SectionForm deliberately does
   * NOT mount its own `FormShellContext.Provider` — the owning view keeps the
   * single provider and composes these in, exactly as StepForm did, so a
   * second provider can never shadow the real one.
   */
  onValidationChange?: (
    fieldErrors: Record<string, string>,
    fieldToSectionIndex: Record<string, number>,
  ) => void;
}

/** Sections in render order: required first, original order preserved within each group. */
export function orderSections<T extends object>(sections: SectionDef<T>[]): SectionDef<T>[] {
  return [...sections.filter((s) => s.required), ...sections.filter((s) => !s.required)];
}

/** `fieldName -> index into the ORDERED section list`. */
export function buildFieldToSectionIndex<T extends object>(
  ordered: SectionDef<T>[],
): Record<string, number> {
  const map: Record<string, number> = {};
  ordered.forEach((section, i) => {
    section.fields?.forEach((field) => { map[field] = i; });
  });
  return map;
}

export interface UseSectionFormNavResult<T extends object> {
  /** Sections in render order — required first. */
  ordered: SectionDef<T>[];
  openIds: string[];
  setOpenIds: (ids: string[]) => void;
  /** Expand section `index`, then scroll it into view. */
  goToSection: (index: number) => void;
  fieldToSectionIndex: Record<string, number>;
  /** Descriptors for `useFormShellState`'s `nav.sections`. */
  sectionMeta: FormShellStep[];
}

/**
 * Navigation state for a `<SectionForm>`. Feed `sectionMeta`/`goToSection`/
 * `fieldToSectionIndex` into `useFormShellState(schema, nav)` and `openIds`
 * back into `<SectionForm>`.
 */
export function useSectionFormNav<T extends object = Record<string, JsonValue>>(
  sections: SectionDef<T>[],
  values?: T,
): UseSectionFormNavResult<T> {
  const ordered = useMemo(() => {
    const visible = values
      ? sections.filter((s) => (s.when ? s.when(values) : true))
      : sections;
    return orderSections(visible);
  }, [sections, values]);

  const [openIds, setOpenIds] = useState<string[]>(() =>
    orderSections(sections).filter((s) => s.required).map((s) => s.id),
  );

  const fieldToSectionIndex = useMemo(() => buildFieldToSectionIndex(ordered), [ordered]);

  const sectionMeta = useMemo<FormShellStep[]>(
    () => ordered.map((s) => ({ id: s.id, label: s.label, requiredFields: s.fields })),
    [ordered],
  );

  const goToSection = useCallback((index: number) => {
    const target = ordered[index];
    if (!target) return;
    setOpenIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
    // The panel must MOUNT before it can be scrolled to — expanding is a state
    // update, so defer a frame. Without this the scroll lands on a zero-height
    // collapsed header and the offending field stays off-screen.
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionAnchorId(target.id));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    });
  }, [ordered]);

  return { ordered, openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta };
}

/** DOM id for a section panel — kept in one place so nav and render agree. */
export function sectionAnchorId(id: string): string {
  return `section-${id}`;
}

export function SectionForm<T extends object = Record<string, JsonValue>>({
  sections,
  values,
  onChange,
  onSubmit,
  submitLabel = "Save",
  isLoading = false,
  schema,
  openIds: controlledOpenIds,
  onOpenChange,
  expandMode = "multi",
  hideActions = false,
  onValidationChange,
}: SectionFormProps<T>) {
  const inheritedSchema = useContext(FormSchemaContext);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uncontrolledOpenIds, setUncontrolledOpenIds] = useState<string[]>(() =>
    orderSections(sections).filter((s) => s.required).map((s) => s.id),
  );

  const ordered = useMemo(
    () => orderSections(sections.filter((s) => (s.when ? s.when(values) : true))),
    [sections, values],
  );

  const openIds = controlledOpenIds ?? uncontrolledOpenIds;
  const setOpenIds = useCallback((ids: string[]) => {
    if (!controlledOpenIds) setUncontrolledOpenIds(ids);
    onOpenChange?.(ids);
  }, [controlledOpenIds, onOpenChange]);

  const fieldToSectionIndex = useMemo(() => buildFieldToSectionIndex(ordered), [ordered]);

  // Keep the latest callback without making runValidation depend on it — the
  // caller usually passes an inline arrow, which would otherwise rebuild the
  // validator on every render and re-fire the effect below in a loop.
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  const runValidation = useCallback((nextValues: T) => {
    const activeSchema = schema ?? inheritedSchema;
    if (!activeSchema) return;
    // audit-unvalidated-safeparse-ok: bulk-replaces fieldErrors from the full
    // parse result so a field that just became valid is cleared — which
    // applyZodIssues' incremental setFieldError-per-issue cannot do.
    const parsed = activeSchema.safeParse(nextValues);
    if (parsed.success) {
      setFieldErrors({});
      onValidationChangeRef.current?.({}, fieldToSectionIndex);
      return;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (!issue.path || issue.path.length === 0) continue;
      next[issue.path.map(String).join(".")] = issue.message;
    }
    setFieldErrors(next);
    onValidationChangeRef.current?.(next, fieldToSectionIndex);
  }, [schema, inheritedSchema, fieldToSectionIndex]);

  useEffect(() => {
    runValidation(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, inheritedSchema, fieldToSectionIndex]);

  const handleFieldChange = useCallback((partial: Partial<T>) => {
    onChange(partial);
    runValidation({ ...values, ...partial });
  }, [values, onChange, runValidation]);

  const toggle = useCallback((id: string) => {
    const isOpen = openIds.includes(id);
    if (expandMode === "single") {
      setOpenIds(isOpen ? [] : [id]);
      return;
    }
    setOpenIds(isOpen ? openIds.filter((x) => x !== id) : [...openIds, id]);
  }, [openIds, expandMode, setOpenIds]);

  const errorCountFor = useCallback((section: SectionDef<T>): number => {
    if (!section.fields?.length) return 0;
    return section.fields.filter((f) =>
      Object.keys(fieldErrors).some((k) => k === f || k.startsWith(`${f}.`)),
    ).length;
  }, [fieldErrors]);

  return (
    <Stack gap="md">
      {ordered.map((section) => {
        const isRequired = section.required === true;
        // A required section is always open — it holds the fields without
        // which the record cannot be saved, so hiding it is never useful.
        const isCollapsed = isRequired ? false : !openIds.includes(section.id);
        const errorCount = errorCountFor(section);

        return (
          <CollapsibleSection
            key={section.id}
            id={sectionAnchorId(section.id)}
            title={
              <Row align="center" gap="xs">
                <Span weight="semibold" size="sm">{section.heading ?? section.label}</Span>
                {isRequired && <Span size="xs" color="muted">Required</Span>}
              </Row>
            }
            isCollapsed={isCollapsed}
            onToggle={() => { if (!isRequired) toggle(section.id); }}
            keepMounted={section.keepMounted}
            renderHeaderExtra={
              errorCount > 0
                ? () => (
                    <Badge variant="danger">
                      {errorCount} {errorCount === 1 ? "issue" : "issues"}
                    </Badge>
                  )
                : undefined
            }
          >
            {section.render({ values, onChange: handleFieldChange, errors: fieldErrors })}
          </CollapsibleSection>
        );
      })}

      {!hideActions && (
        <Row justify="end" paddingY="y-sm">
          <Button
            variant="primary"
            type="submit"
            onClick={() => void onSubmit()}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {submitLabel}
          </Button>
        </Row>
      )}
    </Stack>
  );
}

export default SectionForm;
