"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { z } from "zod";
import { alertMetricsForScope } from "../../store-extensions/constants/alert-metrics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Div, Heading, Row, Section, Stack, Text, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import type { AnalyticsAlertDocument } from "../../store-extensions/schemas/firestore";
import {
  analyticsAlertCreateSchema,
  ANALYTICS_ALERT_OPERATORS,
} from "../../store-extensions/schemas/analytics-forms";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { QuickEditMenu } from "../../admin/components/QuickEditMenu";
import type { QuickFieldDef } from "../../shell/QuickFormDrawer";
import type { FormValues } from "../../../schemas/types";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Operators, DERIVED from the schema's own list.
 *
 * The hand-written array had five of the six — `!=` was missing, so "not equal
 * to" could never be chosen although `ALERT_OPERATOR_MAP` declares it and the
 * route accepts it. That map is a `Record<AlertOperator, true>` precisely so
 * the union cannot drift; the drift moved into the UI copy instead.
 */
const OPERATOR_LABELS: Record<string, string> = {
  ">": "Greater than (>)",
  "<": "Less than (<)",
  ">=": "At least (≥)",
  "<=": "At most (≤)",
  "==": "Equals (==)",
  "!=": "Not equal to (≠)",
};

const OPERATOR_OPTIONS = ANALYTICS_ALERT_OPERATORS.map((value) => ({
  value,
  label: OPERATOR_LABELS[value] ?? value,
}));

/*
 * 🛑 DERIVED, never a hand-written list — that list WAS the defect.
 *
 * These seven values (daily_revenue, daily_orders, low_stock,
 * cancelled_orders, pending_payouts, avg_rating, reviews_count) shared ZERO
 * tokens with the four the seed wrote, and nothing validated either because
 * `metric` was `string`. It stayed invisible because no evaluator read the
 * field at all, so an alert a seller configured could never fire.
 *
 * Now from `alertMetricsForScope("seller")`, which the evaluator switches
 * over exhaustively — so a metric the job cannot compute is not offerable.
 */
const METRIC_OPTIONS = alertMetricsForScope("seller").map(({ value, def }) => ({
  value,
  label: def.label,
}));

/** Helper text per metric, so "Orders in the window" says what it counts. */
const METRIC_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  alertMetricsForScope("seller").map(({ value, def }) => [value, def.describes]),
);
const WINDOW_OPTIONS = [
  { value: "1", label: "Last 1 hour" },
  { value: "6", label: "Last 6 hours" },
  { value: "24", label: "Last 24 hours" },
  { value: "168", label: "Last 7 days" },
];

