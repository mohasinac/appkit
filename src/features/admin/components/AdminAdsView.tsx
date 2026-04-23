"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Input, Select, StackedViewShell, Text } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { DataTable } from "./DataTable";
import type { AdminTableColumn } from "../types";

export type AdminAdStatus = "draft" | "active" | "scheduled" | "paused";
export type AdminAdProvider = "manual" | "adsense" | "thirdParty";

export interface AdminAdItem {
  id: string;
  name: string;
  provider: AdminAdProvider;
  status: AdminAdStatus;
  placementIds: string[];
  requiresConsent: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
  updatedAt?: string;
}

interface AdminAdsListResponse {
  items: AdminAdItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  placements: Array<{ id: string; label: string; enabled: boolean; reservedHeight?: number }>;
  consentRequired: boolean;
  providerCredentialsMasked: {
    adsenseClientId?: string;
    thirdPartyScriptUrl?: string;
  };
  providerCredentialStatus?: {
    hasAdsenseClientId: boolean;
    hasThirdPartyScriptUrl: boolean;
    issues: string[];
  };
}

type AdsConfigPatchPayload = {
  consentRequired?: boolean;
  providerCredentials?: {
    adsenseClientId?: string;
    thirdPartyScriptUrl?: string;
  };
};

type AdminAdItemWithValidation = AdminAdItem & {
  publishReady?: boolean;
  publishIssues?: string[];
};

export interface AdminAdsViewProps extends Omit<StackedViewShellProps, "sections"> {
  endpoint?: string;
  labels?: { title?: string };
  createHref?: string;
  renderEditLink?: (item: AdminAdItem) => React.ReactNode;
}

