"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Div, Form, FormActions, Heading, Input, Row, Section, Select, Stack, Text, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import type { AnalyticsAlertDocument } from "../../store-extensions/schemas/firestore";

const __P = {
  p5: "p-5",
} as const;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPERATOR_OPTIONS = [
  { value: ">", label: "Greater than (>)" },
  { value: "<", label: "Less than (<)" },
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: "==", label: "Equals (==)" },
];

const METRIC_OPTIONS = [
  { value: "daily_revenue", label: "Daily Revenue (₹)" },
  { value: "daily_orders", label: "Daily Orders" },
  { value: "low_stock", label: "Low Stock (products)" },
  { value: "cancelled_orders", label: "Cancelled Orders" },
  { value: "pending_payouts", label: "Pending Payouts (₹)" },
  { value: "avg_rating", label: "Average Rating" },
  { value: "reviews_count", label: "New Reviews" },
];

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

function AlertCard({
  alert,
  onToggle,
  onDelete,
}: {
  alert: AnalyticsAlertDocument;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
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
        <Toggle
          checked={alert.isActive}
          onChange={(v) => onToggle(alert.id, v)}
          size="sm"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(alert.id)}
          className="text-error hover:text-error"
        >
          Delete
        </Button>
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
  label: string;
  metric: string;
  operator: string;
  threshold: string;
  windowHours: string;
  notifyChannels: string[];
}

const EMPTY_DRAFT: CreateAlertDraft = {
  label: "",
  metric: "daily_orders",
  operator: ">",
  threshold: "",
  windowHours: "24",
  notifyChannels: ["in-app"],
};

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
      return ((res as Record<string, unknown>)?.items ?? []) as AnalyticsAlertDocument[];
    },
  });

  const alerts = data ?? [];

  const createMutation = useApiMutation({
    mutationFn: async () => {
      const payload = {
        label: draft.label,
        metric: draft.metric,
        operator: draft.operator,
        threshold: Number(draft.threshold),
        windowHours: Number(draft.windowHours),
        notifyChannels: draft.notifyChannels,
        scope: "seller",
        isActive: true,
      };
      return apiClient.post(SELLER_ENDPOINTS.ANALYTICS_ALERTS, payload);
    },
    onSuccess: () => {
      showToast("Alert created", "success");
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
      setShowForm(false);
      setDraft(EMPTY_DRAFT);
    },
    onError: () => showToast("Failed to create alert", "error"),
  });

  const toggleMutation = useApiMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(SELLER_ENDPOINTS.ANALYTICS_ALERT_BY_ID(id), { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
    },
    onError: () => showToast("Failed to update alert", "error"),
  });

  const deleteMutation = useApiMutation({
    mutationFn: async (id: string) =>
      apiClient.delete(SELLER_ENDPOINTS.ANALYTICS_ALERT_BY_ID(id)),
    onSuccess: () => {
      showToast("Alert deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["seller", "analytics-alerts"] });
    },
    onError: () => showToast("Failed to delete alert", "error"),
  });

  const toggleChannel = useCallback((ch: string) => {
    setDraft((d) => ({
      ...d,
      notifyChannels: d.notifyChannels.includes(ch)
        ? d.notifyChannels.filter((c) => c !== ch)
        : [...d.notifyChannels, ch],
    }));
  }, []);

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
        <Section className={`${__P.p5} space-y-4`} rounded="xl" border="default">
          <Heading level={3} size="sm" weight="semibold" color="primary">
            Create Alert
          </Heading>
          <Form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
            <Div layout="grid" gap="4" className="sm:grid-cols-2">
              <Input
                label="Alert label"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Low daily orders"
                required
              />
              <Select
                label="Metric"
                value={draft.metric}
                onValueChange={(v) => setDraft((d) => ({ ...d, metric: v }))}
                options={METRIC_OPTIONS}
              />
              <Select
                label="Operator"
                value={draft.operator}
                onValueChange={(v) => setDraft((d) => ({ ...d, operator: v }))}
                options={OPERATOR_OPTIONS}
              />
              <Input
                label="Threshold"
                type="number"
                value={draft.threshold}
                onChange={(e) => setDraft((d) => ({ ...d, threshold: e.target.value }))}
                placeholder="e.g. 10"
                required
              />
              <Select
                label="Check window"
                value={draft.windowHours}
                onValueChange={(v) => setDraft((d) => ({ ...d, windowHours: v }))}
                options={WINDOW_OPTIONS}
              />
            </Div>

            <Div className="mt-3">
              <Text className="mb-2" color="muted" size="xs" weight="medium">
                Notify via
              </Text>
              <Row gap="sm" wrap>
                {CHANNEL_OPTIONS.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
 draft.notifyChannels.includes(ch.value)
 ? "bg-[var(--appkit-color-primary)] text-white border-transparent"
 : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
 }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </Row>
            </Div>

            <FormActions align="right" className="mt-4">
              <Button type="submit" isLoading={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Alert"}
              </Button>
            </FormActions>
          </Form>
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
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
