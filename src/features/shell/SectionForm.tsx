"use client";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import type { ZodTypeAny } from "zod";
import { Button } from "../../ui/components/Button";
import { CollapsibleSection } from "../../ui/components/CollapsibleSection";
import { Badge } from "../../ui/components/Badge";
import { Div, Row, Span, Stack } from "../../ui";
import { FormShellContext, type FormShellStep } from "../../ui/forms/FormShell";
import { useFormBottomActions } from "../layout/hooks/useFormBottomActions";
import { useSectionState } from "../account/hooks/useCollapsedSections";
import { FormSchemaContext } from "./FormShell";
import { EASE_OUT_MS } from "../../tokens/motion";

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
   * Secondary action for the pinned mobile bar. Omit on a settings page with
   * nowhere to go back to — the bar then shows Save alone.
   */
  onCancel?: () => void;
  cancelLabel?: string;
  /**
   * A destructive action for this record — almost always Delete.
   *
   * Added because an edit page nearly always has one and `SectionForm` had
   * nowhere to put it, which left two bad options: hand-roll a row and pass
   * `hideActions` (which ALSO silences the pinned mobile bar, since it is
   * gated `bottomBar && !hideActions` — and that bar is the main reason to
   * sectionise a short form), or render it outside the form, where every page
   * invents its own placement.
   *
   * Rendered LEFT-aligned, opposite Save, so it is not adjacent to the
   * primary action — a Delete beside Save is a misclick waiting to happen.
   * `confirm` is expected to come from an ActionDef's `confirmation` config
   * (Rule #7); this only carries the label and handler.
   */
  destructiveAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  /**
   * Publish Save/Cancel and the error sheet into the mobile bottom-chrome
   * tier. On by default: a SectionForm is a page-level form, which is exactly
   * the case the pinned bar exists for. The hook suppresses itself inside a
   * Modal or SideDrawer regardless, so this is only for the rarer case of a
   * page that wants to own the bar itself.
   */
  bottomBar?: boolean;
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

export interface UseSectionFormNavOptions {
  /**
   * `"{portal}:{surface}"` — persists this form's open set to the user's
   * profile. Omit for in-memory-only, which is the default and what every
   * pre-existing call site gets.
   */
  scope?: string;
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
  opts?: UseSectionFormNavOptions,
): UseSectionFormNavResult<T> {
  const ordered = useMemo(() => {
    const visible = values
      ? sections.filter((s) => (s.when ? s.when(values) : true))
      : sections;
    return orderSections(visible);
  }, [sections, values]);

  const sectionIds = useMemo(() => ordered.map((s) => s.id), [ordered]);
  const defaultOpen = useMemo(
    () => ordered.filter((s) => s.required).map((s) => s.id),
    [ordered],
  );

  /*
   * The open set is `useSectionState`, not a local `useState` — which is what
   * makes "expand section 3, reload, find it still expanded" true. `scope: ""`
   * (the default) is EPHEMERAL: identical in-memory behaviour to the previous
   * `useState`, so the seven existing call sites are unchanged until each names
   * a durable scope. Without that opt-out every unnamed form would share one
   * `sectionState[""]` entry and fight over it.
   */
  const { openIds, setOpenIds, open } = useSectionState({
    scope: opts?.scope ?? "",
    sectionIds,
    defaultOpen,
    mode: "multi",
  });

  const fieldToSectionIndex = useMemo(() => buildFieldToSectionIndex(ordered), [ordered]);

  const sectionMeta = useMemo<FormShellStep[]>(
    () => ordered.map((s) => ({ id: s.id, label: s.label, requiredFields: s.fields })),
    [ordered],
  );

  const goToSection = useCallback((index: number) => {
    const target = ordered[index];
    if (!target) return;
    open(target.id);
    scrollToSection(target.id);
  }, [ordered, open]);

  return { ordered, openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta };
}

/** DOM id for a section panel — kept in one place so nav and render agree. */
export function sectionAnchorId(id: string): string {
  return `section-${id}`;
}

/**
 * Scroll a section into view and focus the first invalid control inside it.
 *
 * Deliberately module-level and shared by `goToSection` and `SectionForm`'s own
 * submit handler: the deferred frame is the load-bearing part and is easy to
 * drop when copying. The panel must MOUNT before it can be scrolled to —
 * expanding is a state update, so without the deferral the scroll lands on a
 * zero-height collapsed header and the offending field stays off-screen.
 */
