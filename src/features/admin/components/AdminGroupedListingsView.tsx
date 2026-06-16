"use client";

/**
 * AdminGroupedListingsView — admin moderation view for grouped product listings.
 * W1-29 — pairs with the new GET /api/admin/grouped-listings endpoint.
 */

import { sortBy, type JsonArray } from "@mohasinac/appkit";
import React, { useState } from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import {
  Button,
  Row,
  SideDrawer,
  Stack,
  Text,
  useToast,
} from "../../../ui";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface AdminGroupedListingsResponse {
  items?: JsonArray;
  total?: number;
}

interface GroupedListingRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

interface ReassignDrawerState {
  groupId: string;
  groupTitle: string;
  currentProductIds: string[];
}

function ReassignProductsDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: ReassignDrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productIds, setProductIds] = useState<string[]>(state.currentProductIds);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch(
        ADMIN_ENDPOINTS.GROUPED_LISTING_BY_ID(state.groupId),
        { productIds },
      );
      showToast("Products reassigned.", "success");
      onSaved();
      onClose();
    } catch {
      showToast("Failed to save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md" padding="md">
      <Text size="sm" color="muted">
        Select products to include in &ldquo;{state.groupTitle}&rdquo;. Changes replace the current list.
      </Text>
      <ProductInlineSelect
        scope="admin"
        multiple
        value={productIds}
        onChange={setProductIds}
        placeholder="Search products to add…"
      />
      <Row justify="end" gap="sm">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving} isLoading={saving}>
          Save ({productIds.length} product{productIds.length !== 1 ? "s" : ""})
        </Button>
      </Row>
    </Stack>
  );
}

export type AdminGroupedListingsViewProps = ListingLayoutProps;

export function AdminGroupedListingsView({
  children,
  ...props
}: AdminGroupedListingsViewProps) {
  const [reassign, setReassign] = useState<ReassignDrawerState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const config: ListingViewConfig<AdminGroupedListingsResponse, GroupedListingRow> =
    React.useMemo(
      () => ({
        portal: "admin",
        title: "Grouped Listings",
        searchPlaceholder: "Search grouped listings by title or seller",
        emptyLabel: "No grouped listings",
        filterKeys: [],
        defaultSort: sortBy("createdAt", "DESC"),
        queryKey: ["admin", "grouped-listings", refreshKey],
        endpoint: ADMIN_ENDPOINTS.GROUPED_LISTINGS,
        sortOptions: [
          { value: sortBy("createdAt", "DESC"), label: "Newest" },
          { value: sortBy("createdAt", "ASC"), label: "Oldest" },
          { value: "title", label: "Title A–Z" },
        ],
        mapRows: (response) =>
          toRecordArray(response.items).map((item, index) => ({
            id: toStringValue(item.id, `grouped-listing-${index}`),
            primary: toStringValue(item.title ?? item.name, "Untitled group"),
            secondary: [
              toStringValue(item.storeName ?? item.storeId, "Unknown store"),
              `${Array.isArray(item.productIds) ? item.productIds.length : 0} items`,
            ].join(" · "),
            status: toStringValue(item.isActive === false ? "inactive" : "active", "active"),
            updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
            _raw: item,
          })),
        getTotal: (response, mappedRows) =>
          typeof response.total === "number" ? response.total : mappedRows.length,
        buildFilters: () => "",
        renderRowActions: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setReassign({
                groupId: row.id,
                groupTitle: row.primary,
                currentProductIds: Array.isArray((row as { _raw?: { productIds?: unknown } })._raw?.productIds)
                  ? ((row as { _raw?: { productIds?: unknown[] } })._raw?.productIds ?? []).map(String)
                  : [],
              })
            }
          >
            Reassign products
          </Button>
        ),
      }),
      [refreshKey],
    );

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <>
      <DataListingView config={config} />
      <SideDrawer
        isOpen={reassign !== null}
        onClose={() => setReassign(null)}
        title={reassign ? `Reassign products — ${reassign.groupTitle}` : "Reassign products"}
      >
        {reassign && (
          <ReassignProductsDrawer
            state={reassign}
            onClose={() => setReassign(null)}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </SideDrawer>
    </>
  );
}