export function AdminAdsView({
  endpoint = ADMIN_ENDPOINTS.ADS,
  labels = {},
  createHref = "/admin/ads/new",
  renderEditLink,
  ...rest
}: AdminAdsViewProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(20);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [provider, setProvider] = React.useState("all");
  const [placement, setPlacement] = React.useState("all");
  const [consentRequired, setConsentRequired] = React.useState(false);
  const [adsenseClientId, setAdsenseClientId] = React.useState("");
  const [thirdPartyScriptUrl, setThirdPartyScriptUrl] = React.useState("");
  const [settingsMessage, setSettingsMessage] = React.useState<string | null>(null);

  const queryKey = ["admin-ads", endpoint, page, pageSize, q, status, provider, placement] as const;
  const adsQuery = useQuery<AdminAdsListResponse>({
    queryKey,
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));
      if (q.trim()) sp.set("q", q.trim());
      if (status !== "all") sp.set("status", status);
      if (provider !== "all") sp.set("provider", provider);
      if (placement !== "all") sp.set("placement", placement);
      return apiClient.get<AdminAdsListResponse>(`${endpoint}?${sp.toString()}`);
    },
    staleTime: 10_000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: AdminAdStatus }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.AD_BY_ID(id), { status: nextStatus });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
  });

  React.useEffect(() => {
    if (!adsQuery.data) return;
    setConsentRequired(Boolean(adsQuery.data.consentRequired));
  }, [adsQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: async (payload: AdsConfigPatchPayload) => {
      await apiClient.patch(endpoint, payload);
    },
    onSuccess: async () => {
      setSettingsMessage("Ad settings saved.");
      setAdsenseClientId("");
      setThirdPartyScriptUrl("");
      await queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: (error) => {
      setSettingsMessage(error instanceof Error ? error.message : "Failed to save ad settings");
    },
  });

  const rows = (adsQuery.data?.items ?? []) as AdminAdItemWithValidation[];
  const columns = React.useMemo<AdminTableColumn<AdminAdItemWithValidation>[]>(() => [
    {
      key: "name",
      header: "Ad",
      render: (row) => (
        <div>
          <Text className="font-medium">{row.name}</Text>
          <Text className="text-xs text-neutral-500 dark:text-zinc-400">{row.id}</Text>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (row) => <Text className="text-xs uppercase tracking-wide">{row.provider}</Text>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div>
          <Text className="text-xs uppercase tracking-wide">{row.status}</Text>
          {row.publishReady === false ? (
            <Text className="text-[11px] text-red-600 dark:text-red-300">Publish blocked</Text>
          ) : null}
        </div>
      ),
    },
    {
      key: "placementIds",
      header: "Placements",
      render: (row) => (
        <Text className="text-xs text-neutral-500 dark:text-zinc-400">{row.placementIds.join(", ")}</Text>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const nextStatus: AdminAdStatus = row.status === "active" ? "paused" : "active";
        const cannotPublish = nextStatus === "active" && row.publishReady === false;
        return (
          <div className="flex items-center gap-2">
            {renderEditLink ? renderEditLink(row) : (
              <a
                className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-xs dark:border-slate-700"
                href={`/admin/ads/${row.id}/edit`}
              >
                Edit
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={statusMutation.isPending || cannotPublish}
              onClick={() => statusMutation.mutate({ id: row.id, nextStatus })}
            >
              {row.status === "active" ? "Pause" : "Publish"}
            </Button>
          </div>
        );
      },
    },
  ], [renderEditLink, statusMutation]);

  const placements = adsQuery.data?.placements ?? [];
  const credentialStatus = adsQuery.data?.providerCredentialStatus;
  const serverCredentialIssues = credentialStatus?.issues ?? [];

  const localCredentialIssues = React.useMemo(() => {
    const issues: string[] = [];
    if (adsenseClientId.trim() && !/^ca-pub-[0-9]{10,20}$/.test(adsenseClientId.trim())) {
      issues.push("AdSense client id must match format ca-pub-XXXXXXXXXX");
    }
    if (thirdPartyScriptUrl.trim()) {
      try {
        const parsed = new URL(thirdPartyScriptUrl.trim());
        if (parsed.protocol !== "https:") {
          issues.push("Third-party script URL must be https");
        }
      } catch {
        issues.push("Third-party script URL must be a valid URL");
      }
    }
    return issues;
  }, [adsenseClientId, thirdPartyScriptUrl]);

  const hasPendingCredentialInput =
    adsenseClientId.trim().length > 0 || thirdPartyScriptUrl.trim().length > 0;

  const saveSettings = () => {
    setSettingsMessage(null);
    const payload: AdsConfigPatchPayload = {
      consentRequired,
      providerCredentials: {
        adsenseClientId: adsenseClientId.trim() || undefined,
        thirdPartyScriptUrl: thirdPartyScriptUrl.trim() || undefined,
      },
    };
    settingsMutation.mutate(payload);
  };

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Ad Inventory"}
      sections={[
        <div className="flex items-center justify-between gap-3">
          <Text variant="secondary">Manage ad inventory, placement mapping, and publishing state.</Text>
          <a
            href={createHref}
            className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New ad
          </a>
        </div>,
        adsQuery.error ? (
          <Alert variant="error" title="Could not load ads">
            {adsQuery.error instanceof Error ? adsQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        <div className="rounded-lg border border-neutral-200 dark:border-slate-700 p-3 space-y-3">
          <Text className="text-sm font-semibold">Provider and publish settings</Text>
          <Text className="text-xs text-neutral-500 dark:text-zinc-400">
            Save provider credentials here before publishing AdSense or third-party inventory.
          </Text>
          {serverCredentialIssues.length > 0 ? (
            <Alert variant="warning" title="Provider credentials need attention">
              {serverCredentialIssues.join("; ")}
            </Alert>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="AdSense client id"
              value={adsenseClientId}
              onChange={(event) => setAdsenseClientId(event.target.value)}
              placeholder={adsQuery.data?.providerCredentialsMasked?.adsenseClientId || "ca-pub-XXXXXXXXXX"}
            />
            <Input
              label="Third-party script URL"
              value={thirdPartyScriptUrl}
              onChange={(event) => setThirdPartyScriptUrl(event.target.value)}
              placeholder={adsQuery.data?.providerCredentialsMasked?.thirdPartyScriptUrl || "https://..."}
            />
          </div>
          <Text className="text-xs text-neutral-500 dark:text-zinc-400">
            Stored credentials: AdSense {credentialStatus?.hasAdsenseClientId ? "configured" : "missing"} · Third-party {credentialStatus?.hasThirdPartyScriptUrl ? "configured" : "missing"}
          </Text>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={consentRequired}
                onChange={(event) => setConsentRequired(event.target.checked)}
              />
              Require consent globally for ad rendering
            </label>
            <Button
              size="sm"
              variant="outline"
              disabled={settingsMutation.isPending || localCredentialIssues.length > 0 || (!hasPendingCredentialInput && consentRequired === Boolean(adsQuery.data?.consentRequired))}
              onClick={saveSettings}
            >
              {settingsMutation.isPending ? "Saving..." : "Save settings"}
            </Button>
          </div>
          {localCredentialIssues.length > 0 ? (
            <Alert variant="error" title="Fix settings before saving">
              {localCredentialIssues.join("; ")}
            </Alert>
          ) : null}
          {settingsMessage ? (
            <Alert variant={settingsMessage.toLowerCase().includes("failed") ? "error" : "success"} title="Settings">
              {settingsMessage}
            </Alert>
          ) : null}
        </div>,
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Search"
            value={q}
            onChange={(event) => {
              setPage(1);
              setQ(event.target.value);
            }}
            placeholder="Search ads"
          />
          <Select
            label="Status"
            value={status}
            options={[
              { label: "All", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Active", value: "active" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Paused", value: "paused" },
            ]}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          />
          <Select
            label="Provider"
            value={provider}
            options={[
              { label: "All", value: "all" },
              { label: "Manual", value: "manual" },
              { label: "AdSense", value: "adsense" },
              { label: "Third Party", value: "thirdParty" },
            ]}
            onChange={(event) => {
              setPage(1);
              setProvider(event.target.value);
            }}
          />
          <Select
            label="Placement"
            value={placement}
            options={[
              { label: "All", value: "all" },
              ...placements.map((item) => ({ label: item.label, value: item.id })),
            ]}
            onChange={(event) => {
              setPage(1);
              setPlacement(event.target.value);
            }}
          />
        </div>,
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={adsQuery.isLoading}
          currentPage={adsQuery.data?.page ?? page}
          totalPages={adsQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
          emptyLabel="No ads found"
        />,
      ]}
    />
  );
}
