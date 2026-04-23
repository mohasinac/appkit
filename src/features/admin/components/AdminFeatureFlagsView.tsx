"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormActions,
  StackedViewShell,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import { SITE_SETTINGS_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

interface AdminFeatureFlagsSettings {
  featureFlags?: Record<string, boolean>;
}

export interface AdminFeatureFlagsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderFlags?: () => React.ReactNode;
}

export function AdminFeatureFlagsView({
  labels = {},
  renderFlags,
  ...rest
}: AdminFeatureFlagsViewProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSiteSettings<AdminFeatureFlagsSettings>();
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data?.featureFlags) return;
    setFlags(data.featureFlags);
  }, [data]);

  const saveFlags = useMutation({
    mutationFn: async () => {
      await apiClient.patch(SITE_SETTINGS_ENDPOINTS.GET, {
        featureFlags: flags,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setSaveMessage("Feature flags saved.");
    },
    onError: () => {
      setSaveMessage("Failed to save feature flags.");
    },
  });

  const featureKeys = React.useMemo(() => Object.keys(flags), [flags]);

  const formatLabel = (value: string) =>
    value
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase());

  const defaultFlags = () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        saveFlags.mutate();
      }}
      className="space-y-4"
    >
      {featureKeys.map((key) => (
        <Toggle
          key={key}
          checked={Boolean(flags[key])}
          onChange={(value) => {
            setFlags((prev) => ({ ...prev, [key]: value }));
            setSaveMessage(null);
          }}
          label={formatLabel(key)}
        />
      ))}
      <FormActions align="right">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setFlags(data?.featureFlags ?? {});
            setSaveMessage(null);
          }}
          disabled={saveFlags.isPending}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={saveFlags.isPending || featureKeys.length === 0}
        >
          {saveFlags.isPending ? "Saving..." : "Save feature flags"}
        </Button>
      </FormActions>
      {saveMessage ? (
        <Alert
          variant={saveMessage.startsWith("Failed") ? "error" : "success"}
          title={saveMessage.startsWith("Failed") ? "Save failed" : "Saved"}
        >
          {saveMessage}
        </Alert>
      ) : null}
    </Form>
  );

  const loadingAlert = isLoading ? (
    <Alert variant="info" title="Loading settings">
      Fetching feature flags...
    </Alert>
  ) : null;

  const errorAlert = error ? (
    <Alert variant="error" title="Could not load settings">
      {error instanceof Error ? error.message : "Unknown error"}
    </Alert>
  ) : null;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Feature Flags"}
      sections={[loadingAlert, errorAlert, renderFlags?.() ?? defaultFlags()]}
    />
  );
}
