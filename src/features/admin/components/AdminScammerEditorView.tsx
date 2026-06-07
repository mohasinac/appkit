"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Div,
  FormActions,
  Select,
  SideDrawer,
  Text,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const CLS_SECTION_LABEL = "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide";

export interface AdminScammerEditorViewProps {
  open: boolean;
  onClose: () => void;
  scammerId?: string;
  displayNames?: string[];
  scamType?: string;
  description?: string;
  phones?: string[];
  upiIds?: string[];
  currentStatus?: string;
  verificationNote?: string;
  reportedBy?: string;
  reportedByAnon?: boolean;
}

const STATUS_OPTIONS = [
  { label: "Pending review", value: "pending_review" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Removed", value: "removed" },
];

const STATUS_COLOR: Record<string, string> = {
  pending_review: "bg-warning-surface text-warning",
  verified: "bg-success-surface text-success",
  rejected: "bg-error-surface text-error",
  removed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function AdminScammerEditorView({
  open,
  onClose,
  scammerId,
  displayNames = [],
  scamType,
  description,
  phones = [],
  upiIds = [],
  currentStatus,
  verificationNote,
  reportedBy,
  reportedByAnon,
}: AdminScammerEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "pending_review");
  const [note, setNote] = React.useState(verificationNote ?? "");

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "pending_review");
      setNote(verificationNote ?? "");
    }
  }, [open, currentStatus, verificationNote]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.SCAMMER_BY_ID(scammerId!), {
        status,
        verificationNote: note || undefined,
      });
    },
    onSuccess: () => {
      showToast("Scammer profile updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "scammers"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update profile.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.SCAMMER_BY_ID(scammerId!));
    },
    onSuccess: () => {
      showToast("Scammer profile deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "scammers"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete profile.", "error");
    },
  });

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={displayNames.length > 0 ? displayNames[0] : "Scammer Profile"}
    >
      <Div className={`flex flex-col gap-4 ${__P.p4}`}>
        {/* Status badge */}
        <Div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              STATUS_COLOR[currentStatus ?? "pending_review"] ?? STATUS_COLOR.pending_review
            }`}
          >
            {(currentStatus ?? "pending_review").replace(/_/g, " ")}
          </span>
          {scamType && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {scamType.replace(/_/g, " ")}
            </span>
          )}
        </Div>

        {/* Names */}
        {displayNames.length > 0 && (
          <Div>
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Names / Aliases
            </Text>
            <Div className="flex flex-wrap gap-1">
              {displayNames.map((name, i) => (
                <span
                  key={i}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs dark:bg-zinc-800"
                >
                  {name}
                </span>
              ))}
            </Div>
          </Div>
        )}

        {/* Contact identifiers */}
        {(phones.length > 0 || upiIds.length > 0) && (
          <Div className={`rounded-lg border border-zinc-200 bg-zinc-50 ${__P.p3} dark:border-zinc-700 dark:bg-zinc-900/40`}>
            {phones.length > 0 && (
              <Div className="mb-2">
                <Text className={CLS_SECTION_LABEL}>
                  Phone numbers
                </Text>
                <Div className="flex flex-wrap gap-1">
                  {phones.map((p, i) => (
                    <code key={i} className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
                      {p}
                    </code>
                  ))}
                </Div>
              </Div>
            )}
            {upiIds.length > 0 && (
              <>
                <Text className={CLS_SECTION_LABEL}>
                  UPI IDs
                </Text>
                <Div className="flex flex-wrap gap-1">
                  {upiIds.map((u, i) => (
                    <code key={i} className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
                      {u}
                    </code>
                  ))}
                </Div>
              </>
            )}
          </Div>
        )}

        {/* Description */}
        {description && (
          <Div className={`rounded-lg border border-zinc-200 bg-zinc-50 ${__P.p3} dark:border-zinc-700 dark:bg-zinc-900/40`}>
            <Text className={CLS_SECTION_LABEL}>
              Description
            </Text>
            <Text className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
              {description}
            </Text>
          </Div>
        )}

        {/* Reporter */}
        <Div className="text-xs text-zinc-500 dark:text-zinc-400">
          Reported by:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {reportedByAnon ? "Anonymous" : (reportedBy ?? "Unknown")}
          </span>
        </Div>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        {/* Status change */}
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />

        {/* Verification note */}
        <Div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verification note (internal)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Verified via 3 independent reports…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </Div>

        <FormActions align="right">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={!scammerId}
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={updateMutation.isPending}
            disabled={!scammerId || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save changes
          </Button>
        </FormActions>
      </Div>
    </SideDrawer>
  );
}
