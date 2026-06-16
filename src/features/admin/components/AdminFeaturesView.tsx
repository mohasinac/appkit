"use client";

import { sortBy, type JsonArray } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ListingLayout, Row } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
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
  "sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-2";
const TAB_BASE_CLASS = "rounded-full px-3 py-1 text-xs font-medium border transition-colors";
const TAB_ACTIVE_CLASS = "bg-primary text-white border-primary";
const TAB_INACTIVE_CLASS =
  "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800";

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
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: "delete",
        label: ACTIONS.ADMIN["delete-feature"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderAboveContent: () => (
      <Row className={STICKY_TABS_CLASS} gap="xs">
        {PRODUCT_FEATURE_SCOPE_TABS.map((tab) => (
          <ScopeTabButton key={tab.value} value={tab.value} label={tab.label} current={scopeFilter} />
        ))}
      </Row>
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

function ScopeTabButton({
  value,
  label,
  current,
}: {
  value: ProductFeatureScope;
  label: string;
  current: ProductFeatureScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", value);
    router.replace(`${pathname}?${params.toString()}`);
  };
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${TAB_BASE_CLASS} ${isActive ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS}`}
    >
      {label}
    </button>
  );
}
