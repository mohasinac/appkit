"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Div,
  FormActions,
  SideDrawer,
  Text,
  useToast,
} from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

export interface AdminContactEditorViewProps {
  open: boolean;
  onClose: () => void;
  submissionId?: string;
  subject?: string;
  name?: string;
  email?: string;
  message?: string;
  currentStatus?: string;
}

export function AdminContactEditorView({
  open,
  onClose,
  submissionId,
  subject,
  name,
  email,
  message,
  currentStatus,
}: AdminContactEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const actionMutation = useMutation({
    mutationFn: async (action: "read" | "resolved") => {
      await apiClient.patch(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(submissionId!), { action });
    },
    onSuccess: (_data, action) => {
      const label = action === "read" ? "Marked as read" : "Archived";
      showToast(`${label}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "contact"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Action failed.", "error");
    },
  });

  const statusColor: Record<string, string> = {
    new: "bg-info-surface text-info",
    read: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    resolved: "bg-success-surface text-success",
  };

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={subject ?? "Contact Submission"}
    >
      <Div className="flex flex-col gap-5 p-4">
        {/* Status badge */}
        <Div className="flex items-center gap-2">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">Status:</Text>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColor[currentStatus ?? "new"] ?? statusColor.new
            }`}
          >
            {currentStatus ?? "new"}
          </span>
        </Div>

        {/* From */}
        <Div className="flex flex-col gap-1">
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            From
          </Text>
          <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {name ?? "Unknown"}
          </Text>
          {email && (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">{email}</Text>
          )}
        </Div>

        {/* Message */}
        <Div className="flex flex-col gap-1">
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Message
          </Text>
          <Div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 max-h-64 overflow-y-auto">
            <Text className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {message ?? "No message body."}
            </Text>
          </Div>
        </Div>

        {/* Actions */}
        <FormActions align="right">
          {email && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = `mailto:${email}?subject=Re: ${encodeURIComponent(subject ?? "")}`;
              }}
            >
              Reply via email
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!submissionId || actionMutation.isPending || currentStatus === "read" || currentStatus === "resolved"}
            isLoading={actionMutation.isPending && actionMutation.variables === "read"}
            onClick={() => actionMutation.mutate("read")}
          >
            Mark read
          </Button>
          <Button
            type="button"
            disabled={!submissionId || actionMutation.isPending || currentStatus === "resolved"}
            isLoading={actionMutation.isPending && actionMutation.variables === "resolved"}
            onClick={() => actionMutation.mutate("resolved")}
          >
            Archive
          </Button>
        </FormActions>
      </Div>
    </SideDrawer>
  );
}