const CHANNEL_OPTIONS = [
  { value: "in-app", label: "In-App notification" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const OPERATOR_BADGE: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  ">": "danger",
  "<": "warning",
  ">=": "danger",
  "<=": "warning",
  "==": "info",
  "!=": "default",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * The three values a seller actually tunes once an alert is live.
 *
 * Deliberately not `metric` or `operator`: changing either turns the alert
 * into a different alert while keeping its firing history, so
 * `lastTriggeredAt`/`lastObservedValue` on the card would then describe a rule
 * that no longer exists. Those stay a delete-and-recreate.
 */
const alertQuickEditSchema = z.object({
  label: z.string().trim().min(1, "A name is required."),
  threshold: z.coerce.number().min(0, "Threshold cannot be negative."),
  windowHours: z.coerce.number().int().min(1),
});

const ALERT_QUICK_FIELDS: QuickFieldDef[] = [
  { name: "label", label: "Name", type: "text", required: true },
  {
    name: "threshold",
    label: "Threshold",
    type: "number",
    required: true,
    helperText: "The value the metric is compared against.",
  },
  {
    name: "windowHours",
    label: "Window",
    type: "select",
    required: true,
    options: WINDOW_OPTIONS,
  },
];

function AlertCard({
  alert,
  onToggle,
  onDelete,
  onEdit,
}: {
  alert: AnalyticsAlertDocument;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, values: FormValues) => Promise<void>;
}) {
  const metricLabel = METRIC_OPTIONS.find((m) => m.value === alert.metric)?.label ?? alert.metric;
  const opLabel = OPERATOR_OPTIONS.find((o) => o.value === alert.operator)?.label ?? alert.operator;
  const windowLabel = WINDOW_OPTIONS.find((w) => w.value === String(alert.windowHours))?.label ?? `${alert.windowHours}h`;

  return (
    <Row surface="card" padding="sm" align="start" justify="between" gap="md">
      <Div className="flex-1 min-w-0">
        <Row className="mb-1" gap="sm" wrap>
          <Text size="sm" weight="medium" color="primary">{alert.label}</Text>
          <Badge variant={alert.isActive ? "success" : "default"}>
            {alert.isActive ? "Active" : "Paused"}
          </Badge>
        </Row>
        <Text className="mb-1" color="muted" size="xs">
          {metricLabel} {opLabel} {alert.threshold} · {windowLabel}
        </Text>
        {/*
          What the metric COUNTS, from the one vocabulary.

          "Daily Orders" does not say whether a cancelled order counts, and an
          alert whose definition the seller has to guess at is one they will
          not trust when it fires. It also surfaces a stale stored metric: a
          value outside the vocabulary has no description, which is the only
          visible signal that a row predates C3a.
        */}
        {METRIC_DESCRIPTIONS[alert.metric] ? (
          <Text className="mb-1" color="muted" size="xs">
            {METRIC_DESCRIPTIONS[alert.metric]}
          </Text>
        ) : null}
        {alert.lastTriggeredAt ? (
          <Text className="mb-1" color="muted" size="xs">
            Last fired {new Date(alert.lastTriggeredAt).toLocaleString()}
            {alert.lastObservedValue != null ? ` at ${alert.lastObservedValue}` : ""}
          </Text>
        ) : null}
        <Row gap="xs" wrap>
          {alert.notifyChannels.map((ch) => (
            <Badge key={ch} variant={OPERATOR_BADGE[alert.operator] ?? "default"}>
              {ch}
            </Badge>
          ))}
        </Row>
        {alert.lastTriggeredAt && (
          <Text className="mt-1" color="faint" size="xs">
            Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString("en-IN")}
          </Text>
        )}
      </Div>
      <Row className="shrink-0" align="center" gap="sm">
        {/*
          Was a bare <Toggle> with neither a `label` nor an `ariaLabel`, so a
          column of these announced nothing but "Toggle".
        */}
        <Toggle
          checked={alert.isActive}
          onChange={(v) => onToggle(alert.id, v)}
          size="sm"
          ariaLabel={`${alert.isActive ? "Pause" : "Resume"} ${alert.label}`}
        />
        {/*
          🛑 EDIT. There was none — the create form is inline and was never
          reused for editing, so changing a THRESHOLD (the one value a seller
          retunes as their volume changes) meant deleting the alert and
          rebuilding it, which also loses its firing history. The PATCH route
          has always taken a partial body.
        */}
        <QuickEditMenu
          actions={[
            {
              label: "Edit alert",
              formTitle: `Edit "${alert.label}"`,
              schema: alertQuickEditSchema,
              fields: ALERT_QUICK_FIELDS,
              defaultValues: {
                label: alert.label,
                threshold: alert.threshold,
                windowHours: String(alert.windowHours),
              },
              onSubmit: (values) => onEdit(alert.id, values),
              submitLabel: "Save alert",
            },
          ]}
        />
        {/*
          Via the registry, so the confirmation is not optional — this was a
          bare ghost button with a raw onClick, and one misplaced click removed
          an alert with nothing to undo it.
        */}
        <Button
          variant="ghost"
          size="sm"
          action={ACTIONS.STORE["delete-analytics-alert"]}
          onClick={() => onDelete(alert.id)}
          className="text-error hover:text-error"
        />
      </Row>
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export interface SellerAnalyticsAlertsViewProps {
  labels?: { title?: string };
}

interface CreateAlertDraft {
  [key: string]: unknown;
  label: string;
  metric: string;
  operator: string;
  threshold: string;
  windowHours: string;
  notifyChannels: string[];
  isActive: boolean;
}

const EMPTY_DRAFT: CreateAlertDraft = {
  label: "",
  metric: "orders_count",
  operator: ">",
  threshold: "",
  windowHours: "24",
  notifyChannels: ["in-app"],
  isActive: true,
};

/**
 * The delivery-channel chips.
 *
 * Module level rather than an inline renderer — an inline one's handler sits
 * six braces deep inside `useMemo`, which is DEEP_NESTING's whole subject.
 */
function ChannelChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (channel: string) => void;
}) {
  return (
    <Stack gap="xs">
      <Text color="muted" size="xs" weight="medium">
        Notify via
      </Text>
      <Row gap="sm" wrap>
        {CHANNEL_OPTIONS.map((ch) => (
          <Button
            variant={selected.includes(ch.value) ? "primary" : "outline"}
            key={ch.value}
            type="button"
            onClick={() => onToggle(ch.value)}
            rounded="full"
            paddingX="sm"
            paddingY="xs"
            textSize="xs"
          >
            {ch.label}
          </Button>
        ))}
      </Row>
    </Stack>
  );
}

