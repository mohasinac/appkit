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

interface TicketMessageClient {
  id?: string;
  authorId?: string;
  authorRole?: string;
  body?: string;
  createdAt?: string;
}

export interface AdminSupportTicketDetailViewProps {
  open: boolean;
  onClose: () => void;
  ticketId?: string;
  subject?: string;
  userDisplayName?: string;
  category?: string;
  currentStatus?: string;
  currentPriority?: string;
  description?: string;
  messages?: TicketMessageClient[];
  internalNotes?: string;
  orderId?: string;
}

const STATUS_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Waiting on User", value: "waiting_on_user" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

const STATUS_COLOR: Record<string, string> = {
  open: "bg-info-surface text-info",
  in_progress: "bg-warning-surface text-warning",
  waiting_on_user: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  resolved: "bg-success-surface text-success",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const ROLE_LABEL: Record<string, string> = {
  user: "User",
  support: "Support",
  admin: "Admin",
};

export function AdminSupportTicketDetailView({
  open,
  onClose,
  ticketId,
  subject,
  userDisplayName,
  category,
  currentStatus,
  currentPriority,
  description,
  messages = [],
  internalNotes,
  orderId,
}: AdminSupportTicketDetailViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "open");
  const [priority, setPriority] = React.useState(currentPriority ?? "normal");
  const [notes, setNotes] = React.useState(internalNotes ?? "");
  const [replyBody, setReplyBody] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "open");
      setPriority(currentPriority ?? "normal");
      setNotes(internalNotes ?? "");
      setReplyBody("");
    }
  }, [open, currentStatus, currentPriority, internalNotes]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
        status,
        priority,
        internalNotes: notes || undefined,
      });
    },
    onSuccess: () => {
      showToast("Ticket updated.", "success");
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update ticket.", "error");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(
        `/api/support/tickets/${ticketId!}/messages`,
        { body: replyBody, newStatus: status },
      );
    },
    onSuccess: () => {
      showToast("Reply sent.", "success");
      setReplyBody("");
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to send reply.", "error");
    },
  });

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={subject ?? "Support Ticket"}
    >
      <Div className="flex flex-col gap-4 p-4">
        {/* Meta row */}
        <Div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              STATUS_COLOR[currentStatus ?? "open"] ?? STATUS_COLOR.open
            }`}
          >
            {(currentStatus ?? "open").replace(/_/g, " ")}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {category}
          </span>
          {orderId && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Order: {orderId}
            </span>
          )}
        </Div>

        <Div className="text-sm text-zinc-500 dark:text-zinc-400">
          From: <span className="font-medium text-zinc-700 dark:text-zinc-200">{userDisplayName}</span>
        </Div>

        {/* Description */}
        {description && (
          <Div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
            <Text className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Description
            </Text>
            <Text className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
              {description}
            </Text>
          </Div>
        )}

        {/* Message thread */}
        {messages.length > 0 && (
          <Div className="space-y-2">
            <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Messages ({messages.length})
            </Text>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={msg.id ?? i}
                  className={`rounded-lg p-3 text-sm ${
                    msg.authorRole === "user"
                      ? "bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-700"
                      : "bg-info-surface border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-400">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">
                      {ROLE_LABEL[msg.authorRole ?? "user"] ?? msg.authorRole}
                    </span>
                    {msg.createdAt && (
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    )}
                  </div>
                  <Text className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">{msg.body}</Text>
                </div>
              ))}
            </div>
          </Div>
        )}

        {/* Reply box */}
        <Div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Reply to user
          </label>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={3}
            placeholder="Type a reply…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={replyMutation.isPending}
            disabled={!replyBody.trim() || !ticketId || replyMutation.isPending}
            onClick={() => replyMutation.mutate()}
          >
            Send reply
          </Button>
        </Div>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        {/* Status + Priority */}
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />
        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onValueChange={setPriority}
        />

        {/* Internal notes */}
        <Div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Internal notes (staff only)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes visible only to admins and employees…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </Div>

        <FormActions align="right">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={updateMutation.isPending}
            disabled={!ticketId || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save changes
          </Button>
        </FormActions>
      </Div>
    </SideDrawer>
  );
}
