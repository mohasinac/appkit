"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox, Details, Div, SideDrawer, Span, Stack, Summary, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { StoreCapability } from "../../auth/permissions/constants";
import { adminStoreUpdateSchema } from "../schemas/admin-editor-forms";
import type { StoreStatus } from "../../stores/schemas/firestore";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { SectionForm, useSectionFormNav, buildSectionsFromSchema } from "../../shell";

/** Matches `adminStoreUpdateSchema`; the draft always holds a concrete value. */
interface AdminStoreFormValues {
  [key: string]: JsonValue;
  storeStatus: StoreStatus;
  isVerified: boolean;
  isFeatured: boolean;
  suspensionReason: string;
  capabilities: string[];
  adminNotes: string;
}

const DEFAULT_CAPABILITIES = ["suggest_brands", "create_coupons"];

/** Add or remove one capability, returning the new list. */
function toggleCapability(current: string[], key: string): string[] {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return Array.from(next);
}

// --- Types -------------------------------------------------------------------

export interface AdminStoreEditorViewProps {
  open: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  currentStatus?: string;
  currentIsVerified?: boolean;
  currentIsFeatured?: boolean;
  currentCapabilities?: string[];
}

const CAPABILITY_GROUPS: { label: string; caps: { key: StoreCapability; label: string }[] }[] = [
  {
    label: "Listings",
    caps: [
      { key: "host_auctions", label: "Host Auctions" },
      { key: "host_preorders", label: "Host Pre-orders" },
      { key: "create_categories", label: "Request New Categories" },
      { key: "suggest_brands", label: "Suggest Brands" },
      { key: "create_coupons", label: "Create Coupons" },
      { key: "bulk_listing_import", label: "Bulk Listing Import" },
      { key: "extended_return_window", label: "Extended Return Window" },
    ],
  },
  {
    label: "Trust & Visibility",
    caps: [
      { key: "verified_seller", label: "Verified Seller Badge" },
      { key: "featured_placement", label: "Featured Placement" },
      { key: "promotional_banner", label: "Promotional Banner" },
      { key: "priority_support", label: "Priority Support" },
    ],
  },
  {
    label: "Platform",
    caps: [
      { key: "multiple_stores", label: "Multiple Stores" },
      { key: "custom_store_slug", label: "Custom Store Slug" },
      { key: "api_access", label: "API Access" },
      { key: "lower_commission_rate", label: "Lower Commission Rate" },
      { key: "early_access_features", label: "Early Access Features" },
      { key: "advanced_analytics", label: "Advanced Analytics" },
      { key: "whatsapp_catalog_sync", label: "WhatsApp Catalog Sync" },
    ],
  },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
  { label: "Rejected", value: "rejected" },
];

/**
 * The grouped capability grid.
 *
 * Module scope, not inlined in the `renderers` map: three nested `.map`s inside
 * a renderer inside a `useMemo` reach the nesting threshold, and the rule is
 * right that it is unreadable there.
 */
function CapabilityPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <Stack gap="sm">
      <Span size="sm" weight="medium" color="muted">
        Capabilities
        <Span size="xs" weight="normal" className="ml-2" color="muted">
          ({selected.size} active)
        </Span>
      </Span>
      <Div className="divide-y divide-[var(--appkit-color-border)]" rounded="xl" border="default">
        {CAPABILITY_GROUPS.map((group) => (
          <Details key={group.label} className="group">
            <Summary paddingX="x-sm" paddingY="y-xs" weight="semibold" color="muted" layout="flex" align="center" justify="between" className="uppercase tracking-wide hover:bg-[var(--appkit-color-bg)] transition-colors">
              <Span size="xs">{group.label}</Span>
              <Span size="xs" weight="normal" className="normal-case" color="faint">
                {group.caps.filter((c) => selected.has(c.key)).length}/{group.caps.length}
              </Span>
            </Summary>
            <Div layout="grid" paddingY="y-xs-tall" className="grid-cols-2 gap-x-2 gap-y-1.5" surface="muted" padding="x-sm">
              {group.caps.map((cap) => (
                <label
                  key={cap.key}
                  className="flex items-center gap-[var(--appkit-space-2)] cursor-pointer text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)]"
                >
                  <Checkbox
                    bare
                    checked={selected.has(cap.key)}
                    onChange={() => onToggle(cap.key)}
                    className="h-3.5 w-3.5 rounded border-[var(--appkit-color-border)] accent-primary"
                  />
                  {cap.label}
                </label>
              ))}
            </Div>
          </Details>
        ))}
      </Div>
    </Stack>
  );
}


