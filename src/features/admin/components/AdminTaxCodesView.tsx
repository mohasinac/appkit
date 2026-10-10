"use client";

import { sortBy, type JsonArray, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { ListingLayout } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminTaxCodeEditorView } from "./AdminTaxCodeEditorView";

const PAGE_SIZE = 50;

interface AdminTaxCodesResponse {
  items?: JsonArray;
  total?: number;
}

interface TaxCodeRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

function mapTaxCodeRow(item: Record<string, JsonValue>, index: number): TaxCodeRow {
  const isActive = typeof item.isActive === "boolean" ? item.isActive : true;
  const rate = typeof item.gstRate === "number" ? item.gstRate : null;
  const hsn = toStringValue(item.hsnCode, "");
  return {
    id: toStringValue(item.id, `tax-${index}`),
    primary: toStringValue(item.label, "Untitled tax code"),
    /*
     * The RATE leads, because it is the number an admin is checking. `0%` is
     * rendered explicitly rather than falling back to an em-dash: a blank
     * would read as "not set", and 0 is a deliberate exemption — the same
     * `undefined`-vs-`0` distinction the field itself depends on. A rate that
     * genuinely has no value says so.
     */
    secondary: [
      rate == null ? "rate not set" : `${rate}% GST`,
      hsn ? `HSN ${hsn}` : "no HSN (exempt)",
      toStringValue(item.chapter, "") ? `chapter ${item.chapter as string}` : "",
    ]
      .filter(Boolean)
      .join(" — "),
    status: isActive ? "Active" : "Inactive",
    updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
  };
}

export type AdminTaxCodesViewProps = ListingLayoutProps;

/**
 * `/admin/tax-codes` — the HSN + GST rate catalogue.
 *
 * 🛑 No bulk actions, deliberately. The two that would be offered by habit are
 * both wrong here: a bulk DELETE would hit the referential guard row by row
 * and report a partial failure an admin cannot act on, and a bulk
 * activate/deactivate across a mixed selection is a rate change applied to
 * things nobody looked at. There are ~10 rows; each one is a per-row decision.
 */
export function AdminTaxCodesView({ children, ...props }: AdminTaxCodesViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminTaxCodesResponse, TaxCodeRow> = {
    portal: "admin",
    title: "Tax Codes",
    // No search box: this endpoint does not read `q`, and a box that accepts
    // typing and changes nothing is worse than no box
    // (audit-listing-search-capability's rule). ~10 rows do not need one.
    emptyLabel: "No tax codes yet",
    filterKeys: [],
    defaultSort: sortBy("label", "ASC"),
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "tax-codes", "listing"],
    /*
     * `?all=true` — the admin list MUST show inactive rows, because
     * deactivating is how a code is retired and reactivating has to be
     * possible. The route's default is active-only because its other caller is
     * the category editor's picker, where offering an inactive code would let
     * an admin point a category at something `findResolvable` then refuses.
     */
    endpoint: `${ADMIN_ENDPOINTS.TAX_CODES}?all=true`,
    sortOptions: [
      { value: "label", label: "Label A–Z" },
      { value: sortBy("label", "DESC"), label: "Label Z–A" },
      { value: "gstRate", label: "Rate, low to high" },
      { value: sortBy("gstRate", "DESC"), label: "Rate, high to low" },
      { value: "hsnCode", label: "HSN code" },
    ],
    mapRows: (response) => toRecordArray(response.items).map(mapTaxCodeRow),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: () => undefined,
    primaryAction: {
      label: "Add Tax Code",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    renderEditor: ({ editId, closePanel }) => (
      <AdminTaxCodeEditorView
        taxCodeId={editId ?? undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) =>
      isCreate ? "Add Tax Code" : "Edit Tax Code",
  };

  return <DataListingView config={config} />;
}
