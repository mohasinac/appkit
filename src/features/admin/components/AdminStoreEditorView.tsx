"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  FormActions,
  Select,
  SideDrawer,
  Toggle,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface AdminStoreEditorViewProps {
  open: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  currentStatus?: string;
  currentIsVerified?: boolean;
}

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
  { label: "Rejected", value: "rejected" },
];

// --- Component ---------------------------------------------------------------

export function AdminStoreEditorView({
  open,
  onClose,
  storeId,
  storeName,
  currentStatus,
  currentIsVerified,
}: AdminStoreEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [storeStatus, setStoreStatus] = React.useState(currentStatus ?? "pending");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(currentIsVerified ?? false);
  const [suspensionReason, setSuspensionReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStoreStatus(currentStatus ?? "pending");
      setAdminNotes("");
      setIsFeatured(false);
      setIsVerified(currentIsVerified ?? false);
      setSuspensionReason("");
    }
  }, [open, currentStatus, currentIsVerified]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(storeId!), {
        storeStatus,
        adminNotes: adminNotes || undefined,
        isFeatured,
        isVerified,
        suspensionReason: storeStatus === "suspended" ? (suspensionReason || undefined) : undefined,
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
        className="space-y-4 p-4"
      >
        <Select
          label="Store status"
          options={STATUS_OPTIONS}
          value={storeStatus}
          onValueChange={setStoreStatus}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Admin notes (optional)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Reason for suspension, approval notes…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <Toggle label="Verified store" checked={isVerified} onChange={setIsVerified} />

        <Toggle label="Featured store" checked={isFeatured} onChange={setIsFeatured} />

        {storeStatus === "suspended" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Suspension reason (optional)
            </label>
            <textarea
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              rows={2}
              placeholder="e.g. Policy violation, fraudulent activity…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

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
      </Form>
    </SideDrawer>
  );
}