// --- Component ---------------------------------------------------------------

export function AdminStoreEditorView({
  open,
  onClose,
  storeId,
  storeName,
  currentStatus,
  currentIsVerified,
  currentIsFeatured,
  currentCapabilities,
}: AdminStoreEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [values, setValues] = React.useState<AdminStoreFormValues>(() => ({
    storeStatus: (currentStatus as StoreStatus) ?? "pending",
    isVerified: currentIsVerified ?? false,
    isFeatured: currentIsFeatured ?? false,
    suspensionReason: "",
    capabilities: currentCapabilities ?? DEFAULT_CAPABILITIES,
    adminNotes: "",
  }));

  const handleChange = React.useCallback(
    (partial: Partial<AdminStoreFormValues>) => {
      setValues((prev) => Object.assign({}, prev, partial));
    },
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    setValues({
      storeStatus: (currentStatus as StoreStatus) ?? "pending",
      isVerified: currentIsVerified ?? false,
      isFeatured: currentIsFeatured ?? false,
      suspensionReason: "",
      capabilities: currentCapabilities ?? DEFAULT_CAPABILITIES,
      adminNotes: "",
    });
  }, [open, currentStatus, currentIsVerified, currentIsFeatured, currentCapabilities]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to update store.",
    mutationFn: async () => {
      /*
       * Built from the PARSED draft, so a field the form hid is a field the
       * payload cannot carry.
       *
       * `suspensionReason` used to be typed into a live textarea and then
       * dropped unless the status was exactly "suspended" — choose "rejected",
       * write the reason, save, and it vanished with no feedback. Now the
       * schema's `when` hides it outside suspension and its own superRefine
       * REQUIRES it during suspension, so the two can no longer disagree.
       */
      const parsed = adminStoreUpdateSchema.parse(values);
      await apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId!), {
        storeStatus: parsed.storeStatus,
        adminNotes: parsed.adminNotes || undefined,
        isFeatured: parsed.isFeatured,
        isVerified: parsed.isVerified,
        suspensionReason: parsed.suspensionReason || undefined,
        capabilities: parsed.capabilities ?? [],
      });
    },
    onSuccess: () => {
      showToast("Store updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      onClose();
    },
  });

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AdminStoreFormValues>(adminStoreUpdateSchema, {
        options: { storeStatus: STATUS_OPTIONS },
        renderers: {
          capabilities: ({ values: v, onChange }) => (
            <CapabilityPicker
              selected={new Set((v.capabilities as string[]) ?? [])}
              onToggle={(key) =>
                onChange({ capabilities: toggleCapability((v.capabilities as string[]) ?? [], key) })
              }
            />
          ),
        },
      }),
    [],
  );

  const nav = useSectionFormNav(sections, values);
  const { shellCtx } = useFormShellState(adminStoreUpdateSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={storeName ? `Manage: ${storeName}` : "Manage Store"}
    >
      <FormShellContext.Provider value={shellCtx}>
        <Div padding="md">
          <FormErrorSummary />
          <SectionForm<AdminStoreFormValues>
            sections={sections}
            values={values}
            onChange={handleChange}
            onSubmit={() => saveMutation.mutate()}
            schema={adminStoreUpdateSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={saveMutation.isPending}
            submitLabel="Save changes"
            onCancel={onClose}
            cancelLabel="Cancel"
          />
        </Div>
      </FormShellContext.Provider>
    </SideDrawer>
  );
}