export function scrollToSection(id: string): void {
  if (typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const el = document.getElementById(sectionAnchorId(id));
    if (!el) return;

    /*
     * The header is already at its final position, so scrolling can happen on
     * the next frame.
     */
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    /*
     * Focusing the offending field cannot.
     *
     * `<Collapse>` animates height 0 -> auto over EASE_OUT_MS, and Framer
     * drives that with rAF rather than a CSS transition — so there is no
     * `transitionend` to wait for, and one `requestAnimationFrame` lands while
     * the panel is still ~0px tall inside `overflow: hidden`. Focusing there
     * makes the browser scroll-anchor against a box that is about to grow,
     * which is why "jump to error" could leave the field off-screen.
     *
     * A required section renders with no <Collapse> at all, so it is already
     * at full height and this simply fires a tick later than it needs to.
     */
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const focusInvalid = () =>
      el.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();

    if (reduced) focusInvalid();
    else window.setTimeout(focusInvalid, EASE_OUT_MS);
  });
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
  destructiveAction,
  onValidationChange,
  onCancel,
  cancelLabel,
  bottomBar = true,
}: SectionFormProps<T>) {
  const inheritedSchema = useContext(FormSchemaContext);
  /*
   * SectionForm deliberately does not OWN a FormShellContext (the owning view
   * keeps the provider — see the prop docs above), but it does own the submit
   * button, so it is the one place that knows an attempt happened. Null when
   * a caller renders it outside a provider, which is legitimate.
   */
  const shellCtx = useContext(FormShellContext);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uncontrolledOpenIds, setUncontrolledOpenIds] = useState<string[]>(() =>
    orderSections(sections).filter((s) => s.required).map((s) => s.id),
  );
  /*
   * Sections held open because they hold a validation error, kept SEPARATE
   * from `openIds`.
   *
   * Under `expandMode: "single"` the open set is an accordion — opening any
   * other section replaces it — so a section revealed by a failed submit would
   * be collapsed again by the user's very next click, hiding the error they
   * were sent to fix. This set is unioned into the rendered state and is pruned
   * per-section as each one's errors clear (below), so it can never wedge a
   * section open once it is valid.
   */
  const [forceOpenIds, setForceOpenIds] = useState<string[]>([]);

  const ordered = useMemo(
    () => orderSections(sections.filter((s) => (s.when ? s.when(values) : true))),
    [sections, values],
  );

  const openIds = controlledOpenIds ?? uncontrolledOpenIds;
  const setOpenIds = useCallback((ids: string[]) => {
    if (!controlledOpenIds) setUncontrolledOpenIds(ids);
    onOpenChange?.(ids);
  }, [controlledOpenIds, onOpenChange]);

  /*
   * `ordered` depends on `values`, so it is a NEW array on every keystroke.
   * Anything derived from it must key on the visible section SET instead, or
   * the effect below re-fires per character — running a second full-tree
   * `safeParse` on top of the one `handleFieldChange` already performs, and
   * rebuilding every downstream callback with it.
   *
   * `ordered` itself must keep recomputing: a `when()` predicate can flip
   * mid-typing and a section can appear or disappear. It is only the DERIVED
   * values that are stable across that.
   */
  const visibleSectionKey = ordered.map((s) => s.id).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fieldToSectionIndex = useMemo(() => buildFieldToSectionIndex(ordered), [visibleSectionKey]);

  // Keep the latest callback without making runValidation depend on it — the
  // caller usually passes an inline arrow, which would otherwise rebuild the
  // validator on every render and re-fire the effect below in a loop.
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  /** Section ids holding at least one error, in render order. */
  const erroringSectionIds = useCallback((errs: Record<string, string>): string[] => {
    const keys = Object.keys(errs);
    if (keys.length === 0) return [];
    return ordered
      .filter((s) => s.fields?.some((f) => keys.some((k) => k === f || k.startsWith(`${f}.`))))
      .map((s) => s.id);
  }, [ordered]);

  const runValidation = useCallback((nextValues: T) => {
    const activeSchema = schema ?? inheritedSchema;
    if (!activeSchema) return;
    // audit-unvalidated-safeparse-ok: bulk-replaces fieldErrors from the full
    // parse result so a field that just became valid is cleared — which
    // applyZodIssues' incremental setFieldError-per-issue cannot do.
    const parsed = activeSchema.safeParse(nextValues);
    if (parsed.success) {
      setFieldErrors({});
      setForceOpenIds([]);
      onValidationChangeRef.current?.({}, fieldToSectionIndex);
      return;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (!issue.path || issue.path.length === 0) continue;
      next[issue.path.map(String).join(".")] = issue.message;
    }
    setFieldErrors(next);
    // Release a force-opened section as soon as ITS OWN errors clear, rather
    // than waiting for the whole form to become valid — otherwise fixing
    // section 1 leaves it pinned open while the user works through section 5.
    const stillBad = new Set(erroringSectionIds(next));
    setForceOpenIds((prev) => {
      const kept = prev.filter((id) => stillBad.has(id));
      return kept.length === prev.length ? prev : kept;
    });
    onValidationChangeRef.current?.(next, fieldToSectionIndex);
  }, [schema, inheritedSchema, fieldToSectionIndex, erroringSectionIds]);

  useEffect(() => {
    runValidation(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, inheritedSchema, fieldToSectionIndex]);

  const handleFieldChange = useCallback((partial: Partial<T>) => {
    onChange(partial);
    runValidation({ ...values, ...partial });
  }, [values, onChange, runValidation]);

  /*
   * The one submit path, shared by the inline button below and the pinned
   * mobile bar — so an attempt is recorded and the error sheet revealed
   * identically whichever the user presses.
   */
  const handleSubmit = useCallback(() => {
    shellCtx?.markSubmitAttempted();

    /*
     * Reveal the FIRST offending section — only the first. Expanding all five
     * at once loses the user's place, and the per-section error badge already
     * points at the rest.
     *
     * This is additive: `onSubmit` still fires exactly as before, so a caller
     * that does its own parse or lets the server decide is unaffected. Blocking
     * here would change behaviour for all thirteen call sites, and `fieldErrors`
     * is only ever populated when a schema is present — a schema-less form
     * finds nothing to expand and falls straight through.
     */
    const [firstBadId] = erroringSectionIds(fieldErrors);
    if (firstBadId) {
      setForceOpenIds((prev) => (prev.includes(firstBadId) ? prev : [...prev, firstBadId]));
      if (!openIds.includes(firstBadId)) {
        setOpenIds(expandMode === "single" ? [firstBadId] : [...openIds, firstBadId]);
      }
      scrollToSection(firstBadId);
    }

    void onSubmit();
  }, [shellCtx, onSubmit, erroringSectionIds, fieldErrors, openIds, setOpenIds, expandMode]);

  useFormBottomActions({
    onSubmit: handleSubmit,
    onCancel,
    submitLabel,
    cancelLabel,
    isLoading,
    destructiveAction,
    enabled: bottomBar && !hideActions,
  });

  const toggle = useCallback((id: string) => {
    /*
     * A DIRECT click on the header always wins. `forceOpenIds` exists to
     * survive an INDIRECT collapse — the accordion closing this section because
     * a sibling was opened — not to make the header unresponsive. Leaving the
     * id in the set here would mean clicking a section holding an error does
     * visibly nothing, which reads as a broken control and is worse than the
     * hidden error it was protecting against.
     */
    setForceOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev));
    const isOpen = openIds.includes(id) || forceOpenIds.includes(id);
    if (expandMode === "single") {
      setOpenIds(isOpen ? [] : [id]);
      return;
    }
    setOpenIds(isOpen ? openIds.filter((x) => x !== id) : [...openIds, id]);
  }, [openIds, forceOpenIds, expandMode, setOpenIds]);

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
        /*
         * A required section is always open — it holds the fields without
         * which the record cannot be saved, so hiding it is never useful.
         *
         * `collapsible={!isRequired}` below is what makes that VISIBLE: the
         * header renders as a plain heading with no control. Previously this
         * flag only forced `isCollapsed` false while the header still drew a
         * chevron button, so the section was permanently open AND appeared
         * broken. `onToggle` no longer needs its `if (!isRequired)` guard,
         * because a static header has nothing to click.
         */
        const isCollapsed = isRequired
          ? false
          : !(openIds.includes(section.id) || forceOpenIds.includes(section.id));
        const errorCount = errorCountFor(section);

        return (
          <CollapsibleSection
            key={section.id}
            id={sectionAnchorId(section.id)}
            title={
              /*
               * `as="span"` matters: a collapsible section's header renders
               * this INSIDE a <button>, and <Row>'s default <div> made that
               * <button><div><span><div> — invalid, since a button may only
               * contain phrasing content. Same variant props, legal element.
               */
              <Row as="span" align="center" gap="xs" className="min-w-0">
                <Span weight="semibold" size="sm">{section.heading ?? section.label}</Span>
                {isRequired && <Span size="xs" color="muted">Required</Span>}
              </Row>
            }
            isCollapsed={isCollapsed}
            collapsible={!isRequired}
            onToggle={() => toggle(section.id)}
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
        /*
         * `justify="between"` so a destructive action sits opposite Save
         * rather than beside it. With no destructive action the empty <Div>
         * still holds the left edge, keeping Save right-aligned.
         *
         * Cancel is rendered HERE as well as in the mobile bar. It used to
         * exist only in the bar, so every page converted to SectionForm
         * silently lost its Cancel button on desktop — found converting
         * `store/categories/new`, which had one before.
         */
        <Row justify="between" align="center" paddingY="y-sm" gap="sm" wrap>
          <Div>
            {destructiveAction && (
              <Button
                variant="danger"
                type="button"
                onClick={destructiveAction.onClick}
                disabled={destructiveAction.disabled || isLoading}
              >
                {destructiveAction.label}
              </Button>
            )}
          </Div>
          <Row gap="sm">
            {onCancel && (
              <Button
                variant="ghost"
                type="button"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              variant="primary"
              type="submit"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {submitLabel}
            </Button>
          </Row>
        </Row>
      )}
    </Stack>
  );
}

export default SectionForm;
