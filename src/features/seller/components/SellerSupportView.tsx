"use client";

/**
 * SellerSupportView — the tickets raised about this seller's store.
 *
 * ## Why there was nothing here before
 *
 * Support has always had a buyer surface and an admin surface and no seller
 * one — no page, no API route, not even a `ROUTES.STORE.SUPPORT` constant.
 * The reason was structural rather than an oversight: `SupportTicketDocument`
 * had no queryable `storeId`, so "the tickets about my store" was not a
 * question the data could answer.
 *
 * There is a category called `store_change_request` — sellers asking an admin
 * to change a store field they cannot edit themselves — which a seller could
 * only ever file through the BUYER surface, and then never see again from the
 * store dashboard.
 *
 * ## Read-only, deliberately
 *
 * A seller can see and follow a ticket about their store; replying goes
 * through the ticket thread the buyer and admin already share, and status is
 * an admin decision. Giving a seller a status control here would let them
 * close a complaint made against them.
 */

import React from "react";
import { Badge, Span, Stack, Text } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { DataListingView } from "../../admin/components/DataListingView";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { SUPPORT_TICKET_FIELDS } from "../../../constants/field-names";
import { sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { toRelativeDate, toStringValue } from "../../admin/hooks/useAdminListingData";
import type { JsonArray, JsonValue } from "../../../schemas/types";

interface TicketsResponse {
  items?: JsonArray;
  total?: number;
}

interface TicketRow {
  [key: string]: unknown;
  id: string;
  primary: string;
  secondary: string;
  status: string;
  category: string;
  updated: string;
}

/** Status → badge tone. Mirrors `TicketStatusValues`. */
const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "default"> = {
  open: "info",
  in_progress: "warning",
  waiting_on_user: "warning",
  resolved: "success",
  closed: "default",
};

export interface SellerSupportViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
}

export function SellerSupportView({ labels = {} }: SellerSupportViewProps) {
  const mapRows = React.useCallback((response: TicketsResponse): TicketRow[] => {
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.map((raw) => {
      const t = (raw ?? {}) as Record<string, JsonValue>;
      return {
        id: toStringValue(t.id),
        primary: toStringValue(t.subject),
        secondary: toStringValue(t.description).slice(0, 140),
        status: toStringValue(t.status),
        category: toStringValue(t.category).replace(/_/g, " "),
        updated: toRelativeDate(t.updatedAt ?? t.createdAt),
      };
    });
  }, []);

  return (
    <Stack gap="md">
      <DataListingView<TicketsResponse, TicketRow>
        config={{
          portal: "seller",
          title: labels.title ?? "Support",
          subtitle: "Tickets buyers and staff have raised about your store.",
          /*
           * The box is declared only because the endpoint now serves it —
           * `supportTickets` gained a `searchTxt` corpus in this same commit.
           * `fields` names what is actually matched, and it is SUBJECT ONLY:
           * the description and every message body are PII-encrypted at rest,
           * so they are not in the index and a placeholder promising them
           * would be a promise the backend cannot keep.
           */
          search: {
            placeholder: "Search by subject…",
            mode: "partial",
            fields: ["subject"],
            commit: "debounce",
          },
          emptyLabel: "No tickets have been raised about your store.",
          queryKey: ["store", "support-tickets"],
          endpoint: SELLER_ENDPOINTS.SUPPORT,
          filterKeys: ["status"],
          defaultSort: "",
          sortOptions: [],
          mapRows,
          getTotal: (response, rows) => response?.total ?? rows.length,
          buildFilters: (filterState) =>
            filterState.status
              ? sieveFilter(SUPPORT_TICKET_FIELDS.STATUS, SIEVE_OP.EQ, filterState.status)
              : undefined,
          columns: [
            { key: "primary", header: "Subject" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <Badge variant={STATUS_VARIANT[row.status] ?? "default"}>
                  {row.status.replace(/_/g, " ")}
                </Badge>
              ),
            },
            {
              key: "category",
              header: "About",
              render: (row) => (
                <Span size="xs" color="muted">
                  {row.category}
                </Span>
              ),
            },
            { key: "updated", header: "Updated" },
          ],
        }}
      />
      <Text size="xs" color="muted">
        Replies and status changes happen in the ticket thread with our support
        team — a ticket raised about your store is not one you can close.
      </Text>
    </Stack>
  );
}
