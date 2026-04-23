"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormActions,
  Input,
  Select,
  StackedViewShell,
  Text,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface AdminAdEditorViewProps extends Omit<StackedViewShellProps, "sections"> {
  adId?: string;
  endpointBase?: string;
  labels?: { title?: string };
  onSaved?: (id: string) => void;
}

interface Placement {
  id: string;
  label: string;
  enabled: boolean;
  reservedHeight?: number;
}

interface AdPayload {
  id?: string;
  name: string;
  provider: "manual" | "adsense" | "thirdParty";
  status: "draft" | "active" | "scheduled" | "paused";
  placementIds: string[];
  requiresConsent: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
  creative: {
    title?: string;
    body?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaHref?: string;
    adsenseSlot?: string;
    thirdPartyUrl?: string;
  };
}

interface AdByIdResponse {
  item: AdPayload;
  placements: Placement[];
  consentRequired: boolean;
}

interface AdsListResponse {
  placements: Placement[];
  consentRequired: boolean;
  providerCredentialStatus?: {
    hasAdsenseClientId: boolean;
    hasThirdPartyScriptUrl: boolean;
    issues: string[];
  };
}

export function AdminAdEditorView({
  adId,
  endpointBase = ADMIN_ENDPOINTS.ADS,
  labels = {},
  onSaved,
  ...rest
}: AdminAdEditorViewProps) {
  const [name, setName] = React.useState("");
  const [provider, setProvider] = React.useState<"manual" | "adsense" | "thirdParty">("manual");
  const [status, setStatus] = React.useState<"draft" | "active" | "scheduled" | "paused">("draft");
  const [priority, setPriority] = React.useState(0);
  const [requiresConsent, setRequiresConsent] = React.useState(false);
  const [selectedPlacements, setSelectedPlacements] = React.useState<string[]>([]);
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [ctaLabel, setCtaLabel] = React.useState("");
  const [ctaHref, setCtaHref] = React.useState("");
  const [adsenseSlot, setAdsenseSlot] = React.useState("");
  const [thirdPartyUrl, setThirdPartyUrl] = React.useState("");
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const metaQuery = useQuery<AdsListResponse>({
    queryKey: ["admin-ads-editor-meta", endpointBase],
    queryFn: () => apiClient.get<AdsListResponse>(endpointBase),
    staleTime: 15_000,
  });

  const adQuery = useQuery<AdByIdResponse>({
    queryKey: ["admin-ad-by-id", adId],
    queryFn: () => apiClient.get<AdByIdResponse>(ADMIN_ENDPOINTS.AD_BY_ID(adId!)),
    enabled: Boolean(adId),
    staleTime: 15_000,
  });

  React.useEffect(() => {
    if (!adQuery.data?.item) return;
    const item = adQuery.data.item;
    setName(item.name || "");
    setProvider(item.provider || "manual");
    setStatus(item.status || "draft");
    setPriority(item.priority ?? 0);
    setRequiresConsent(Boolean(item.requiresConsent));
    setSelectedPlacements(item.placementIds ?? []);
    setStartAt(item.startAt || "");
    setEndAt(item.endAt || "");
    setTitle(item.creative?.title || "");
    setBody(item.creative?.body || "");
    setImageUrl(item.creative?.imageUrl || "");
    setCtaLabel(item.creative?.ctaLabel || "");
    setCtaHref(item.creative?.ctaHref || "");
    setAdsenseSlot(item.creative?.adsenseSlot || "");
    setThirdPartyUrl(item.creative?.thirdPartyUrl || "");
  }, [adQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: AdPayload = {
        name,
        provider,
        status,
        priority,
        requiresConsent,
        placementIds: selectedPlacements,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
        creative: {
          title: title || undefined,
          body: body || undefined,
          imageUrl: imageUrl || undefined,
          ctaLabel: ctaLabel || undefined,
          ctaHref: ctaHref || undefined,
          adsenseSlot: adsenseSlot || undefined,
          thirdPartyUrl: thirdPartyUrl || undefined,
        },
      };

      if (adId) {
        await apiClient.patch(ADMIN_ENDPOINTS.AD_BY_ID(adId), payload);
        return adId;
      }
      const created = await apiClient.post<{ id: string }>(endpointBase, payload);
      return created.id;
    },
    onSuccess: (savedId) => {
      setSaveMessage("Saved successfully.");
      if (savedId) {
        onSaved?.(savedId);
      }
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Save failed");
    },
  });

  const placements = adQuery.data?.placements ?? metaQuery.data?.placements ?? [];
  const providerCredentialStatus = metaQuery.data?.providerCredentialStatus;

  const publishIssues = React.useMemo(() => {
    const issues: string[] = [];
    const now = Date.now();

    if (!name.trim()) {
      issues.push("Ad name is required");
    }

    if (selectedPlacements.length === 0) {
      issues.push("Select at least one placement");
    }

    const knownPlacementIds = new Set(placements.map((placement) => placement.id));
    const enabledPlacementIds = new Set(
      placements.filter((placement) => placement.enabled).map((placement) => placement.id),
    );

    const unknownPlacements = selectedPlacements.filter((placementId) => !knownPlacementIds.has(placementId));
    if (unknownPlacements.length > 0) {
      issues.push(`Unknown placements: ${unknownPlacements.join(", ")}`);
    }

    const disabledPlacements = selectedPlacements.filter((placementId) => !enabledPlacementIds.has(placementId));
    if (disabledPlacements.length > 0) {
      issues.push(`Selected placements are disabled: ${disabledPlacements.join(", ")}`);
    }

    const startMs = startAt ? new Date(startAt).getTime() : null;
    const endMs = endAt ? new Date(endAt).getTime() : null;

    if (startAt && Number.isNaN(startMs)) {
      issues.push("Start date must be a valid ISO timestamp");
    }
    if (endAt && Number.isNaN(endMs)) {
      issues.push("End date must be a valid ISO timestamp");
    }
    if (
      startMs !== null &&
      endMs !== null &&
      !Number.isNaN(startMs) &&
      !Number.isNaN(endMs) &&
      endMs <= startMs
    ) {
      issues.push("End date must be after start date");
    }

    if (status === "scheduled") {
      if (!startAt || startMs === null || Number.isNaN(startMs)) {
        issues.push("Scheduled ads require a valid start date");
      } else if (startMs <= now) {
        issues.push("Scheduled ads must start in the future");
      }
    }

    if (status === "active") {
      if (startMs !== null && !Number.isNaN(startMs) && startMs > now) {
        issues.push("Active ads cannot have a future start date");
      }
      if (endMs !== null && !Number.isNaN(endMs) && endMs <= now) {
        issues.push("Active ads cannot have an end date in the past");
      }
    }

    if (provider === "manual") {
      if (!title.trim() && !body.trim() && !imageUrl.trim() && !ctaHref.trim()) {
        issues.push("Manual ads need at least one creative field (title, body, image, or CTA URL)");
      }
    }

    if (provider === "adsense") {
      if (!adsenseSlot.trim()) {
        issues.push("AdSense ads require an AdSense slot id");
      }
      if (!providerCredentialStatus?.hasAdsenseClientId) {
        issues.push("AdSense provider credentials are missing in ad settings");
      }
    }

    if (provider === "thirdParty") {
      if (!thirdPartyUrl.trim()) {
        issues.push("Third-party ads require a third-party URL");
      } else {
        try {
          const parsed = new URL(thirdPartyUrl.trim());
          if (parsed.protocol !== "https:") {
            issues.push("Third-party ad URL must be https");
          }
        } catch {
          issues.push("Third-party ad URL must be a valid URL");
        }
      }
      if (!providerCredentialStatus?.hasThirdPartyScriptUrl) {
        issues.push("Third-party provider script URL is missing in ad settings");
      }
    }

    return issues;
  }, [
    adsenseSlot,
    body,
    ctaHref,
    endAt,
    imageUrl,
    name,
    placements,
    provider,
    providerCredentialStatus?.hasAdsenseClientId,
    providerCredentialStatus?.hasThirdPartyScriptUrl,
    selectedPlacements,
    startAt,
    status,
    thirdPartyUrl,
    title,
  ]);

  const publishHardeningRequired = status === "active" || status === "scheduled";
  const blockedByPublishValidation = publishHardeningRequired && publishIssues.length > 0;

  const togglePlacement = (placementId: string) => {
    setSelectedPlacements((prev) =>
      prev.includes(placementId)
        ? prev.filter((id) => id !== placementId)
        : [...prev, placementId],
    );
    setSaveMessage(null);
  };

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? (adId ? "Edit Ad" : "Create Ad")}
      sections={[
        metaQuery.error ? (
          <Alert variant="error" title="Could not load ad metadata">
            {metaQuery.error instanceof Error ? metaQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        adQuery.error ? (
          <Alert variant="error" title="Could not load ad">
            {adQuery.error instanceof Error ? adQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (blockedByPublishValidation) {
              setSaveMessage("Cannot save in publish-ready status until validation issues are fixed.");
              return;
            }
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Ad name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Summer Campaign"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Provider"
              value={provider}
              options={[
                { label: "Manual", value: "manual" },
                { label: "AdSense", value: "adsense" },
                { label: "Third Party", value: "thirdParty" },
              ]}
              onChange={(event) => setProvider(event.target.value as "manual" | "adsense" | "thirdParty")}
            />
            <Select
              label="Status"
              value={status}
              options={[
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
                { label: "Scheduled", value: "scheduled" },
                { label: "Paused", value: "paused" },
              ]}
              onChange={(event) => setStatus(event.target.value as "draft" | "active" | "scheduled" | "paused")}
            />
            <Input
              label="Priority"
              type="number"
              value={String(priority)}
              onChange={(event) => setPriority(Number(event.target.value || 0))}
            />
          </div>

          <Toggle
            checked={requiresConsent}
            onChange={setRequiresConsent}
            label="Require user ad-consent for this ad"
          />

          <div className="space-y-2">
            <Text className="text-sm font-medium">Placements</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {placements.map((placement) => (
                <label
                  key={placement.id}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-slate-700 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlacements.includes(placement.id)}
                    onChange={() => togglePlacement(placement.id)}
                  />
                  <span className="text-sm">{placement.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Start at (ISO)"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              placeholder="2026-05-01T00:00:00.000Z"
            />
            <Input
              label="End at (ISO)"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              placeholder="2026-05-30T23:59:59.000Z"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Creative title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Catch the mega sale"
            />
            <Input
              label="Creative body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Up to 40% off this weekend"
            />
            <Input
              label="Image URL"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
            <Input
              label="CTA label"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              placeholder="Shop now"
            />
            <Input
              label="CTA URL"
              value={ctaHref}
              onChange={(event) => setCtaHref(event.target.value)}
              placeholder="/promotions/deals"
            />
            {provider === "adsense" ? (
              <Input
                label="AdSense slot"
                value={adsenseSlot}
                onChange={(event) => setAdsenseSlot(event.target.value)}
                placeholder="1234567890"
              />
            ) : null}
            {provider === "thirdParty" ? (
              <Input
                label="Third-party URL"
                value={thirdPartyUrl}
                onChange={(event) => setThirdPartyUrl(event.target.value)}
                placeholder="https://adnetwork.example/slot"
              />
            ) : null}
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-slate-700 p-3">
            <Text className="text-sm font-medium mb-1">Preview</Text>
            <Text className="text-xs text-neutral-500 dark:text-zinc-400">
              {title || name || "Untitled ad"}
            </Text>
            {body ? <Text className="text-sm mt-1">{body}</Text> : null}
            {ctaLabel ? <Text className="text-xs mt-1">CTA: {ctaLabel} ({ctaHref || "#"})</Text> : null}
          </div>

          {publishHardeningRequired && publishIssues.length > 0 ? (
            <Alert variant="warning" title="Publish readiness issues">
              {publishIssues.join("; ")}
            </Alert>
          ) : null}

          <FormActions align="right">
            <Button type="submit" disabled={saveMutation.isPending || blockedByPublishValidation || !name.trim() || selectedPlacements.length === 0}>
              {saveMutation.isPending ? "Saving..." : status === "active" ? "Publish ad" : adId ? "Save changes" : "Create ad"}
            </Button>
          </FormActions>
          {saveMessage ? (
            <Alert variant={saveMessage.includes("failed") || saveMessage.includes("Failed") ? "error" : "success"} title="Save status">
              {saveMessage}
            </Alert>
          ) : null}
        </Form>,
      ]}
    />
  );
}
