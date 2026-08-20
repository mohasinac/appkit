"use client";

import React from "react";
import { type JsonArray } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import { Button, Modal, Row, Stack, Text, Textarea } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

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
}

export function AdminCatalogueApprovalsView() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

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
    searchPlaceholder: "Search by title",
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
      })),
    getTotal: (response, mappedRows) => (typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length),
    buildFilters: () => undefined,
    renderRowActions: (row) => (
      <Row gap="sm">
        <Button size="sm" isLoading={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
          Approve
        </Button>
        <Button size="sm" variant="danger" onClick={() => setRejectTarget(row.id)}>
          Reject
        </Button>
      </Row>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
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
