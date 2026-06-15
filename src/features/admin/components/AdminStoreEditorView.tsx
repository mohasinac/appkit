"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Div, Form, FormActions, Label, Select, SideDrawer, Span, Stack, StackedViewShell, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { StoreCapability } from "../../auth/permissions/constants";

// --- Types -------------------------------------------------------------------

export interface AdminStoreEditorViewProps {
  open: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  currentStatus?: string;
  currentIsVerified?: boolean;
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

const TEXTAREA_CHROME =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500";

// --- Component ---------------------------------------------------------------

export function AdminStoreEditorView({
  open,
  onClose,
  storeId,
  storeName,
  currentStatus,
  currentIsVerified,
  currentCapabilities,
}: AdminStoreEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [storeStatus, setStoreStatus] = React.useState(currentStatus ?? "pending");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(currentIsVerified ?? false);
  const [suspensionReason, setSuspensionReason] = React.useState("");
  const [capabilities, setCapabilities] = React.useState<Set<string>>(
    new Set(currentCapabilities ?? ["suggest_brands", "create_coupons"]),
  );

  const toggleCapability = (key: string) => {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  React.useEffect(() => {
    if (open) {
      setStoreStatus(currentStatus ?? "pending");
      setAdminNotes("");
      setIsFeatured(false);
      setIsVerified(currentIsVerified ?? false);
      setSuspensionReason("");
      setCapabilities(new Set(currentCapabilities ?? ["suggest_brands", "create_coupons"]));
    }
  }, [open, currentStatus, currentIsVerified, currentCapabilities]);

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId!), {
        storeStatus,
        adminNotes: adminNotes || undefined,
        isFeatured,
        isVerified,
        suspensionReason: storeStatus === "suspended" ? (suspensionReason || undefined) : undefined,
        capabilities: Array.from(capabilities),
      });
    },
    onSuccess: () => {
      showToast("Store updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update store.", "error");
    },
  });

  const renderStatusSection = () => (
    <Select
      label="Store status"
      options={STATUS_OPTIONS}
      value={storeStatus}
      onValueChange={setStoreStatus}
    />
  );

  const renderNotesSection = () => (
    <Stack gap="xs">
      <Label>Admin notes (optional)</Label>
      <textarea
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        rows={3}
        placeholder="e.g. Reason for suspension, approval notes…"
        className={TEXTAREA_CHROME}
      />
    </Stack>
  );

  const renderTogglesSection = () => (
    <>
      <Toggle label="Verified store" checked={isVerified} onChange={setIsVerified} />
      <Toggle label="Featured store" checked={isFeatured} onChange={setIsFeatured} />
    </>
  );

  const renderSuspensionSection = () =>
    storeStatus === "suspended" ? (
      <Stack gap="xs">
        <Label>Suspension reason (optional)</Label>
        <textarea
          value={suspensionReason}
          onChange={(e) => setSuspensionReason(e.target.value)}
          rows={2}
          placeholder="e.g. Policy violation, fraudulent activity…"
          className={TEXTAREA_CHROME}
        />
      </Stack>
    ) : null;

  const renderCapabilitiesSection = () => (
    <Stack gap="sm">
      <Span size="sm" weight="medium" className="text-zinc-700 dark:text-zinc-300">
        Capabilities
        <Span size="xs" weight="normal" className="ml-2 text-zinc-500 dark:text-zinc-400">
          ({capabilities.size} active)
        </Span>
      </Span>
      <Div className="dark:border-slate-700 divide-y divide-zinc-100 dark:divide-slate-700" rounded="xl" border="default">
        {CAPABILITY_GROUPS.map((group) => {
          const checked = group.caps.filter((c) => capabilities.has(c.key)).length;
          return (
            <details key={group.label} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 select-none hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors">
                <Span size="xs">{group.label}</Span>
                <Span size="xs" weight="normal" className="normal-case text-zinc-400 dark:text-zinc-400">
                  {checked}/{group.caps.length}
                </Span>
              </summary>
              <Div className="grid grid-cols-2 gap-x-2 gap-y-1.5 px-3 py-2.5 bg-zinc-50/60 dark:bg-slate-800/40">
                {group.caps.map((cap) => (
                  <label
                    key={cap.key}
                    className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={capabilities.has(cap.key)}
                      onChange={() => toggleCapability(cap.key)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-slate-600 accent-primary"
                    />
                    {cap.label}
                  </label>
                ))}
              </Div>
            </details>
          );
        })}
      </Div>
    </Stack>
  );

  const renderActionsSection = () => (
    <FormActions align="right">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        isLoading={saveMutation.isPending}
        disabled={!storeId || saveMutation.isPending}
      >
        Save changes
      </Button>
    </FormActions>
  );

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={storeName ? `Manage: ${storeName}` : "Manage Store"}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="p-4"
      >
        <StackedViewShell
          portal="admin"
          className="space-y-4"
          sections={[
            renderStatusSection,
            renderNotesSection,
            renderTogglesSection,
            renderSuspensionSection,
            renderCapabilitiesSection,
            renderActionsSection,
          ]}
        />
      </Form>
    </SideDrawer>
  );
}
