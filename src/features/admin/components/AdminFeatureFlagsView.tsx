"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Div,
  Form,
  FormActions,
  Input,
  StackedViewShell,
  Text,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

interface FlagData {
  flags: Record<string, boolean>;
  rollouts: Record<string, number>;
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
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery<FlagData>({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FlagData }>(ADMIN_ENDPOINTS.FEATURE_FLAGS);
      return res.data ?? { flags: {}, rollouts: {} };
    },
  });

  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [rollouts, setRollouts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!data) return;
    setFlags(data.flags ?? {});
    setRollouts(data.rollouts ?? {});
  }, [data]);

  const saveFlags = useMutation({
    mutationFn: async () => {
      await apiClient.put(ADMIN_ENDPOINTS.FEATURE_FLAGS, { flags, rollouts });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      showToast("Feature flags saved.", "success");
    },
    onError: () => {
      showToast("Failed to save feature flags.", "error");
    },
  });

  const featureKeys = React.useMemo(() => Object.keys(flags), [flags]);

  const formatLabel = (value: string) =>
    value
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (char) => char.toUpperCase())
      .trim();

  const defaultFlags = () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        saveFlags.mutate();
      }}
      className="space-y-4"
    >
      {featureKeys.length === 0 && !isLoading && (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          No feature flags configured. Add flags to siteSettings.featureFlags to manage them here.
        </Text>
      )}
      {featureKeys.map((key) => (
        <Div
          key={key}
          className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3"
        >
          <Div className="flex-1">
            <Toggle
              checked={Boolean(flags[key])}
              onChange={(value) => {
                setFlags((prev) => ({ ...prev, [key]: value }));
              }}
              label={formatLabel(key)}
            />
            <Text className="mt-0.5 ml-10 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              {key}
            </Text>
          </Div>
          <Div className="flex flex-col gap-1 w-32 shrink-0">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Rollout %
            </Text>
            <Input
              type="number"
              min={0}
              max={100}
              value={rollouts[key] ?? 100}
              onChange={(e) =>
                setRollouts((prev) => ({
                  ...prev,
                  [key]: Math.min(100, Math.max(0, Number(e.target.value))),
                }))
              }
              disabled={!flags[key]}
              className="w-full"
            />
          </Div>
        </Div>
      ))}
      <FormActions align="right">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setFlags(data?.flags ?? {});
            setRollouts(data?.rollouts ?? {});
          }}
          disabled={saveFlags.isPending}
        >
          Reset
        </Button>
        <Button
          type="submit"
          isLoading={saveFlags.isPending}
          disabled={saveFlags.isPending || featureKeys.length === 0}
        >
          Save feature flags
        </Button>
      </FormActions>
    </Form>
  );

  const loadingAlert = isLoading ? (
    <Alert variant="info" title="Loading feature flags">
      Fetching feature flags…
    </Alert>
  ) : null;

  const errorAlert = error ? (
    <Alert variant="error" title="Could not load feature flags">
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
