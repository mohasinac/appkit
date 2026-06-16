"use client";

import { Span, useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Div, FormActions, Row, SideDrawer, Stack, Text, useToast } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

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

  const actionMutation = useApiMutation({
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
      <Stack className={`${__P.p4}`} gap="5">
        {/* Status badge */}
        <Row align="center" gap="sm">
          <Text size="xs" color="muted">Status:</Text>
          <Span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColor[currentStatus ?? "new"] ?? statusColor.new
            }`}
          >
            {currentStatus ?? "new"}
          </Span>
        </Row>

        {/* From */}
        <Stack gap="xs">
          <Text className="tracking-wide" color="muted" size="xs" weight="medium" transform="uppercase">
            From
          </Text>
          <Text size="sm" weight="medium" color="primary">
            {name ?? "Unknown"}
          </Text>
          {email && (
            <Text size="sm" color="muted">{email}</Text>
          )}
        </Stack>

        {/* Message */}
        <Stack gap="xs">
          <Text className="tracking-wide" color="muted" size="xs" weight="medium" transform="uppercase">
            Message
          </Text>
          <Div className={`${__P.p3} max-h-64 ${__O.yAuto}`} rounded="lg" surface="muted" border="default">
            <Text className="whitespace-pre-wrap leading-relaxed" color="primary" size="sm">
              {message ?? "No message body."}
            </Text>
          </Div>
        </Stack>

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
      </Stack>
    </SideDrawer>
  );
}
