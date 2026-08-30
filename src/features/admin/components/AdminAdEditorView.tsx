"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Checkbox, Div, Span, Stack, StackedViewShell, Text, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { adminAdFormSchema } from "../schemas/admin-ops-forms";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

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

const PROVIDER_OPTIONS = [
  { label: "Manual", value: "manual" },
  { label: "AdSense", value: "adsense" },
  { label: "Third Party", value: "thirdParty" },
];

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Paused", value: "paused" },
];

/**
 * The draft this form edits — FLAT, matching the schema.
 *
 * The creative used to be a nested object in state and an open
 * `z.record(...)` in the schema, so its seven inputs were validated by nothing
 * and the two provider-specific ones were filtered at the payload by hand.
 */
interface AdValues {
  [key: string]: unknown;
  name: string;
  provider: "manual" | "adsense" | "thirdParty";
  status: "draft" | "active" | "scheduled" | "paused";
  priority: number;
  placementIds: string[];
  requiresConsent: boolean;
  startAt: string;
  endAt: string;
  creativeTitle: string;
  creativeBody: string;
  creativeImageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  adsenseSlot: string;
  thirdPartyUrl: string;
}

const EMPTY_AD: AdValues = {
  name: "",
  provider: "manual",
  status: "draft",
  priority: 0,
  placementIds: [],
  requiresConsent: false,
  startAt: "",
  endAt: "",
  creativeTitle: "",
  creativeBody: "",
  creativeImageUrl: "",
  ctaLabel: "",
  ctaHref: "",
  adsenseSlot: "",
  thirdPartyUrl: "",
};

/**
 * The placement checkboxes.
 *
 * Its options come from a live query, so it cannot be a generated select;
 * module level rather than inline for the DEEP_NESTING reason.
 */
