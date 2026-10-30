"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "../../../ui/components/Checkbox";
import { Details, Summary } from "../../../ui/components/Details";
import { Div } from "../../../ui/components/Div";
import { SideDrawer } from "../../../ui/components/SideDrawer";
import { Span } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
import { useToast } from "../../../ui/components/toast-context";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  ALL_STORE_CAPABILITIES,
  DEFAULT_STORE_CAPABILITIES,
  type StoreCapability,
} from "../../auth/permissions/constants";
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
  sellerTier: "seller" | "trusted";
  trustedSeller: boolean;
  suspensionReason: string;
  capabilities: string[];
  adminNotes: string;
}

/*
 * 🛑 Imported, not restated. This value is the `??` fallback on the load path
 * below, so whatever it holds is what gets SAVED BACK for a store whose
 * `capabilities` field is absent. A local copy that drifted from
 * `DEFAULT_STORE_CAPABILITIES` would silently rewrite entitlements on the next
 * unrelated edit — Root Cause #38's re-save shape, with two owners of one
 * default as the cause.
 */
const DEFAULT_CAPABILITIES: string[] = [...DEFAULT_STORE_CAPABILITIES];

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
  /**
   * 🛑 Both REQUIRED for the controls to show the stored value, and both are
   * the Root Cause #38 trap: `AdminStoresView` seeds this editor from a LIST
   * row, so a field the list serializer omits arrives `undefined`, the control
   * defaults to off, and the save handler sends that wrong default back —
   * silently un-trusting a trusted store while the admin was editing
   * something else. The list route emits `trustedSeller` already; `sellerTier`
   * had to be added to it in the same change.
   */
  currentSellerTier?: "seller" | "trusted";
  currentTrustedSeller?: boolean;
  currentCapabilities?: string[];
  /**
   * 🛑 Required for the note to DISPLAY. Without it `adminNotes` was hardcoded
   * `""` at both the initial-state and the reopen-reset sites, so a stored note
   * could never appear — and because the payload sent `parsed.adminNotes ||
   * undefined`, an always-empty box meant `"" || undefined === undefined`, the
   * route skipped the key, and an existing note could never be CLEARED either.
   * Verified on production 2026-10-02: the document held `adminNotes:
   * "RT3-probe"` while `textarea[name="adminNotes"]` read `""`.
   */
  currentAdminNotes?: string;
}

/**
 * The three capability groups, named once.
 *
 * A literal repeated per capability is how a group silently splits in two the
 * day someone types "Trust and Visibility" in one of nineteen entries — the
 * `CAPABILITY_GROUPS` derivation below filters on equality, so the typo'd entry
 * would land in no rendered group at all and that capability would vanish from
 * the admin UI without any error.
 */
const CAP_GROUP = {
  LISTINGS: "Listings",
  TRUST: "Trust & Visibility",
  PLATFORM: "Platform",
} as const;

type CapabilityGroupKey = (typeof CAP_GROUP)[keyof typeof CAP_GROUP];

/**
 * Every capability's group and label.
 *
 * 🛑 `Record<StoreCapability, …>`, so a capability added to the union MUST be
 * given a home here or this file does not compile. The groups used to be three
 * hand-written arrays, which meant a new capability could be granted in code,
 * checked by a server gate, and remain **unreachable from the admin UI** — the
 * only place it can be turned on. That is the whole drift class in one
 * sentence, and it had already happened: `advanced_listing_types` is the
 * nineteenth member and the arrays listed eighteen.
 */
const CAPABILITY_META: Record<
  StoreCapability,
  { group: CapabilityGroupKey; label: string }
> = {
  advanced_listing_types: {
    group: CAP_GROUP.LISTINGS,
    label: "Advanced Listing Types (pre-orders, prize draws, classifieds, digital codes, live, art, stickers)",
  },
  // Legacy: no longer checked anywhere — `collector drop` is a basic type now.
  host_collector_drops: { group: CAP_GROUP.LISTINGS, label: "Host Collector Drops (legacy — no longer required)" },
  // Legacy per-type grant, still honoured so existing stores keep access.
  host_preorders: { group: CAP_GROUP.LISTINGS, label: "Host Pre-orders (legacy grant)" },
  create_categories: { group: CAP_GROUP.LISTINGS, label: "Request New Categories" },
  suggest_brands: { group: CAP_GROUP.LISTINGS, label: "Suggest Brands" },
  create_coupons: { group: CAP_GROUP.LISTINGS, label: "Create Coupons" },
  bulk_listing_import: { group: CAP_GROUP.LISTINGS, label: "Bulk Listing Import" },
  extended_return_window: { group: CAP_GROUP.LISTINGS, label: "Extended Return Window" },
  verified_seller: { group: CAP_GROUP.TRUST, label: "Verified Seller Badge" },
  featured_placement: { group: CAP_GROUP.TRUST, label: "Featured Placement" },
  promotional_banner: { group: CAP_GROUP.TRUST, label: "Promotional Banner" },
  priority_support: { group: CAP_GROUP.TRUST, label: "Priority Support" },
  multiple_stores: { group: CAP_GROUP.PLATFORM, label: "Multiple Stores" },
  custom_store_slug: { group: CAP_GROUP.PLATFORM, label: "Custom Store Slug" },
  api_access: { group: CAP_GROUP.PLATFORM, label: "API Access" },
  lower_commission_rate: { group: CAP_GROUP.PLATFORM, label: "Lower Commission Rate" },
  early_access_features: { group: CAP_GROUP.PLATFORM, label: "Early Access Features" },
  advanced_analytics: { group: CAP_GROUP.PLATFORM, label: "Advanced Analytics" },
  whatsapp_catalog_sync: { group: CAP_GROUP.PLATFORM, label: "WhatsApp Catalog Sync" },
};

