"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Div, FormActions, Input, Label, Row, Select, SideDrawer, Span, Stack, Text, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

interface TicketMessageClient {
  id?: string;
  authorId?: string;
  authorRole?: string;
  body?: string;
  createdAt?: string;
}

interface RelatedPartiesClient {
  userId?: string;
  storeId?: string;
  orderId?: string;
  productId?: string;
  bidId?: string;
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
  /** ST-6 — current relatedParties snapshot from the ticket document. */
  relatedParties?: RelatedPartiesClient;
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
  relatedParties,
}: AdminSupportTicketDetailViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "open");
  const [priority, setPriority] = React.useState(currentPriority ?? "normal");
  const [notes, setNotes] = React.useState(internalNotes ?? "");
  const [replyBody, setReplyBody] = React.useState("");
  // ST-6 — local edits for the linked-parties panel
  const [parties, setParties] = React.useState<RelatedPartiesClient>(
    relatedParties ?? {},
  );

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "open");
      setPriority(currentPriority ?? "normal");
      setNotes(internalNotes ?? "");
      setReplyBody("");
      setParties(relatedParties ?? {});
    }
  }, [open, currentStatus, currentPriority, internalNotes, relatedParties]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });

  const cleanedParties = React.useMemo(() => {
    const out: RelatedPartiesClient = {};
    if (parties.userId?.trim()) out.userId = parties.userId.trim();
    if (parties.storeId?.trim()) out.storeId = parties.storeId.trim();
    if (parties.orderId?.trim()) out.orderId = parties.orderId.trim();
    if (parties.productId?.trim()) out.productId = parties.productId.trim();
    if (parties.bidId?.trim()) out.bidId = parties.bidId.trim();
    return out;
  }, [parties]);

  const updateMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
        status,
        priority,
        internalNotes: notes || undefined,
        relatedParties:
          Object.keys(cleanedParties).length > 0 ? cleanedParties : undefined,
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

  const replyMutation = useApiMutation({
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

  // ST-4 — Apply Store Change action (only relevant for store_change_request)
  const [storeStatus, setStoreStatus] = React.useState("active");
  const [storeIsVerified, setStoreIsVerified] = React.useState(false);
  const [storeIsFeatured, setStoreIsFeatured] = React.useState(false);
  const linkedStoreId = parties.storeId?.trim();
  const isStoreChangeRequest = category === "store_change_request";

  const applyStoreChange = useApiMutation({
    mutationFn: async () => {
      if (!linkedStoreId) throw new Error("No linked store on this ticket.");
      await apiClient.patch(ADMIN_ENDPOINTS.STORE_BY_ID(linkedStoreId), {
        storeStatus,
        isVerified: storeIsVerified,
        isFeatured: storeIsFeatured,
      });
    },
    onSuccess: () => {
      showToast("Store change applied.", "success");
      // Append an internal note marking the action; non-fatal if it fails.
      apiClient
        .patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
          internalNotes:
            (notes ? notes + "\n" : "") +
            `[${new Date().toISOString()}] Applied store change to ${linkedStoreId}: status=${storeStatus}, verified=${storeIsVerified}, featured=${storeIsFeatured}`,
        })
        .catch(() => {}); // audit-silent-catch-ok: ticket-note metadata; primary admin action already succeeded
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to apply store change.", "error");
    },
  });

  // ST-3 — Modify Order Items panel (fetches current items on demand, lets
  // admin edit quantity per line + remove lines, then PATCHes the order).
  const [orderItemsOpen, setOrderItemsOpen] = React.useState(false);
  const [orderItems, setOrderItems] = React.useState<OrderItemEdit[]>([]);
  const linkedOrderId = parties.orderId?.trim() || orderId;
  const isOrderModificationRequest =
    category === "order_modification_request" || category === "order_issue";

  const loadOrderItems = useApiMutation({
    mutationFn: async () => {
      if (!linkedOrderId) throw new Error("No linked order on this ticket.");
      const res = await apiClient.get<{
        items?: OrderItemEdit[];
      }>(ADMIN_ENDPOINTS.ORDER_BY_ID(linkedOrderId));
      const items = Array.isArray(res?.items) ? res.items : [];
      setOrderItems(
        items.map((it) => ({
          productId: String(it.productId ?? ""),
          productTitle: String(it.productTitle ?? ""),
          quantity: Number(it.quantity ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          totalPrice: Number(it.totalPrice ?? 0),
        })),
      );
      setOrderItemsOpen(true);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to load order.", "error");
    },
  });

  // ST-5 — Lift Ban actions for unban_request tickets
  const linkedUserId = parties.userId?.trim();
  const isUnbanRequest = category === "unban_request";

  const liftHardBan = useApiMutation({
    mutationFn: async () => {
      if (!linkedUserId) throw new Error("No linked user on this ticket.");
      await apiClient.post(ADMIN_ENDPOINTS.USER_UNBAN(linkedUserId), {});
    },
    onSuccess: () => {
      showToast("Hard ban lifted.", "success");
      apiClient
        .patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
          internalNotes:
            (notes ? notes + "\n" : "") +
            `[${new Date().toISOString()}] Lifted hard ban for ${linkedUserId}`,
          status: "resolved",
        })
        .catch(() => {}); // audit-silent-catch-ok: ticket-note metadata; primary admin action already succeeded
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to lift hard ban.", "error");
    },
  });

  const liftSoftBanTickets = useApiMutation({
    mutationFn: async () => {
      if (!linkedUserId) throw new Error("No linked user on this ticket.");
      await apiClient.delete(
        ADMIN_ENDPOINTS.USER_SOFT_BAN_LIFT(linkedUserId, "create_support_tickets"),
      );
    },
    onSuccess: () => {
      showToast("Ticket-creation soft ban lifted.", "success");
      apiClient
        .patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
          internalNotes:
            (notes ? notes + "\n" : "") +
            `[${new Date().toISOString()}] Lifted create_support_tickets soft ban for ${linkedUserId}`,
          status: "resolved",
        })
        .catch(() => {}); // audit-silent-catch-ok: ticket-note metadata; primary admin action already succeeded
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to lift soft ban.", "error");
    },
  });

  const applyOrderItems = useApiMutation({
    mutationFn: async () => {
      if (!linkedOrderId) throw new Error("No linked order on this ticket.");
      // Recalculate totalPrice per line from quantity × unitPrice so qty edits
      // flow through. Lines with quantity 0 are dropped.
      const items = orderItems
        .filter((it) => it.quantity > 0)
        .map((it) => ({
          productId: it.productId,
          productTitle: it.productTitle,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.quantity * it.unitPrice,
        }));
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(linkedOrderId), {
        items,
      });
    },
    onSuccess: () => {
      showToast("Order items updated.", "success");
      apiClient
        .patch(ADMIN_ENDPOINTS.SUPPORT_TICKET_BY_ID(ticketId!), {
          internalNotes:
            (notes ? notes + "\n" : "") +
            `[${new Date().toISOString()}] Modified order ${linkedOrderId} items: ${orderItems
              .filter((it) => it.quantity > 0)
              .map((it) => `${it.productId}x${it.quantity}`)
              .join(", ")}`,
        })
        .catch(() => {}); // audit-silent-catch-ok: ticket-note metadata; primary admin action already succeeded
      invalidate();
      setOrderItemsOpen(false);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update order items.", "error");
    },
  });

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={subject ?? "Support Ticket"}
    >
      <Div className={`flex flex-col gap-4 ${__P.p4}`}>
        {/* Meta row */}
        <Row align="center" gap="sm" wrap>
          <Span
            size="xs"
            weight="medium"
            className={`inline-flex rounded-full px-2.5 py-1 ${
              STATUS_COLOR[currentStatus ?? "open"] ?? STATUS_COLOR.open
            }`}
          >
            {(currentStatus ?? "open").replace(/_/g, " ")}
          </Span>
          <Span size="xs" className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800" color="muted">
            {category}
          </Span>
          {orderId && (
            <Span size="xs" className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800" color="muted">
              Order: {orderId}
            </Span>
          )}
        </Row>

        <Div className="text-sm text-zinc-500 dark:text-zinc-400">
          From: <Span weight="medium" color="primary">{userDisplayName}</Span>
        </Div>

        {/* Description */}
        {description && (
          <Div className={`rounded-lg border border-zinc-200 bg-zinc-50 ${__P.p3} dark:border-zinc-700 dark:bg-zinc-900/40`}>
            <Text className="mb-1 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Description
            </Text>
            <Text className="whitespace-pre-wrap" color="primary" size="sm">
              {description}
            </Text>
          </Div>
        )}

        {/* Message thread */}
        {messages.length > 0 && (
          <Stack gap="sm">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Messages ({messages.length})
            </Text>
            <Div className={`space-y-2 max-h-64 ${__O.yAuto}`}>
              {messages.map((msg, i) => (
                <Div
                  key={msg.id ?? i}
                  className={`rounded-lg p-3 text-sm ${
                    msg.authorRole === "user"
                      ? "bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-700"
                      : "bg-info-surface border border-info dark:border-info"
                  }`}
                >
                  <Row className="mb-1 text-xs text-zinc-400 dark:text-zinc-400" align="center" gap="sm">
                    <Span weight="medium" color="muted">
                      {ROLE_LABEL[msg.authorRole ?? "user"] ?? msg.authorRole}
                    </Span>
                    {msg.createdAt && (
                      <Span>{new Date(msg.createdAt).toLocaleString()}</Span>
                    )}
                  </Row>
                  <Text className="whitespace-pre-wrap" color="primary">{msg.body}</Text>
                </Div>
              ))}
            </Div>
          </Stack>
        )}

        {/* Reply box */}
        <Stack gap="xs">
          <Label className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wide" size="xs" weight="semibold">
            Reply to user
          </Label>
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
        </Stack>

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
        <Stack gap="xs">
          <Label className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wide" size="xs" weight="semibold">
            Internal notes (staff only)
          </Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes visible only to admins and employees…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </Stack>

        {/* ST-6 — Linked parties (admin-assigned subjects of this ticket) */}
        <Stack
          padding="sm" gap="sm" rounded="lg" border="default"
        >
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
            Linked parties
          </Text>
          <Text size="xs" color="muted">
            Tag the buyer / store / order / product / bid this ticket concerns.
          </Text>
          {([
            ["userId", "User slug"],
            ["storeId", "Store slug"],
            ["orderId", "Order ID"],
            ["productId", "Product slug"],
            ["bidId", "Bid ID"],
          ] as const).map(([key, label]) => (
            <Input
              key={key}
              label={label}
              type="text"
              value={parties[key] ?? ""}
              onChange={(e) =>
                setParties((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={label}
            />
          ))}
        </Stack>

        {isOrderModificationRequest && (
          <OrderItemsPanel
            linkedOrderId={linkedOrderId}
            orderItemsOpen={orderItemsOpen}
            setOrderItemsOpen={setOrderItemsOpen}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            loadOrderItems={loadOrderItems}
            applyOrderItems={applyOrderItems}
          />
        )}

        {isStoreChangeRequest && (
          <StoreChangePanel
            linkedStoreId={linkedStoreId}
            storeStatus={storeStatus}
            setStoreStatus={setStoreStatus}
            storeIsVerified={storeIsVerified}
            setStoreIsVerified={setStoreIsVerified}
            storeIsFeatured={storeIsFeatured}
            setStoreIsFeatured={setStoreIsFeatured}
            applyStoreChange={applyStoreChange}
          />
        )}

        {isUnbanRequest && (
          <UnbanRequestPanel
            linkedUserId={linkedUserId}
            liftHardBan={liftHardBan}
            liftSoftBanTickets={liftSoftBanTickets}
          />
        )}

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

// ── Sub-components extracted to keep parent under LARGE_COMPONENT threshold ──

interface OrderItemEdit {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

 
function OrderItemsPanel(props: {
  linkedOrderId: string | undefined;
  orderItemsOpen: boolean;
  setOrderItemsOpen: (v: boolean) => void;
  orderItems: OrderItemEdit[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItemEdit[]>>;
  loadOrderItems: any;
  applyOrderItems: any;
}) {
  const {
    linkedOrderId,
    orderItemsOpen,
    setOrderItemsOpen,
    orderItems,
    setOrderItems,
    loadOrderItems,
    applyOrderItems,
  } = props;
  const updateQty = (idx: number, raw: string) => {
    const q = Math.max(0, parseInt(raw, 10) || 0);
    setOrderItems((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, quantity: q } : p)),
    );
  };
  return (
    <Stack
      padding="sm"
      className="border border-info/40 bg-info-surface/40" gap="sm" rounded="lg"
    >
      <Text className="text-info tracking-wide" size="xs" weight="semibold" transform="uppercase">
        Modify order items
      </Text>
      {linkedOrderId ? (
        <>
          <Text size="xs" color="muted">
            Editing order: <code className="font-mono">{linkedOrderId}</code>
          </Text>
          {!orderItemsOpen ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={loadOrderItems.isPending}
              disabled={loadOrderItems.isPending}
              onClick={() => loadOrderItems.mutate()}
            >
              Load current items
            </Button>
          ) : (
            <>
              {orderItems.length === 0 ? (
                <Text size="xs" color="muted">
                  Order has no items.
                </Text>
              ) : (
                <Stack gap="sm">
                  {orderItems.map((it, idx) => (
                    <Row
                      key={`${it.productId}-${idx}`}
                      className="px-2 py-1" rounded="default" align="center" gap="sm" border="default"
                    >
                      <Div className="flex-1 min-w-0">
                        <Text className="truncate" size="xs" weight="medium">
                          {it.productTitle}
                        </Text>
                        <Text size="xs" color="muted">
                          {it.productId} · ₹{(it.unitPrice / 100).toFixed(2)}/ea
                        </Text>
                      </Div>
                      <input
                        type="number"
                        min="0"
                        value={it.quantity}
                        onChange={(e) => updateQty(idx, e.target.value)}
                        className="w-16 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs"
                      />
                    </Row>
                  ))}
                </Stack>
              )}
              <Row gap="sm">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOrderItemsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={applyOrderItems.isPending}
                  disabled={applyOrderItems.isPending}
                  onClick={() => applyOrderItems.mutate()}
                >
                  Apply changes
                </Button>
              </Row>
            </>
          )}
        </>
      ) : (
        <Text size="xs" color="muted">
          Set the{" "}
          <Text as="span" weight="semibold">
            Order ID
          </Text>{" "}
          field in the Linked parties panel above to enable this action.
        </Text>
      )}
    </Stack>
  );
}

 
function StoreChangePanel(props: {
  linkedStoreId: string | undefined;
  storeStatus: string;
  setStoreStatus: (v: string) => void;
  storeIsVerified: boolean;
  setStoreIsVerified: (v: boolean) => void;
  storeIsFeatured: boolean;
  setStoreIsFeatured: (v: boolean) => void;
  applyStoreChange: any;
}) {
  const {
    linkedStoreId,
    storeStatus,
    setStoreStatus,
    storeIsVerified,
    setStoreIsVerified,
    storeIsFeatured,
    setStoreIsFeatured,
    applyStoreChange,
  } = props;
  return (
    <Stack
      padding="sm"
      className="border border-warning/40 bg-warning-surface/40" gap="sm" rounded="lg"
    >
      <Text className="text-warning tracking-wide" size="xs" weight="semibold" transform="uppercase">
        Apply store change
      </Text>
      {linkedStoreId ? (
        <>
          <Text size="xs" color="muted">
            Editing store: <code className="font-mono">{linkedStoreId}</code>
          </Text>
          <Select
            label="Store status"
            options={[
              { label: "Active", value: "active" },
              { label: "Pending", value: "pending" },
              { label: "Suspended", value: "suspended" },
              { label: "Rejected", value: "rejected" },
            ]}
            value={storeStatus}
            onValueChange={setStoreStatus}
          />
          <Toggle
            label="Verified badge"
            checked={storeIsVerified}
            onChange={setStoreIsVerified}
          />
          <Toggle
            label="Featured store"
            checked={storeIsFeatured}
            onChange={setStoreIsFeatured}
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={applyStoreChange.isPending}
            disabled={applyStoreChange.isPending}
            onClick={() => applyStoreChange.mutate()}
          >
            Apply store change
          </Button>
        </>
      ) : (
        <Text size="xs" color="muted">
          Set the{" "}
          <Text as="span" weight="semibold">
            Store slug
          </Text>{" "}
          field in the Linked parties panel above to enable this action.
        </Text>
      )}
    </Stack>
  );
}


 
function UnbanRequestPanel(props: {
  linkedUserId: string | undefined;
  liftHardBan: any;
  liftSoftBanTickets: any;
}) {
  const { linkedUserId, liftHardBan, liftSoftBanTickets } = props;
  return (
    <Stack
      padding="sm"
      className="border border-error/40 bg-error-surface/40" gap="sm" rounded="lg"
    >
      <Text className="text-error tracking-wide" size="xs" weight="semibold" transform="uppercase">
        Lift account ban
      </Text>
      {linkedUserId ? (
        <>
          <Text size="xs" color="muted">
            Appellant: <code className="font-mono">{linkedUserId}</code>
          </Text>
          <Text size="xs" color="muted">
            Resolves the ticket and appends an audit note on success.
          </Text>
          <Row gap="sm">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={liftHardBan.isPending}
              disabled={liftHardBan.isPending}
              onClick={() => liftHardBan.mutate()}
            >
              Lift hard ban
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={liftSoftBanTickets.isPending}
              disabled={liftSoftBanTickets.isPending}
              onClick={() => liftSoftBanTickets.mutate()}
            >
              Lift ticket soft ban
            </Button>
          </Row>
        </>
      ) : (
        <Text size="xs" color="muted">
          Set the{" "}
          <Text as="span" weight="semibold">
            User slug
          </Text>{" "}
          field in the Linked parties panel above to enable these actions.
        </Text>
      )}
    </Stack>
  );
}
