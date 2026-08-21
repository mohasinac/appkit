"use client";
import { normalizeError } from "../../../errors/normalize";

import { useApiMutation, sieveFilter, SIEVE_OP, sortBy } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Div, Input, Label, PaginatedSelect, Row, Select, Stack, Text, TextLink } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

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

export interface AdminAdsViewProps {
  endpoint?: string;
  labels?: { title?: string };
  createHref?: string;
  renderEditLink?: (item: AdminAdItem) => React.ReactNode;
}

interface AdsSettingsPanelProps {
  adsenseClientId: string;
  setAdsenseClientId: (v: string) => void;
  thirdPartyScriptUrl: string;
  setThirdPartyScriptUrl: (v: string) => void;
  consentRequired: boolean;
  setConsentRequired: (v: boolean) => void;
  serverCredentialIssues: string[];
  localCredentialIssues: string[];
  credentialStatus: { hasAdsenseClientId: boolean; hasThirdPartyScriptUrl: boolean; issues: string[] } | undefined;
  providerCredentialsMasked: { adsenseClientId?: string; thirdPartyScriptUrl?: string } | undefined;
  settingsMutation: { isPending: boolean };
  hasPendingCredentialInput: boolean;
  currentConsentRequired: boolean;
  settingsMessage: string | null;
  onSave: () => void;
}

function AdsSettingsPanel({
  adsenseClientId, setAdsenseClientId, thirdPartyScriptUrl, setThirdPartyScriptUrl,
  consentRequired, setConsentRequired, serverCredentialIssues, localCredentialIssues,
  credentialStatus, providerCredentialsMasked, settingsMutation, hasPendingCredentialInput,
  currentConsentRequired, settingsMessage, onSave,
}: AdsSettingsPanelProps) {
  return (
    <Stack border="default" className={__P.p3} gap="3" rounded="lg">
      <Text size="sm" weight="semibold">Provider and publish settings</Text>
      <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
        Save provider credentials here before publishing AdSense or third-party inventory.
      </Text>
      {serverCredentialIssues.length > 0 ? (
        <Alert variant="warning" title="Provider credentials need attention">
          {serverCredentialIssues.join("; ")}
        </Alert>
      ) : null}
      <Div layout="grid" gap="3" className="grid-cols-1 md:grid-cols-2">
        <Input
          label="AdSense client id"
          value={adsenseClientId}
          onChange={(event) => setAdsenseClientId(event.target.value)}
          placeholder={providerCredentialsMasked?.adsenseClientId || "ca-pub-XXXXXXXXXX"}
        />
        <Input
          label="Third-party script URL"
          value={thirdPartyScriptUrl}
          onChange={(event) => setThirdPartyScriptUrl(event.target.value)}
          placeholder={providerCredentialsMasked?.thirdPartyScriptUrl || "https://..."}
        />
      </Div>
      <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
        Stored credentials: AdSense {credentialStatus?.hasAdsenseClientId ? "configured" : "missing"} · Third-party {credentialStatus?.hasThirdPartyScriptUrl ? "configured" : "missing"}
      </Text>
      <Row align="center" justify="between" gap="3">
        <Label layout="flex" gap="md" size="sm">
          <Checkbox
            bare
            checked={consentRequired}
            onChange={(event) => setConsentRequired(event.target.checked)}
          />
          Require consent globally for ad rendering
        </Label>
        <Button
          size="sm"
          variant="outline"
          disabled={settingsMutation.isPending || localCredentialIssues.length > 0 || (!hasPendingCredentialInput && consentRequired === Boolean(currentConsentRequired))}
          onClick={onSave}
        >
          {settingsMutation.isPending ? "Saving..." : "Save settings"}
        </Button>
      </Row>
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
    </Stack>
  );
}

