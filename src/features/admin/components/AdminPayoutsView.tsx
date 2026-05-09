"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Div,
  Form,
  FormActions,
  Input,
  ListingViewShell,
  Modal,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toRupees,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

export interface AdminPayoutsViewProps extends ListingViewShellProps {}

interface AdminPayoutsResponse {
  payouts?: unknown[];
  meta?: {
    total?: number;
  };
}

interface PayoutRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminPayoutsView({ children, ...props }: AdminPayoutsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = React.useState<string | null>(null);
  const [transactionId, setTransactionId] = React.useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminPayoutsResponse,
    PayoutRow
  >({
    queryKey: ["admin", "payouts", "listing"],
    endpoint: ADMIN_ENDPOINTS.PAYOUTS,
    mapRows: (response) =>
      toRecordArray(response.payouts).map((item, index) => ({
        id: toStringValue(item.id, `payout-${index}`),
        primary: [
          `Payout ${toStringValue(item.id, "-")}`,
          toRupees(item.amount),
        ].join(" · "),
        secondary: toStringValue(
          (item as Record<string, unknown>).storeName ??
            (item as Record<string, unknown>).sellerName,
          "Unknown store",
        ),
        status: toStringValue(item.status, "Pending"),
        updatedAt: toRelativeDate(
          (item as Record<string, unknown>).updatedAt ??
            (item as Record<string, unknown>).createdAt,
        ),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number"
        ? response.meta.total
        : mappedRows.length,
  });

  const markPaid = useMutation({
    mutationFn: () => {
      if (!selectedPayoutId) throw new Error("No payout selected");
      return apiClient.patch(ADMIN_ENDPOINTS.PAYOUT_BY_ID(selectedPayoutId), {
        status: "paid",
        transactionId: transactionId.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.showToast("Payout marked as paid.", "success");
      setMarkPaidOpen(false);
      setSelectedPayoutId(null);
      setTransactionId("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts", "listing"] });
    },
    onError: () => {
      toast.showToast("Failed to update payout.", "error");
    },
  });

  const handleExportCsv = async () => {
    try {
      const res = await fetch(ADMIN_ENDPOINTS.PAYOUTS_EXPORT);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.showToast("CSV export failed.", "error");
    }
  };

  const closePaidModal = () => {
    setMarkPaidOpen(false);
    setTransactionId("");
  };

  if (hasChildren) {
    return (
      <ListingViewShell portal="admin" {...props}>
        {children}
      </ListingViewShell>
    );
  }

  const rowActions = (row: PayoutRow) => [
    {
      label: "Mark paid",
      onClick: () => {
        setSelectedPayoutId(row.id);
        setMarkPaidOpen(true);
      },
      disabled:
        row.status.toLowerCase() === "paid" ||
        row.status.toLowerCase() === "cancelled",
    },
  ];

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Payout Operations"
        subtitle="Monitor payout eligibility, dispatch readiness, and failure follow-up in one operational queue."
        searchPlaceholder="Search stores, payout IDs, or order groups"
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No payouts found"
        resultSummary={`Showing ${rows.length} of ${total} payouts`}
        actionsSlot={
          <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as PayoutRow)} />
        )}
      />

      <Modal isOpen={markPaidOpen} onClose={closePaidModal} title="Mark payout as paid">
        <Form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            markPaid.mutate();
          }}
        >
          <Input
            label="Transaction / reference ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="UTR, UPI ref, or bank transfer ID (optional)"
          />
          <FormActions align="right">
            <Button type="button" variant="outline" onClick={closePaidModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={markPaid.isPending}>
              {markPaid.isPending ? "Saving..." : "Confirm paid"}
            </Button>
          </FormActions>
        </Form>
      </Modal>
    </>
  );
}