const CAPABILITY_GROUP_ORDER: CapabilityGroupKey[] = [
  CAP_GROUP.LISTINGS,
  CAP_GROUP.TRUST,
  CAP_GROUP.PLATFORM,
];

/**
 * Derived, so every capability appears in exactly one group by construction.
 * Keeps the `{ label, caps: [{ key, label }] }` shape the renderer below
 * already expects.
 */
const CAPABILITY_GROUPS: {
  label: string;
  caps: { key: StoreCapability; label: string }[];
}[] = CAPABILITY_GROUP_ORDER.map((group) => ({
  label: group,
  caps: ALL_STORE_CAPABILITIES.filter(
    (key) => CAPABILITY_META[key].group === group,
  ).map((key) => ({ key, label: CAPABILITY_META[key].label })),
}));

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
              {/*
                * `<Checkbox label>` rather than a raw `<label>` wrapper: the
                * primitive renders its own label element and associates it with
                * the input, so this also fixes the association the hand-rolled
                * wrapper only implied. `bare` is dropped with the wrapper — a
                * labelled Checkbox needs its normal chrome.
                */}
              {group.caps.map((cap) => (
                <Checkbox
                  key={cap.key}
                  label={cap.label}
                  checked={selected.has(cap.key)}
                  onChange={() => onToggle(cap.key)}
                  wrapperClassName="flex items-center gap-[var(--appkit-space-2)] cursor-pointer text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)]"
                />
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
  currentSellerTier,
  currentTrustedSeller,
  currentCapabilities,
  currentAdminNotes,
}: AdminStoreEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [values, setValues] = React.useState<AdminStoreFormValues>(() => ({
    storeStatus: (currentStatus as StoreStatus) ?? "pending",
    isVerified: currentIsVerified ?? false,
    isFeatured: currentIsFeatured ?? false,
    sellerTier: currentSellerTier ?? "seller",
    trustedSeller: currentTrustedSeller ?? false,
    suspensionReason: "",
    capabilities: currentCapabilities ?? DEFAULT_CAPABILITIES,
    adminNotes: currentAdminNotes ?? "",
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
      sellerTier: currentSellerTier ?? "seller",
      trustedSeller: currentTrustedSeller ?? false,
      suspensionReason: "",
      capabilities: currentCapabilities ?? DEFAULT_CAPABILITIES,
      adminNotes: currentAdminNotes ?? "",
    });
  }, [
    open,
    currentStatus,
    currentIsVerified,
    currentIsFeatured,
    currentSellerTier,
    currentTrustedSeller,
    currentCapabilities,
    currentAdminNotes,
  ]);

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
        // `?? ""`, NOT `|| undefined` — sending undefined makes the route skip
        // the key, so clearing a note was impossible.
        adminNotes: parsed.adminNotes ?? "",
        isFeatured: parsed.isFeatured,
        isVerified: parsed.isVerified,
        /*
         * 🛑 `sellerTier` is sent ONLY when the admin actually moved it away
         * from the stored value, because the route treats any `sellerTier` in
         * the body as a deliberate override and PINS it against the monthly
         * recompute. Sending it unconditionally would lock every store an
         * admin ever opened and saved — quietly freezing the automatic tier
         * for the whole catalogue, one unrelated edit at a time.
         *
         * `trustedSeller` has no such side effect and is sent every time, so
         * it can also be cleared.
         */
        ...(parsed.sellerTier !== undefined && parsed.sellerTier !== (currentSellerTier ?? "seller")
          ? { sellerTier: parsed.sellerTier }
          : {}),
        trustedSeller: parsed.trustedSeller ?? false,
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