export function SellerAnalyticsAlertsView({
  labels = {},
}: SellerAnalyticsAlertsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CreateAlertDraft>(EMPTY_DRAFT);

  const { data, isLoading } = useQuery({
    queryKey: ["seller", "analytics-alerts"],
    queryFn: async () => {
      const res = await apiClient.get(SELLER_ENDPOINTS.ANALYTICS_ALERTS);
      return ((res as Record<string, JsonValue>)?.items ?? []) as unknown as AnalyticsAlertDocument[];
    },
  });

  const alerts = data ?? [];

  const createMutation = useApiMutation({
    errorMessage: "Failed to create alert",
    mutationFn: async (values: JsonValue) =>
      apiClient.post(SELLER_ENDPOINTS.ANALYTICS_ALERTS, values),
    onSuccess: () => {
      showToast("Alert created", "success");
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
      setShowForm(false);
      setDraft(EMPTY_DRAFT);
    },
  });

  const toggleMutation = useApiMutation({
    errorMessage: "Failed to update alert",
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(SELLER_ENDPOINTS.ANALYTICS_ALERT_BY_ID(id), { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete alert",
    mutationFn: async (id: string) =>
      apiClient.delete(SELLER_ENDPOINTS.ANALYTICS_ALERT_BY_ID(id)),
    onSuccess: () => {
      showToast("Alert deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
    },
  });

  const editMutation = useApiMutation({
    errorMessage: "Failed to update alert",
    mutationFn: async ({ id, values }: { id: string; values: FormValues }) => {
      const parsed = alertQuickEditSchema.parse(values);
      return apiClient.patch(SELLER_ENDPOINTS.ANALYTICS_ALERT_BY_ID(id), parsed);
    },
    onSuccess: () => {
      showToast("Alert updated", "success");
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
    },
  });

  const toggleChannel = useCallback((ch: string) => {
    setDraft((d) => ({
      ...d,
      notifyChannels: d.notifyChannels.includes(ch)
        ? d.notifyChannels.filter((c) => c !== ch)
        : [...d.notifyChannels, ch],
    }));
  }, []);

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<CreateAlertDraft>(analyticsAlertCreateSchema, {
        options: {
          metric: METRIC_OPTIONS,
          operator: OPERATOR_OPTIONS,
          windowHours: WINDOW_OPTIONS,
        },
        renderers: {
          notifyChannels: ({ values }) => (
            <ChannelChips selected={values.notifyChannels} onToggle={toggleChannel} />
          ),
        },
      }),
    [toggleChannel],
  );

  const nav = useSectionFormNav(sections, draft, { scope: "store:analytics-alert" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    analyticsAlertCreateSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const submitAlert = () => {
    clearErrors();
    /*
     * Parsed against the SAME schema the route uses, before the request.
     *
     * This form used to hand-build its payload and included `scope: "seller"`
     * — a field the route pins from the session and the schema does not
     * declare. Once that schema became `.strict()`, every "Create Alert"
     * became a 400, and nothing local could have caught it: the client had no
     * schema to check against. The parse is the structural fix; what changed
     * here is only that its issues now reach the fields instead of being
     * flattened into one thrown message.
     */
    const parsed = analyticsAlertCreateSchema.safeParse(
      visibleValues(analyticsAlertCreateSchema, draft),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    createMutation.mutate(parsed.data as JsonValue);
  };

  return (
    <Stack gap="lg">
      <Row justify="between">
        <Heading level={2} size="base" weight="semibold" color="primary">
          {labels.title ?? "Analytics Alerts"}
        </Heading>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Alert"}
        </Button>
      </Row>

      <Text size="sm" color="muted">
        Get notified when a key metric crosses a threshold. Alerts check the metric over the selected window and fire through your chosen channels.
      </Text>

      {showForm && (
        <Section className={`${__P.p5} space-y-[1rem]`} rounded="xl" border="default">
          <Heading level={3} size="sm" weight="semibold" color="primary">
            Create Alert
          </Heading>
          <FormShellContext.Provider value={shellCtx}>
            <FormErrorSummary />
            <SectionForm<CreateAlertDraft>
              sections={sections}
              values={draft}
              onChange={(partial) => setDraft((prev) => ({ ...prev, ...partial }))}
              onSubmit={submitAlert}
              schema={analyticsAlertCreateSchema}
              openIds={nav.openIds}
              onOpenChange={nav.setOpenIds}
              isLoading={createMutation.isPending}
              submitLabel="Create alert"
              onCancel={() => setShowForm(false)}
              /*
               * This panel is one card inside a longer analytics page, not the
               * page's own form — a viewport-pinned Save would claim the
               * bottom tier for a control the reader may have scrolled past.
               */
              bottomBar={false}
            />
          </FormShellContext.Provider>
        </Section>
      )}

      {isLoading && (
        <Stack gap="sm">
          {[1, 2, 3].map((i) => (
            <Div key={i} className="h-16 animate-pulse" surface="subtle" rounded="lg" />
          ))}
        </Stack>
      )}

      {!isLoading && alerts.length === 0 && !showForm && (
        <Alert variant="info">
          No alerts configured. Create an alert to get notified when a key metric crosses a threshold.
        </Alert>
      )}

      {!isLoading && alerts.length > 0 && (
        <Stack gap="3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={async (id, values) => {
                await editMutation.mutateAsync({ id, values });
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
