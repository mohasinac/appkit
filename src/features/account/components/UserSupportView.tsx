"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Div,
  FormActions,
  Select,
  SideDrawer,
  Span,
  Text,
  Ul,
  useToast,
} from "../../../ui";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { apiClient } from "../../../http";
import { SUPPORT_ENDPOINTS } from "../../../constants/api-endpoints";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

interface TicketMessage {
  id?: string;
  authorRole?: string;
  body?: string;
  createdAt?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  description?: string;
  messages?: TicketMessage[];
  createdAt?: string;
  updatedAt?: string;
  orderId?: string;
}

interface UserSupportResponse {
  tickets?: SupportTicket[];
}

// --- Constants ---------------------------------------------------------------

const CLS_INPUT =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500";

const CATEGORY_OPTIONS = [
  { label: "Order Issue", value: "order_issue" },
  { label: "Billing / Payment", value: "billing_payment" },
  { label: "Account", value: "account" },
  { label: "Listing Dispute", value: "listing_dispute" },
  { label: "Refund Request", value: "refund_request" },
  { label: "Auction Dispute", value: "auction_dispute" },
  // ST-4 — sellers use this to request changes to admin-controlled
  // store fields (status, capabilities, verification badge).
  { label: "Store Change Request (sellers)", value: "store_change_request" },
  // ST-3 — buyers/sellers request mutation of order line items
  { label: "Order Modification Request", value: "order_modification_request" },
  // ST-5 — appeal a soft or hard ban; bypasses the create_support_tickets
  // soft-ban guard server-side.
  { label: "Appeal a ban (unban request)", value: "unban_request" },
  { label: "General", value: "general" },
];

const CLS_MSG_USER = "bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-700";
const CLS_MSG_STAFF = "bg-info-surface border border-info dark:bg-info-surface dark:border-info";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-info-surface text-info",
  in_progress: "bg-warning-surface text-warning",
  waiting_on_user: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  resolved: "bg-success-surface text-success",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const ROLE_LABEL: Record<string, string> = {
  user: "You",
  support: "Support",
  admin: "Admin",
};

// --- Component ---------------------------------------------------------------

export type UserSupportViewProps = Record<string, never>;

export function UserSupportView(_props: UserSupportViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  // New ticket form state
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newDescription, setNewDescription] = useState("");
  const [newOrderId, setNewOrderId] = useState("");

  // Reply state
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, error } = useQuery<UserSupportResponse>({
    queryKey: ["user", "support-tickets"],
    queryFn: () => apiClient.get<UserSupportResponse>(SUPPORT_ENDPOINTS.TICKETS),
  });

  const tickets = data?.tickets ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["user", "support-tickets"] });

  const createMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.post(SUPPORT_ENDPOINTS.TICKETS, {
        subject: newSubject.trim(),
        category: newCategory,
        description: newDescription.trim(),
        orderId: newOrderId.trim() || undefined,
      });
    },
    onSuccess: () => {
      showToast("Support ticket created.", "success");
      setNewTicketOpen(false);
      setNewSubject("");
      setNewCategory("general");
      setNewDescription("");
      setNewOrderId("");
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to create ticket.", "error");
    },
  });

  const replyMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.post(
        SUPPORT_ENDPOINTS.TICKET_MESSAGES(selectedTicket!.id),
        { body: replyBody.trim() },
      );
    },
    onSuccess: () => {
      showToast("Reply sent.", "success");
      setReplyBody("");
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to send reply.", "error");
    },
  });

  return (
    <>
      <Div className="mx-auto max-w-2xl px-4 py-6">
        <Div className="mb-4 flex items-center justify-between">
          <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Support Tickets</Text>
          <Button type="button" variant="primary" size="sm" onClick={() => setNewTicketOpen(true)}>New ticket</Button>
        </Div>
        {renderTicketListArea({ isLoading, error, tickets, setSelectedTicket, setDetailOpen })}
      </Div>
      {renderNewTicketDrawer({ newTicketOpen, setNewTicketOpen, newCategory, setNewCategory, newSubject, setNewSubject, newOrderId, setNewOrderId, newDescription, setNewDescription, createMutation })}
      {renderTicketDetailDrawer({ detailOpen, setDetailOpen, selectedTicket, replyBody, setReplyBody, replyMutation })}
    </>
  );
}