function PlacementChecklist({
  placements,
  selected,
  onToggle,
}: {
  placements: Placement[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Stack gap="sm">
      <Div layout="grid" gap="2" className="grid-cols-1 md:grid-cols-2">
        {placements.map((placement) => (
          <label
            key={placement.id}
            className="flex items-center gap-[var(--appkit-space-2)] rounded-md border border-[var(--appkit-color-border)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2)]"
          >
            <Checkbox
              bare
              checked={selected.includes(placement.id)}
              onChange={() => onToggle(placement.id)}
            />
            <Span size="sm">{placement.label}</Span>
          </label>
        ))}
      </Div>
    </Stack>
  );
}

export function AdminAdEditorView({
  adId,
  endpointBase = ADMIN_ENDPOINTS.ADS,
  labels = {},
  onSaved,
  ...rest
}: AdminAdEditorViewProps) {
  const [form, setForm] = React.useState<AdValues>(EMPTY_AD);
  const patch = (partial: Partial<AdValues>) =>
    setForm((prev) => Object.assign({}, prev, partial));
  const { showToast } = useToast();

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
    const item = adQuery.data?.item;
    if (!item) return;
    patch({
      name: item.name || "",
      provider: item.provider || "manual",
      status: item.status || "draft",
      priority: item.priority ?? 0,
      requiresConsent: Boolean(item.requiresConsent),
      placementIds: item.placementIds ?? [],
      startAt: item.startAt || "",
      endAt: item.endAt || "",
      creativeTitle: item.creative?.title || "",
      creativeBody: item.creative?.body || "",
      creativeImageUrl: item.creative?.imageUrl || "",
      ctaLabel: item.creative?.ctaLabel || "",
      ctaHref: item.creative?.ctaHref || "",
      adsenseSlot: item.creative?.adsenseSlot || "",
      thirdPartyUrl: item.creative?.thirdPartyUrl || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Save failed",
    mutationFn: async () => {
      /*
       * `visibleValues` is what keeps a provider-specific field out of the
       * payload when its input is not on screen.
       *
       * Both `adsenseSlot` and `thirdPartyUrl` used to go out unconditionally
       * while their inputs unmount on a provider switch — so an ad created as
       * AdSense and switched to "manual" shipped a stale slot nothing could
       * show or clear. The rule was then restated as a ternary right here; it
       * now lives once, on the schema, as the same predicate that hides them.
       */
      const draft = visibleValues(adminAdFormSchema, form) as AdValues;
      const payload: AdPayload = {
        name: draft.name,
        provider: draft.provider,
        status: draft.status,
        priority: draft.priority,
        requiresConsent: draft.requiresConsent,
        placementIds: draft.placementIds,
        startAt: draft.startAt || undefined,
        endAt: draft.endAt || undefined,
        creative: {
          title: draft.creativeTitle || undefined,
          body: draft.creativeBody || undefined,
          imageUrl: draft.creativeImageUrl || undefined,
          ctaLabel: draft.ctaLabel || undefined,
          ctaHref: draft.ctaHref || undefined,
          adsenseSlot: draft.adsenseSlot || undefined,
          thirdPartyUrl: draft.thirdPartyUrl || undefined,
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
      showToast("Saved successfully.", "success");
      if (savedId) {
        onSaved?.(savedId);
      }
    },
  });

  const placements = adQuery.data?.placements ?? metaQuery.data?.placements ?? [];
  const providerCredentialStatus = metaQuery.data?.providerCredentialStatus;

  /*
   * What remains of `publishIssues` after the schema took its share.
   *
   * The name, the placement count, the date order, "a scheduled ad needs a
   * start date" and the three provider rules all moved to the schema, where
   * they reach the field that is wrong instead of a warning banner that only
   * appeared once the status was already publish-ready. What is left cannot
   * live there: it depends on the LIVE placement list and on whether the
   * provider's credentials are configured in site settings — neither of which
   * a schema can see.
   */
  const publishIssues = React.useMemo(() => {
    const issues: string[] = [];
    const now = Date.now();

    const knownPlacementIds = new Set(placements.map((placement) => placement.id));
    const enabledPlacementIds = new Set(
      placements.filter((placement) => placement.enabled).map((placement) => placement.id),
    );

    const unknown = form.placementIds.filter((id) => !knownPlacementIds.has(id));
    if (unknown.length > 0) issues.push(`Unknown placements: ${unknown.join(", ")}`);

    const disabled = form.placementIds.filter((id) => !enabledPlacementIds.has(id));
    if (disabled.length > 0) {
      issues.push(`Selected placements are disabled: ${disabled.join(", ")}`);
    }

    const startMs = form.startAt ? new Date(form.startAt).getTime() : null;
    const endMs = form.endAt ? new Date(form.endAt).getTime() : null;

    if (form.status === "scheduled" && startMs !== null && !Number.isNaN(startMs) && startMs <= now) {
      issues.push("Scheduled ads must start in the future");
    }
    if (form.status === "active") {
      if (startMs !== null && !Number.isNaN(startMs) && startMs > now) {
        issues.push("Active ads cannot have a future start date");
      }
      if (endMs !== null && !Number.isNaN(endMs) && endMs <= now) {
        issues.push("Active ads cannot have an end date in the past");
      }
    }

    if (form.provider === "adsense" && !providerCredentialStatus?.hasAdsenseClientId) {
      issues.push("AdSense provider credentials are missing in ad settings");
    }
    if (form.provider === "thirdParty" && !providerCredentialStatus?.hasThirdPartyScriptUrl) {
      issues.push("Third-party provider script URL is missing in ad settings");
    }

    return issues;
  }, [
    form.endAt,
    form.placementIds,
    form.provider,
    form.startAt,
    form.status,
    placements,
    providerCredentialStatus?.hasAdsenseClientId,
    providerCredentialStatus?.hasThirdPartyScriptUrl,
  ]);

  const publishHardeningRequired = form.status === "active" || form.status === "scheduled";
  const blockedByPublishValidation = publishHardeningRequired && publishIssues.length > 0;

  const togglePlacement = (placementId: string) =>
    setForm((prev) => ({
      ...prev,
      placementIds: prev.placementIds.includes(placementId)
        ? prev.placementIds.filter((id) => id !== placementId)
        : [...prev.placementIds, placementId],
    }));

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AdValues>(adminAdFormSchema, {
        options: {
          provider: PROVIDER_OPTIONS,
          status: STATUS_OPTIONS,
        },
        renderers: {
          placementIds: ({ values }) => (
            <PlacementChecklist
              placements={placements}
              selected={values.placementIds}
              onToggle={togglePlacement}
            />
          ),
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placements],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:ad-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(adminAdFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const handleSubmit = () => {
    clearErrors();
    const parsed = adminAdFormSchema.safeParse(visibleValues(adminAdFormSchema, form));
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    if (blockedByPublishValidation) {
      showToast(
        "Cannot save in publish-ready status until the readiness issues are fixed.",
        "warning",
      );
      return;
    }
    saveMutation.mutate();
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
        <FormShellContext.Provider value={shellCtx} key="ad-form">
          <FormErrorSummary />
          <SectionForm<AdValues>
            sections={sections}
            values={form}
            onChange={patch}
            onSubmit={handleSubmit}
            schema={adminAdFormSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={saveMutation.isPending}
            submitLabel={
              form.status === "active" ? "Publish ad" : adId ? "Save changes" : "Create ad"
            }
          />
        </FormShellContext.Provider>,

        <Div border="default" className={__P.p3} rounded="lg" key="ad-preview">
          <Text className="mb-1" size="sm" weight="medium">Preview</Text>
          <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
            {form.creativeTitle || form.name || "Untitled ad"}
          </Text>
          {form.creativeBody ? <Text className="mt-1" size="sm">{form.creativeBody}</Text> : null}
          {form.ctaLabel ? (
            <Text className="mt-1" size="xs">CTA: {form.ctaLabel} ({form.ctaHref || "#"})</Text>
          ) : null}
        </Div>,

        publishHardeningRequired && publishIssues.length > 0 ? (
          <Alert variant="warning" title="Publish readiness issues" key="ad-publish-issues">
            {publishIssues.join("; ")}
          </Alert>
        ) : null,
      ]}
    />
  );
}
