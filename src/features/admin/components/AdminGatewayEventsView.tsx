"use client";

/**
 * AdminGatewayEventsView — the webhook inbox, readable for the first time.
 *
 * ## What this is for
 *
 * `gatewayEvents` records every delivery verbatim, including event types we are
 * subscribed to but do not implement — which is the whole reason the inbox
 * exists rather than a logger line. Before it, a `payment.dispute.created`
 * arriving ahead of the dispute handler would simply have vanished.
 *
 * This page answers three operator questions: did it arrive, what did we do
 * with it, and can it be made to arrive again.
 *
 * ## 🛑 "Reopen for redelivery" is NOT "reprocess", and the UI must not imply it
 *
 * Nothing here can replay an event. R1's own header explains why: dispatching
 * from anywhere but the webhook route would duplicate that route's whole switch
 * and its RTDB signalling in a second place (Root Cause #75). The action only
 * stops the inbox from refusing the NEXT delivery as a duplicate — the operator
 * still presses Resend in the gateway dashboard.
 *
 * So the button says what it does, and the confirmation says what is left to
 * do. A button labelled "Reprocess" doing only this would be the worst kind of
 * half-truth: it would look like the work had happened.
 *
 * ## 🛑 Two statuses that look like failures and are not
 *
 * `ignored` means an event type we do not implement was recorded verbatim —
 * healthy, and the inbox's purpose. `conflict` means a LATE event would have
 * regressed an order's status, so it was recorded and not applied; the ack was
 * 200 because the event is not wrong, it is out of date. Labelling either as an
 * error would send operators chasing non-problems, which is how a queue stops
 * being read.
 *
 * ## 🛑 No search box, and no sort on `status`
 *
 * `searchPlaceholder` is omitted because the endpoint does not read `q`;
 * declaring it is what makes a dead box exist. And `status` is `canSort: false`
 * in `SIEVE_FIELDS`, so a sort on it would be DROPPED silently by sievejs
 * (Root Cause #63) — the status FILTER is the control, and it is in the panel.
 *
 * EXPORTS: AdminGatewayEventsView, type AdminGatewayEventsViewProps
 *
 * @tag domain:gateway-events
 * @tag layer:component
 * @tag pattern:listing
 * @tag access:client
 * @tag consumers:admin/maintenance/gateway-events
 * @tag sideEffects:network
 */

import React, { useState } from "react";
import {
  sieveFilter,
  SIEVE_OP,
  sortBy,
  type JsonArray,
  type JsonValue,
} from "@mohasinac/appkit/client";
import {
  FilterChipGroup,
  ListingLayout,
  Modal,
  RecordDetailModal,
  Row,
  RowActionMenu,
  Stack,
  Text,
  Button,
} from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  ADMIN_GATEWAY_EVENT_KIND_TABS,
  ADMIN_GATEWAY_EVENT_STATUS_TABS,
} from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminGatewayEventsResponse {
  items?: JsonArray;
  meta?: { total?: number };
}

interface GatewayEventRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw: Record<string, JsonValue>;
}

/** Operator-facing status names — see the 🛑 about `ignored` and `conflict`. */
const STATUS_LABEL: Record<string, string> = {
  received: "Received, not yet settled",
  processing: "Being processed",
  processed: "Processed",
  failed: "Failed",
  conflict: "Arrived late — recorded, not applied",
  ignored: "Recorded, no handler for this type",
};

export type AdminGatewayEventsViewProps = ListingLayoutProps;

