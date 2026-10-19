"use client";

/*
 * WHY: A retry is where the resume clamp becomes visible or invisible, and
 *      invisible is the dangerous one. The server may move the resume point
 *      EARLIER than asked; an operator who requested a fast resume and silently
 *      got a full re-trace concludes the tool is broken.
 * WHAT: Name the new attempt, pick a tier and a resume point, see what the
 *       server will actually do before committing to it.
 *
 * 🛑 THE CLAMP IS SHOWN, NEVER SWALLOWED. `explainResume()` already returns the
 * sentence; this panel's entire reason for existing is that something renders
 * it. Without the clamp a run resumed from `parts` with a changed ridge
 * threshold would carry artifacts generated under DIFFERENT parameters than the
 * run records — and nothing anywhere would contradict it. That is Root Cause
 * #42's shape, which is why the parameter-to-stage grouping is structural
 * rather than a convention.
 *
 * 🛑 The panel PREDICTS the clamp client-side so the operator sees it before
 * submitting, and the server computes it again independently. Those are not
 * redundant: the prediction is an affordance, the server's is the decision.
 * Both call `resolveResumeStage`, so they cannot disagree about which parameter
 * belongs to which stage.
 *
 * 🛑 Built on `<SectionForm>`, not a hand-rolled `<Form>`. Three controls is
 * where a form stops being trivial, and sectionising is what buys the error
 * summary, the jump-to-field link and the pinned mobile action bar for free —
 * audit-form-sectionised is strict-zero on exactly this, and its grandfather
 * list is empty and closed.
 *
 * EXPORTS: StickerRetryPanel
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:tools/sticker-tracer
 * @tag sideEffects:none
 */

import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { normalizeError } from "../../../errors/normalize";
import { Alert, Card, Stack, Text } from "../../../ui/index";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import { SectionForm, type SectionDef } from "../../shell/SectionForm";
import { TRACE_STAGES } from "../../../_internal/shared/features/sticker-trace/types";
import type {
  PrecisionTier,
  TraceParams,
  TraceStage,
} from "../../../_internal/shared/features/sticker-trace/types";
import {
  resolveResumeStage,
  explainResume,
} from "../../../_internal/shared/features/sticker-trace/resume";
import { paramsForTier } from "../../../_internal/shared/features/sticker-trace/config";
import { TIER_HELP } from "../constants/help-content";

const TIERS: PrecisionTier[] = ["draft", "standard", "precise", "max"];

/** This form's own values. */
interface RetryValues {
  name: string;
  tier: PrecisionTier;
  requested: TraceStage;
  [key: string]: unknown;
}

/**
 * 🛑 `.min(1)` on the name, mirroring `requireName` on the server.
 *
 * Validated in both places deliberately rather than redundantly: the schema
 * guards THIS form, `requireName` guards every caller including a future server
 * action. A rule enforced only at the edge is the one the next caller bypasses.
 */
const retrySchema = z.object({
  name: z.string().min(1, "Name this attempt so you can tell it apart later."),
  tier: z.enum(["draft", "standard", "precise", "max"]),
  requested: z.string().min(1),
});