function renderTicketListArea(props: {
  isLoading: boolean; error: unknown; tickets: SupportTicket[];
  setSelectedTicket: (t: SupportTicket) => void; setDetailOpen: (v: boolean) => void;
}) {
  const { isLoading, error, tickets, setSelectedTicket, setDetailOpen } = props;
  return (
    <>
      {isLoading && (
        <Div className="space-y-3">
          {[1, 2, 3].map((i) => <Div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}
        </Div>
      )}
      {error && (
        <Div className="rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
          Failed to load support tickets.
        </Div>
      )}
      {!isLoading && tickets.length === 0 && (
        <Div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">You haven&apos;t opened any support tickets yet.</Text>
        </Div>
      )}
      <Ul className="space-y-3">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Button variant="ghost" type="button" className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 transition-colors dark:border-zinc-700 dark:bg-zinc-900" onClick={() => { setSelectedTicket(ticket); setDetailOpen(true); }}>
              <Div className="flex items-start justify-between gap-2">
                <Div className="min-w-0 flex-1">
                  <Text className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{ticket.subject}</Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">{ticket.category.replace(/_/g, " ")}{ticket.orderId ? ` · Order: ${ticket.orderId}` : ""}</Text>
                </Div>
                <Span size="xs" weight="medium" className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 ${STATUS_BADGE[ticket.status] ?? STATUS_BADGE.open}`}>{ticket.status.replace(/_/g, " ")}</Span>
              </Div>
            </Button>
          </li>
        ))}
      </Ul>
    </>
  );
}

 
function renderNewTicketDrawer(props: { newTicketOpen: boolean; setNewTicketOpen: (v: boolean) => void; newCategory: string; setNewCategory: (v: string) => void; newSubject: string; setNewSubject: (v: string) => void; newOrderId: string; setNewOrderId: (v: string) => void; newDescription: string; setNewDescription: (v: string) => void; createMutation: any }) {
  const { newTicketOpen, setNewTicketOpen, newCategory, setNewCategory, newSubject, setNewSubject, newOrderId, setNewOrderId, newDescription, setNewDescription, createMutation } = props;
  return (
    <SideDrawer isOpen={newTicketOpen} onClose={() => setNewTicketOpen(false)} title="Open a support ticket">
      <Div className={`flex flex-col gap-4 ${__P.p4}`}>
        <Select label="Category" options={CATEGORY_OPTIONS} value={newCategory} onValueChange={setNewCategory} />
        <FieldInput
          name="subject"
          label="Subject"
          type="text"
          value={newSubject}
          onChange={setNewSubject}
          placeholder="Brief description of the issue"
        />
        {newCategory === "order_issue" && (
          <FieldInput
            name="orderId"
            label="Order ID"
            type="text"
            value={newOrderId}
            onChange={setNewOrderId}
            placeholder="e.g. order-3-20260508-a1b2c3"
          />
        )}
        <FieldTextarea
          name="description"
          label="Description"
          value={newDescription}
          onChange={setNewDescription}
          rows={4}
          placeholder="Describe the issue in detail…"
        />
        <FormActions align="right">
          <Button type="button" variant="secondary" onClick={() => setNewTicketOpen(false)}>Cancel</Button>
          <Button type="button" isLoading={createMutation.isPending} disabled={!newSubject.trim() || !newDescription.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>Submit ticket</Button>
        </FormActions>
      </Div>
    </SideDrawer>
  );
}

 
function renderTicketDetailDrawer(props: { detailOpen: boolean; setDetailOpen: (v: boolean) => void; selectedTicket: SupportTicket | null; replyBody: string; setReplyBody: (v: string) => void; replyMutation: any }) {
  const { detailOpen, setDetailOpen, selectedTicket, replyBody, setReplyBody, replyMutation } = props;
  return (
    <SideDrawer isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedTicket?.subject ?? "Ticket"}>
      {selectedTicket && (
        <Div className={`flex flex-col gap-4 ${__P.p4}`}>
          <Div className="flex flex-wrap gap-2">
            <Span size="xs" weight="medium" className={`inline-flex rounded-full px-2.5 py-1 ${STATUS_BADGE[selectedTicket.status] ?? STATUS_BADGE.open}`}>{selectedTicket.status.replace(/_/g, " ")}</Span>
            <Span size="xs" className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{selectedTicket.category.replace(/_/g, " ")}</Span>
            {selectedTicket.orderId && <Span size="xs" className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Order: {selectedTicket.orderId}</Span>}
          </Div>
          {selectedTicket.description && (
            <Div className={`rounded-lg border border-zinc-200 bg-zinc-50 ${__P.p3} dark:border-zinc-700 dark:bg-zinc-900/40`}>
              <Text className="mb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Your description</Text>
              <Text className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">{selectedTicket.description}</Text>
            </Div>
          )}
          {(selectedTicket.messages ?? []).length > 0 && (
            <Div className="space-y-2">
              <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Messages</Text>
              <Div className={`space-y-2 max-h-72 ${__O.yAuto}`}>
                {(selectedTicket.messages ?? []).map((msg, i) => (
                  <Div key={msg.id ?? i} className={`rounded-lg ${__P.p3} text-sm ${msg.authorRole === "user" ? CLS_MSG_USER : CLS_MSG_STAFF}`}>
                    <Div className="mb-1 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-400">
                      <Span weight="medium" className="text-zinc-600 dark:text-zinc-300">{ROLE_LABEL[msg.authorRole ?? "user"] ?? msg.authorRole}</Span>
                      {msg.createdAt && <Span>{new Date(msg.createdAt).toLocaleString()}</Span>}
                    </Div>
                    <Text className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">{msg.body}</Text>
                  </Div>
                ))}
              </Div>
            </Div>
          )}
          {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
            <Div className="flex flex-col gap-2">
              <FieldTextarea
                name="reply"
                label="Reply"
                value={replyBody}
                onChange={setReplyBody}
                rows={3}
                placeholder="Add a message to your ticket…"
              />
              <Button type="button" variant="primary" size="sm" isLoading={replyMutation.isPending} disabled={!replyBody.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()}>Send reply</Button>
            </Div>
          )}
        </Div>
      )}
    </SideDrawer>
  );
}
