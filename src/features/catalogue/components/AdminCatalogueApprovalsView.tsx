"use client";

import React from "react";
import { type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import { Button, Modal, RecordDetailModal, Row, Stack, Text, Textarea } from "../../../ui";
import type { RecordDetailItem } from "../../../ui";
import type { JsonValue } from "../../../schemas/types";
import { formatCurrency } from "../../../utils/number.formatter";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import { RecordStatusTimeline } from "../../status-history/components/RecordStatusTimeline";

interface AdminCatalogueApiResponse {
  items?: JsonArray;
  meta?: { total?: number };
}

interface CatalogueApprovalRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw: Record<string, JsonValue>;
}

/** The submitted item's photos — the whole point of a visual approval. */
function toPhotoEntries(raw: Record<string, JsonValue>): RecordDetailItem[] {
  const images = Array.isArray(raw.images) ? raw.images : [];
  return images
    .filter((i): i is string => typeof i === "string")
    .map((url, i) => ({ image: url, title: `Photo ${i + 1}` }));
}

export function AdminCatalogueApprovalsView() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [selected, setSelected] = React.useState<CatalogueApprovalRow | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "catalogue-approvals"] });

  const approveMutation = useApiMutation({
    successMessage: "Approved and listed",
    mutationFn: (id: string) => apiClient.post(ADMIN_ENDPOINTS.CATALOGUE_APPROVE(id)),
    onSuccess: invalidate,
  });

  const rejectMutation = useApiMutation({
    successMessage: "Rejected",
    mutationFn: () => apiClient.post(ADMIN_ENDPOINTS.CATALOGUE_REJECT(rejectTarget!), { reason: rejectReason }),
    onSuccess: () => {
      setRejectTarget(null);
      setRejectReason("");
      invalidate();
    },
  });

  const config: ListingViewConfig<AdminCatalogueApiResponse, CatalogueApprovalRow> = {
    portal: "admin",
    title: "Catalogue Approvals",
    // Search intentionally absent: this endpoint does not read `q`, so the box accepted typing and changed nothing. Restore it when the collection gains searchTxt — audit-listing-search-capability tracks it.
    emptyLabel: "No pending catalogue requests",
    filterKeys: [],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "catalogue-approvals", "listing"],
    endpoint: ADMIN_ENDPOINTS.CATALOGUE_APPROVALS,
    sortOptions: [{ value: sortBy("createdAt", "DESC"), label: "Newest" }],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `catalogue-${index}`),
        primary: toStringValue(item.title, "Untitled item"),
        secondary: toStringValue(item.ownerId, ""),
        status: toStringValue(item.listingStatus, "pending_admin_approval"),
        updatedAt: toRelativeDate(item.submittedForApprovalAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => (typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length),
    buildFilters: () => undefined,
    // Approve/Reject used to be the ONLY row affordance — an admin was asked
    // to accept or refuse a submission whose photos, description and price
    // were never rendered anywhere. "View" opens those first.
    onRowClick: (row) => setSelected(row),
    renderRowActions: (row) => (
      <Row gap="sm">
        <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
          View
        </Button>
        <Button size="sm" isLoading={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
          Approve
        </Button>
        <Button size="sm" variant="danger" onClick={() => setRejectTarget(row.id)}>
          Reject
        </Button>
      </Row>
    ),
  };

  const raw = selected?._raw ?? {};
  const price = typeof raw.price === "number" ? raw.price : undefined;

  return (
    <>
      <DataListingView config={config} />
      <RecordDetailModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.primary ?? "Catalogue Submission"}
        badges={[{ label: selected?.status ?? "pending", variant: "warning" }]}
        description={toStringValue(raw.description, "") || undefined}
        fields={[
          { label: "Submitted by", value: toStringValue(raw.ownerId, "—") },
          { label: "Estimated price", value: price !== undefined ? formatCurrency(price) : "—" },
          { label: "Quantity", value: String(raw.quantity ?? 1) },
          { label: "Condition", value: toStringValue(raw.condition, "—") },
          { label: "Submitted", value: selected?.updatedAt ?? "—" },
        ]}
        items={{ heading: "Photos", entries: toPhotoEntries(raw) }}
        extra={
          // "Why was mine rejected and by whom" — `rejectionReason` alone is
          // overwritten by the next decision.
          <RecordStatusTimeline
            entries={(raw as { statusHistory?: never[] }).statusHistory}
            truncatedCount={(raw as { statusHistoryTruncated?: number }).statusHistoryTruncated}
          />
        }
        footer={
          selected ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  setRejectTarget(selected.id);
                  setSelected(null);
                }}
              >
                Reject
              </Button>
              <Button
                isLoading={approveMutation.isPending}
                onClick={() => {
                  approveMutation.mutate(selected.id);
                  setSelected(null);
                }}
              >
                Approve
              </Button>
            </>
          ) : null
        }
      />
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject this catalogue listing?" size="sm">
        <Stack gap="md">
          <Text variant="secondary">The owner will see this reason.</Text>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection" />
          <Button isLoading={rejectMutation.isPending} disabled={!rejectReason.trim()} variant="danger" onClick={() => rejectMutation.mutate()}>
            Reject
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