export interface StickerRetryPanelProps {
  /** The run being retried — its name and params seed the form. */
  source: { id: string; name: string; tier: PrecisionTier; params?: TraceParams };
  /** True once the source run's light artifacts have been pruned. */
  artifactsPruned?: boolean;
  onSubmit: (input: {
    name: string;
    tier: PrecisionTier;
    requestedResumeStage: TraceStage;
    paramOverrides?: Record<string, number>;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function StickerRetryPanel({
  source,
  artifactsPruned = false,
  onSubmit,
  onCancel,
}: StickerRetryPanelProps) {
  /*
   * Seeded with the source's name plus a marker rather than left blank. A name
   * is MANDATORY and the server rejects an empty one, so an empty field is a
   * guaranteed round-trip failure on the most common action in the tool.
   */
  const [values, setValues] = useState<RetryValues>({
    name: `${source.name} — retry`,
    tier: source.tier,
    requested: "decode",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = useCallback(
    (partial: Partial<RetryValues>) => setValues((v) => ({ ...v, ...partial })),
    [],
  );

  /*
   * The next run's parameters, resolved exactly as the server will resolve
   * them: tier defaults first, overrides second. Comparing anything else would
   * predict a clamp the server does not apply, or miss one it does.
   */
  const nextParams = useMemo(() => paramsForTier(values.tier), [values.tier]);

  const notice = useMemo(() => {
    if (!source.params) return "";
    return explainResume(
      resolveResumeStage(values.requested, source.params, nextParams),
    );
  }, [source.params, nextParams, values.requested]);

  const submit = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        tier: values.tier,
        requestedResumeStage: values.requested,
      });
    } catch (err) {
      const n = normalizeError(err);
      /*
       * Shown rather than thrown away. A retry that fails silently leaves the
       * operator looking at a form that did nothing — and the likeliest causes,
       * a lapsed session or a rejected name, are both named by the message.
       */
      setError(n.message);
    } finally {
      setPending(false);
    }
  }, [values, onSubmit]);

  const sections = useMemo<SectionDef<RetryValues>[]>(
    () => [
      {
        id: "attempt",
        label: "This attempt",
        required: true,
        fields: ["name", "tier"],
        render: ({ values: v, onChange: set, errors }) => (
          <Stack gap="comfortable">
            <Text size="sm" color="muted">
              This never edits{" "}
              <Text as="span" weight="semibold">
                {source.name}
              </Text>{" "}
              — it creates a new attempt beside it, so both stay comparable.
            </Text>

            <FieldInput
              name="name"
              label="Name this attempt"
              required
              value={v.name}
              error={errors.name}
              onChange={(next) => set({ name: next })}
            />

            <FieldSelect
              name="tier"
              label="Tier"
              value={v.tier}
              options={TIERS.map((t) => ({ value: t, label: TIER_HELP[t].title }))}
              onChange={(next) => set({ tier: next as PrecisionTier })}
            />
            <Text size="xs" color="muted">
              {TIER_HELP[v.tier].body}
            </Text>
          </Stack>
        ),
      },
      {
        id: "resume",
        label: "Where it restarts",
        fields: ["requested"],
        render: ({ values: v, onChange: set }) => (
          <Stack gap="comfortable">
            <FieldSelect
              name="requested"
              label="Resume from"
              value={v.requested}
              options={TRACE_STAGES.map((s) => ({ value: s, label: s }))}
              onChange={(next) => set({ requested: next as TraceStage })}
            />

            {/*
              * The clamp. `explainResume` returns an empty string when nothing
              * was moved, so an absent alert genuinely means "you get what you
              * asked for" rather than "we forgot to tell you".
              */}
            {notice ? <Alert variant="warning">{notice}</Alert> : null}

            {/*
              * Pruning is a DIFFERENT refusal from the clamp and must not be
              * folded into it: the clamp is about parameters, this is about
              * bytes that no longer exist. Resuming against a pruned run would
              * read every missing artifact as an empty result — a
              * successful-looking run with no parts.
              */}
            {artifactsPruned ? (
              <Alert variant="warning">
                This run&apos;s artifacts have been cleared, so the retry starts
                from the beginning whatever you pick here.
              </Alert>
            ) : null}

            {!source.params ? (
              <Text size="xs" color="muted">
                This run predates parameter recording, so the resume point cannot
                be checked ahead of time — the server will decide and tell you.
              </Text>
            ) : null}
          </Stack>
        ),
      },
    ],
    [source.name, source.params, notice, artifactsPruned],
  );

  return (
    <Card variant="default">
      <Stack gap="comfortable">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <SectionForm<RetryValues>
          sections={sections}
          values={values}
          onChange={onChange}
          onSubmit={submit}
          schema={retrySchema}
          submitLabel="Start retry"
          isLoading={pending}
          onCancel={onCancel}
          cancelLabel="Cancel"
        />
      </Stack>
    </Card>
  );
}