export function AdminAdsView({
  endpoint = ADMIN_ENDPOINTS.ADS,
  labels = {},
  createHref = "/admin/ads/new",
  renderEditLink,
}: AdminAdsViewProps) {
  const queryClient = useQueryClient();
  const [consentRequired, setConsentRequired] = React.useState(false);
  const [adsenseClientId, setAdsenseClientId] = React.useState("");
  const [thirdPartyScriptUrl, setThirdPartyScriptUrl] = React.useState("");
  const [settingsMessage, setSettingsMessage] = React.useState<string | null>(null);

  // Lightweight metadata-only fetch (placements, consent, credential status) —
  // decoupled from the paginated listing query DataListingView owns internally.
  const metaQuery = useQuery<AdminAdsListResponse>({
    queryKey: ["admin-ads-meta", endpoint],
    queryFn: () => apiClient.get<AdminAdsListResponse>(`${endpoint}?page=1&pageSize=1`),
    staleTime: 10_000,
  });

  const statusMutation = useApiMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: AdminAdStatus }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.AD_BY_ID(id), { status: nextStatus });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-ads-meta"] });
    },
  });

  React.useEffect(() => {
    if (!metaQuery.data) return;
    setConsentRequired(Boolean(metaQuery.data.consentRequired));
  }, [metaQuery.data]);

  const settingsMutation = useApiMutation({
    mutationFn: async (payload: AdsConfigPatchPayload) => {
      await apiClient.patch(endpoint, payload);
    },
    onSuccess: async () => {
      setSettingsMessage("Ad settings saved.");
      setAdsenseClientId("");
      setThirdPartyScriptUrl("");
      await queryClient.invalidateQueries({ queryKey: ["admin-ads-meta"] });
    },
    onError: (error) => {
      setSettingsMessage(error instanceof Error ? error.message : "Failed to save ad settings");
    },
  });

  const placements = metaQuery.data?.placements ?? [];
  const credentialStatus = metaQuery.data?.providerCredentialStatus;
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
      } catch (_err) {
        void normalizeError(_err);
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

  const columns: AdminTableColumn<AdminAdItemWithValidation>[] = [
    {
      key: "name",
      header: "Ad",
      render: (row) => (
        <Div>
          <Text weight="medium">{row.name}</Text>
          <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{row.id}</Text>
        </Div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (row) => <Text className="tracking-wide" size="xs" transform="uppercase">{row.provider}</Text>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Div>
          <Text className="tracking-wide" size="xs" transform="uppercase">{row.status}</Text>
          {row.publishReady === false ? (
            <Text className="text-[11px] text-error">Publish blocked</Text>
          ) : null}
        </Div>
      ),
    },
    {
      key: "placementIds",
      header: "Placements",
      render: (row) => (
        <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{row.placementIds.join(", ")}</Text>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const nextStatus: AdminAdStatus = row.status === "active" ? "paused" : "active";
        const cannotPublish = nextStatus === "active" && row.publishReady === false;
        return (
          <Row align="center" gap="sm">
            {renderEditLink ? renderEditLink(row) : (
              <TextLink
                variant="bare"
                href={`/admin/ads/${row.id}/edit`}
                rounded="md"
                paddingX="sm"
                size="xs"
                layout="inline-flex"
                align="center"
                className="h-8 border border-neutral-200 border-[var(--appkit-color-border)]"
              >
                Edit
              </TextLink>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={statusMutation.isPending || cannotPublish}
              onClick={() => statusMutation.mutate({ id: row.id, nextStatus })}
            >
              {row.status === "active" ? "Pause" : "Publish"}
            </Button>
          </Row>
        );
      },
    },
  ];

  const config: ListingViewConfig<AdminAdsListResponse, AdminAdItemWithValidation> = {
    portal: "admin",
    title: labels.title ?? "Ad Inventory",
    searchPlaceholder: "Search ads",
    emptyLabel: "No ads found",
    filterKeys: ["status", "provider", "placement"],
    defaultSort: sortBy("updatedAt", "DESC"),
    queryKey: ["admin-ads", endpoint],
    endpoint,
    sortOptions: [{ value: sortBy("updatedAt", "DESC"), label: "Recently updated" }],
    columns,
    mapRows: (response) => response.items as AdminAdItemWithValidation[],
    getTotal: (response) => response.total,
    buildFilters: (state) => {
      const clauses: string[] = [];
      if (state.status) clauses.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state.provider) clauses.push(sieveFilter("provider", SIEVE_OP.EQ, state.provider));
      if (state.placement) clauses.push(sieveFilter("placement", SIEVE_OP.EQ, state.placement));
      return clauses.length ? clauses.join(",") : undefined;
    },
    toolbarExtra: (
      <TextLink
        variant="bare"
        href={createHref}
        rounded="md"
        paddingX="sm"
        size="sm"
        weight="medium"
        layout="inline-flex"
        align="center"
        className="h-9 bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)]"
      >
        New ad
      </TextLink>
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <Select
          label="Status"
          value={pendingFilters.status || "all"}
          options={[
            { label: "All", value: "all" },
            { label: "Draft", value: "draft" },
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Paused", value: "paused" },
          ]}
          onChange={(e) => setPendingFilters((p) => ({ ...p, status: e.target.value === "all" ? "" : e.target.value }))}
        />
        <Select
          label="Provider"
          value={pendingFilters.provider || "all"}
          options={[
            { label: "All", value: "all" },
            { label: "Manual", value: "manual" },
            { label: "AdSense", value: "adsense" },
            { label: "Third Party", value: "thirdParty" },
          ]}
          onChange={(e) => setPendingFilters((p) => ({ ...p, provider: e.target.value === "all" ? "" : e.target.value }))}
        />
        <Label size="sm" color="muted">Placement</Label>
        <PaginatedSelect
          value={pendingFilters.placement || undefined}
          onChange={(v) => setPendingFilters((p) => ({ ...p, placement: (v as string) ?? "" }))}
          options={placements.map((item) => ({ value: item.id, label: item.label }))}
        />
      </Stack>
    ),
    renderAboveContent: () => (
      <Stack gap="md" className={__P.p3}>
        {metaQuery.error ? (
          <Alert variant="error" title="Could not load ads">
            {metaQuery.error instanceof Error ? metaQuery.error.message : "Unknown error"}
          </Alert>
        ) : null}
        <AdsSettingsPanel
          adsenseClientId={adsenseClientId}
          setAdsenseClientId={setAdsenseClientId}
          thirdPartyScriptUrl={thirdPartyScriptUrl}
          setThirdPartyScriptUrl={setThirdPartyScriptUrl}
          consentRequired={consentRequired}
          setConsentRequired={setConsentRequired}
          serverCredentialIssues={serverCredentialIssues}
          localCredentialIssues={localCredentialIssues}
          credentialStatus={credentialStatus}
          providerCredentialsMasked={metaQuery.data?.providerCredentialsMasked}
          settingsMutation={settingsMutation}
          hasPendingCredentialInput={hasPendingCredentialInput}
          currentConsentRequired={Boolean(metaQuery.data?.consentRequired)}
          settingsMessage={settingsMessage}
          onSave={saveSettings}
        />
      </Stack>
    ),
  };

  return <DataListingView config={config} />;
}
