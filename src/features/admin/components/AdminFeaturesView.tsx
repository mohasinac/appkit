"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterChipGroup, ListingLayout } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminFeatureEditorView } from "./AdminFeatureEditorView";
import { PRODUCT_FEATURE_SCOPE_TABS } from "../../products/constants/product-features.constants";
import type { ProductFeatureScope } from "../../products/schemas/product-features";

const PAGE_SIZE = 50;
const DEFAULT_SCOPE: ProductFeatureScope = "platform";

const STICKY_TABS_CLASS =
  "sticky top-[calc(var(--header-height,0px)+44px)] z-10 bg-white/95 bg-[var(--appkit-color-surface)]/95 backdrop-blur-sm border-b border-[var(--appkit-color-border)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2)]";

interface AdminFeaturesResponse {
  items?: JsonArray;
  total?: number;
}

interface FeatureRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

function mapFeatureRow(item: Record<string, JsonValue>, index: number): FeatureRow {
  const productTypes = Array.isArray(item.productTypes) ? (item.productTypes as string[]) : [];
  const isActive = typeof item.isActive === "boolean" ? item.isActive : true;
  return {
    id: toStringValue(item.id, `feature-${index}`),
    primary: toStringValue(item.label, "Untitled feature"),
    secondary: [
      toStringValue(item.category, ""),
      productTypes.join(" · "),
      item.scope === "store" && item.storeId ? `store: ${item.storeId as string}` : "",
    ]
      .filter(Boolean)
      .join(" — "),
    status: isActive ? "Active" : "Inactive",
    updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
  };
}

export type AdminFeaturesViewProps = ListingLayoutProps;

export function AdminFeaturesView({ children, ...props }: AdminFeaturesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scopeFilter = (searchParams.get("scope") as ProductFeatureScope | null) || DEFAULT_SCOPE;

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminFeaturesResponse, FeatureRow> = {
    portal: "admin",
    title: "Features",
    searchPlaceholder: "Search features by label",
    emptyLabel: "No features found",
    filterKeys: [],
    defaultSort: sortBy("displayOrder", "ASC"),
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "features", "listing", scopeFilter],
    endpoint: `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=${scopeFilter}`,
    sortOptions: [
      { value: sortBy("displayOrder", "ASC"), label: "Display order" },
      { value: "label", label: "Label A–Z" },
      { value: sortBy("label", "DESC"), label: "Label Z–A" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
    ],
    mapRows: (response) => toRecordArray(response.items).map(mapFeatureRow),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
    primaryAction: {
      label: "Add Feature",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.features.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        onClick: () => selection.clearSelection(),
      })),
    renderAboveContent: () => (
      <FilterChipGroup
        label="Scope"
        className={STICKY_TABS_CLASS}
        tabs={PRODUCT_FEATURE_SCOPE_TABS.map((tab) => ({ id: tab.value, label: tab.label }))}
        value={scopeFilter}
        onChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("scope", value);
          router.replace(`${pathname}?${params.toString()}`);
        }}
      />
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminFeatureEditorView
        featureId={editId ?? undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Feature" : "Edit Feature"),
  };

  return <DataListingView config={config} />;
}