export function AdminGatewayEventsView({ children, ...props }: AdminGatewayEventsViewProps) {
  const [detail, setDetail] = useState<Record<string, JsonValue> | null>(null);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const reopen = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(ADMIN_ENDPOINTS.MAINTENANCE_GATEWAY_EVENTS, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`Could not reopen that event (${res.status})`);
      setRevision((r) => r + 1);
      setReopenId(null);
      setDetail(null);
    } finally {
      setBusy(false);
    }
  };

  const config: ListingViewConfig<AdminGatewayEventsResponse, GatewayEventRow> = {
    portal: "admin",
    title: "Gateway events",
    subtitle:
      "Every webhook delivery, recorded verbatim — including event types we have no handler for. Read-only apart from reopening one for redelivery.",
    emptyLabel: "No gateway events recorded",
    // 🛑 No `searchPlaceholder` — the endpoint does not read `q`.
    filterKeys: ["status", "kind"],
    /*
     * `receivedAt`, which every row has. 🛑 NOT `status`, which is
     * `canSort: false` in SIEVE_FIELDS and would therefore be dropped by
     * sievejs with no error (Root Cause #63); and not `processedAt`, which is
     * optional — a Firestore `orderBy` excludes documents lacking the field, so
     * it would hide every unsettled event, i.e. exactly the ones worth seeing
     * (Root Cause #100).
     */
    defaultSort: sortBy("receivedAt", "DESC"),
    queryKey: ["admin", "gateway-events", "listing", String(revision)],
    endpoint: ADMIN_ENDPOINTS.MAINTENANCE_GATEWAY_EVENTS,
    /*
     * 🛑 ONLY `receivedAt`, and the omission is an index-weight decision rather
     * than a shortfall.
     *
     * `attempts` is `canSort: true`, so "Most attempts" would work — but each
     * filter+sort combination needs its own composite index, and a sort on a
     * second field triples them: `(status, attempts)`, `(kind, attempts)`,
     * `(status, kind, attempts)` on top of the three `receivedAt` ones.
     *
     * `gatewayEvents` takes a row for every webhook delivery, which makes it
     * the highest-write collection in this subsystem — and a composite index is
     * a write multiplier on EVERY document, forever, not a read-time cost. Six
     * indexes to rank a rarely-opened diagnostic by a number the `failed` status
     * filter already finds is the wrong trade.
     *
     * Two indexes are added for the filter combinations that remain:
     * `(status, receivedAt desc)` and `(status, kind, receivedAt desc)`.
     * `(kind, receivedAt desc)` already existed.
     */
    sortOptions: [
      { value: sortBy("receivedAt", "DESC"), label: "Newest" },
      { value: sortBy("receivedAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const status = toStringValue(item.status, "received");
        const attempts = typeof item.attempts === "number" ? item.attempts : 0;
        return {
          id: toStringValue(item.id, `event-${index}`),
          primary: `${toStringValue(item.gateway, "?")} · ${toStringValue(item.kind, "other")}`,
          secondary: [
            STATUS_LABEL[status] ?? status,
            toStringValue(item.gatewayOrderId, "") || null,
            toStringValue(item.gatewayPaymentId, "") || null,
            // Only when informative — "1 attempt" is the normal case and noise.
            attempts > 1 ? `${attempts} attempts` : null,
            item.terminal === true ? "terminal" : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status,
          updatedAt: toRelativeDate(item.receivedAt),
          _raw: item,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    onRowClick: (row) => setDetail(row._raw),
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.status && state.status !== "All")
        parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state.kind && state.kind !== "All")
        parts.push(sieveFilter("kind", SIEVE_OP.EQ, state.kind));
      return parts.length > 0 ? parts.join(",") : undefined;
    },
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: "View details", onClick: () => setDetail(row._raw) },
          { label: "Reopen for redelivery", onClick: () => setReopenId(row.id) },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_GATEWAY_EVENT_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Kind"
          tabs={ADMIN_GATEWAY_EVENT_KIND_TABS}
          value={pendingFilters.kind ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, kind: id }))}
        />
      </Stack>
    ),
  };

  const detailStatus = detail ? toStringValue(detail.status, "") : "";

  return (
    <>
      <DataListingView config={config} />

      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={
          detail
            ? `${toStringValue(detail.gateway, "?")} · ${toStringValue(detail.kind, "other")}`
            : "Gateway event"
        }
        badges={
          detail
            ? [
                { label: STATUS_LABEL[detailStatus] ?? detailStatus },
                ...(detail.terminal === true
                  ? [{ label: "terminal", variant: "warning" as const }]
                  : []),
              ]
            : undefined
        }
        fields={
          detail
            ? [
                { label: "Event id", value: toStringValue(detail.id, "") },
                { label: "Provider event id", value: toStringValue(detail.providerEventId, "") || "— (deduped on the body digest instead)" },
                { label: "Body SHA-256", value: toStringValue(detail.bodySha256, "") },
                { label: "Gateway order", value: toStringValue(detail.gatewayOrderId, "") || "—" },
                { label: "Gateway payment", value: toStringValue(detail.gatewayPaymentId, "") || "—" },
                { label: "Amount", value: typeof detail.amount === "number" ? `₹${detail.amount.toFixed(2)}` : "—" },
                { label: "Orders placed", value: Array.isArray(detail.orderIds) ? detail.orderIds.join(", ") : "—" },
                { label: "Received", value: toStringValue(detail.receivedAt, "") },
                { label: "Settled", value: toStringValue(detail.processedAt, "") || "— not settled" },
                { label: "Attempts", value: String(detail.attempts ?? 0) },
                { label: "Lease expires", value: toStringValue(detail.leaseExpiresAt, "") },
                { label: "Last error", value: toStringValue(detail.lastError, "") || "—" },
                { label: "Retention expiry", value: toStringValue(detail.expiresAt, "") },
              ]
            : undefined
        }
        /*
         * `payload` is the REDACTED projection, never the raw body — Razorpay's
         * payment entity carries email, contact, card.last4, vpa and bank, and
         * `redactGatewayPayload` strips them recursively. `bodySha256` above
         * preserves integrity regardless, which is what makes redaction safe.
         */
        metadata={
          detail && detail.payload && typeof detail.payload === "object"
            ? (detail.payload as Record<string, JsonValue>)
            : undefined
        }
        footer={
          detail ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReopenId(toStringValue(detail.id, ""))}
            >
              Reopen for redelivery
            </Button>
          ) : undefined
        }
      />

      {/*
        A confirmation rather than a one-click action, because the honest
        description of what happens is two sentences and the second one is a
        task for the operator. `ReviewDecisionModal` is not right here: it
        requires a note, and there is no decision to justify — only a step to
        explain.
      */}
      <Modal
        isOpen={reopenId !== null}
        onClose={() => setReopenId(null)}
        title="Reopen this event for redelivery"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            This clears the terminal flag and the attempt count so the inbox
            will <strong>accept</strong> the next delivery of this event instead
            of refusing it as a duplicate.
          </Text>
          <Row surface="warning-surface" padding="sm" rounded="default">
            <Text size="sm" color="warning">
              It does not reprocess anything by itself. Nothing outside the
              webhook route knows how to handle an event, so after this you
              still need to press <strong>Resend</strong> on this delivery in
              the gateway dashboard — or wait for the gateway&rsquo;s own retry.
            </Text>
          </Row>
          <Row justify="end" gap="sm">
            <Button variant="ghost" onClick={() => setReopenId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={busy}
              disabled={busy}
              onClick={() => reopen(reopenId!)}
            >
              Reopen
            </Button>
          </Row>
        </Stack>
      </Modal>
    </>
  );
}
