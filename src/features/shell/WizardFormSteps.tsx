"use client";

/*
 * WHY: `steps?: {title, fields}[]` (3B item 1b's `SurfaceTemplate` proposal)
 *      was specified and never implemented — `groupSectionsByStep`
 *      (`build-sections.tsx`) partitions an already-built `SectionDef[]`;
 *      this component is the missing RENDERER, gating navigation one page
 *      at a time instead of `<SectionForm>`'s own ungated, all-sections
 *      rendering.
 * WHAT: A drop-in replacement for `<SectionForm>` that gates by step when
 *       `steps` is non-empty, and renders EXACTLY `<SectionForm>`'s own
 *       output when it is empty — the default for every surface until an
 *       admin configures a wizard split.
 *
 * Deliberately NOT a change to `SectionForm.tsx` itself: that file has 25+
 * existing callers, none of which know about steps. Wrapping it here means
 * none of them had to change, and a bug in step-gating can never reach a
 * caller that never asked for it.
 *
 * @tag domain:forms
 * @tag layer:shared
 * @tag pattern:slot-shell
 * @tag access:client
 * @tag consumers:surfaces with SurfaceTemplate steps configured
 * @tag sideEffects:none
 */

import { useMemo, useState } from "react";
import { Button } from "../../ui/components/Button";
import { Row, Stack } from "../../ui/components/Layout";
import { Span } from "../../ui/components/Typography";
import { SectionForm, type SectionFormProps } from "./SectionForm";
import { groupSectionsByStep } from "./build-sections";
import type { FormStep } from "./field-ui-meta";

export interface WizardFormStepsProps<T extends object> extends SectionFormProps<T> {
  /** Admin-authored wizard grouping. Empty = no wizard, renders like a bare `<SectionForm>`. */
  steps: FormStep[];
}

export function WizardFormSteps<T extends object>({
  steps,
  sections,
  ...rest
}: WizardFormStepsProps<T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const pages = useMemo(() => groupSectionsByStep(sections, steps), [sections, steps]);

  // No real wizard — `groupSectionsByStep([], [])` style collapse, or a
  // `steps` config whose every named field landed in one page. Render the
  // exact `<SectionForm>` output every non-wizard caller already gets.
  if (pages.length <= 1) {
    return <SectionForm<T> sections={sections} {...rest} />;
  }

  // A step index can outlive the config that produced it (an admin removes
  // a step while someone else's browser tab is mid-wizard) — clamp rather
  // than let `pages[currentStep]` be `undefined`.
  const stepIndex = Math.min(currentStep, pages.length - 1);
  const isLast = stepIndex === pages.length - 1;
  const page = pages[stepIndex];

  return (
    <Stack gap="md">
      <Row gap="sm" wrap aria-label="Form steps">
        {pages.map((p, i) => (
          <Span
            key={i}
            size="xs"
            weight={i === stepIndex ? "semibold" : "normal"}
            color={i === stepIndex ? undefined : "muted"}
          >
            {p.title || `Step ${i + 1}`}
            {i < pages.length - 1 ? " →" : ""}
          </Span>
        ))}
      </Row>
      <SectionForm<T>
        {...rest}
        sections={page.sections}
        // The real submit row (Save/Cancel/Delete) only ever appears on the
        // LAST page — every earlier page is gated by the Next button below,
        // never by SectionForm's own bottom bar.
        hideActions={!isLast}
        onSubmit={isLast ? rest.onSubmit : () => {}}
      />
      <Row gap="sm" justify="between">
        <Button
          variant="outline"
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {!isLast && (
          <Button variant="primary" type="button" onClick={() => setCurrentStep((s) => Math.min(pages.length - 1, s + 1))}>
            Next →
          </Button>
        )}
      </Row>
    </Stack>
  );
}
