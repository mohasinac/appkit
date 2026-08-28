"use client";
import { normalizeError } from "../../../errors/normalize";

/**
 * AdminGroupedListingsView — admin moderation view for grouped product listings.
 * W1-29 — pairs with the new GET /api/admin/grouped-listings endpoint.
 */

import { sortBy, type JsonArray, type JsonValue } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import {
  Button,
  Row,
  SideDrawer,
  Stack,
  Text,
  TextLink,
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
import { ROUTES } from "../../../next/routing/route-map";

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
    } catch (_err) {
      void normalizeError(_err);
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

  const openReassign = React.useCallback((row: GroupedListingRow) => {
    setReassign({
      groupId: row.id,
      groupTitle: row.primary,
      currentProductIds: Array.isArray((row as { _raw?: { productIds?: JsonValue } })._raw?.productIds)
        ? ((row as { _raw?: { productIds?: JsonArray } })._raw?.productIds ?? []).map(String)
        : [],
    });
  }, []);

  const config: ListingViewConfig<AdminGroupedListingsResponse, GroupedListingRow> =
    React.useMemo(
      () => ({
        portal: "admin",
        title: "Grouped Listings",
        // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
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
        /*
         * Admin had NO create path at all — there was no POST route either,
         * so this could not have been wired before now.
         *
         * `toolbarExtra` rather than `primaryAction`: the latter takes an
         * `onClick(panel)` for opening a create DRAWER, and this create is a
         * page. Same shape `AdminAdsView` uses, and `audit-create-affordance`
         * counts both — which is exactly why it has to, or four views with a
         * perfectly good create link would read as having none.
         */
        toolbarExtra: (
          <TextLink
            variant="bare"
            href={String(ROUTES.ADMIN.GROUPED_LISTINGS_NEW)}
            rounded="md"
            paddingX="sm"
            size="sm"
            weight="medium"
            layout="inline-flex"
            align="center"
            className="h-9 bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)]"
          >
            New group
          </TextLink>
        ),
        // Mirrors the row action button's "Reassign products" drawer so the
        // row itself is clickable, not just the button.
        onRowClick: (row) => openReassign(row),
        renderRowActions: (row) => (
          <Row gap="xs">
            {/*
             * Edit comes first. Reassign-products is a narrow drawer over ONE
             * field; until now it was the only thing an admin could change,
             * because the PATCH schema silently dropped every other key.
             */}
            <TextLink href={String(ROUTES.ADMIN.GROUPED_LISTINGS_EDIT(row.id))}>
              Edit
            </TextLink>
            <Button size="sm" variant="outline" onClick={() => openReassign(row)}>
              Reassign products
            </Button>
          </Row>
        ),
      }),
      [refreshKey, openReassign],
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
