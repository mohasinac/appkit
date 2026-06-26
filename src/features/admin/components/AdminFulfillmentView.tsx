"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack, Row } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";
import { Badge } from "../../../ui/components/Badge";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { OrderDocument } from "../../orders/schemas/firestore";
import { normalizeError } from "../../../errors/normalize";
import { useToast } from "../../../ui";

export interface AdminFulfillmentViewProps {
  /** Pre-selected store ID — skips the store picker when provided. */
  initialStoreId?: string;
  initialStoreName?: string;
}

interface StoreOption {
  id: string;
  storeName: string;
}

interface StoresResponse {
  items?: StoreOption[];
  hasMore?: boolean;
}

async function loadStoreOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get<StoresResponse>(`${ADMIN_ENDPOINTS.STORES}?${params.toString()}`);
  const items = (res.items ?? []).map((s) => ({ value: s.id, label: s.storeName }));
  return { items, hasMore: res.hasMore ?? false };
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "confirmed") return "warning";
  if (status === "processing") return "info";
  if (status === "shipped") return "success";
  return "default";
}

export function AdminFulfillmentView({
  initialStoreId,
  initialStoreName,
}: AdminFulfillmentViewProps) {
  const [storeId, setStoreId] = useState<string | null>(initialStoreId ?? null);
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchOrders = useCallback(async (sid: string) => {
    // toast-intentionally-silent: background data loader — stale list is kept on error
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ orders: OrderDocument[]; total: number }>(
        ADMIN_ENDPOINTS.ADMIN_FULFILLMENT(sid),
      );
      setOrders(res.orders ?? []);
    } catch {
      // keep stale list on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (storeId) void fetchOrders(storeId);
  }, [storeId, fetchOrders]);

  const handleMarkPicked = useCallback(
    async (orderId: string) => {
      if (!storeId) return;
      setActionLoadingId(orderId + ":picked");
      try {
        await apiClient.patch(`/api/store/orders/${orderId}`, { markPicked: true });
        showToast("Order marked as picked.", "success");
        await fetchOrders(storeId);
      } catch (err: unknown) {
        showToast(normalizeError(err).message, "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [storeId, fetchOrders, showToast],
  );

  const handleMarkPacked = useCallback(
    async (orderId: string) => {
      if (!storeId) return;
      setActionLoadingId(orderId + ":packed");
      try {
        await apiClient.patch(`/api/store/orders/${orderId}`, { markPacked: true });
        showToast("Order marked as packed.", "success");
        await fetchOrders(storeId);
      } catch (err: unknown) {
        showToast(normalizeError(err).message, "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [storeId, fetchOrders, showToast],
  );

  const handleUnassign = useCallback(
    async (orderId: string) => {
      if (!storeId) return;
      setActionLoadingId(orderId + ":unassign");
      try {
        await apiClient.patch(`/api/store/orders/${orderId}/assign`, { workerId: null });
        showToast("Worker unassigned.", "success");
        await fetchOrders(storeId);
      } catch (err: unknown) {
        showToast(normalizeError(err).message, "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [storeId, fetchOrders, showToast],
  );

  return (
    <Stack gap="md" padding="md">
      <Row align="center" justify="between" gap="sm" wrap>
        <Heading level={3}>Fulfillment Queue</Heading>
        {storeId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStoreId(null);
              setOrders([]);
            }}
          >
            Change Store
          </Button>
        )}
      </Row>

      {!storeId && (
        <Stack gap="sm">
          <Text size="sm" color="muted">
            Select a store to view its fulfilment queue.
          </Text>
          <PaginatedSelect
            value={null}
            onChange={(v) => { if (v) setStoreId(v); }}
            loadOptions={loadStoreOptions}
            placeholder="Search stores…"
            searchPlaceholder="Type store name…"
            noResultsText="No stores found"
            ariaLabel="Store"
          />
        </Stack>
      )}

      {storeId && (
        <Stack gap="sm">
          {isLoading && (
            <Text size="sm" color="muted">Loading orders…</Text>
          )}

          {!isLoading && orders.length === 0 && (
            <Text color="muted">No orders in the fulfillment queue — great work!</Text>
          )}

          {orders.map((order) => (
            <Stack key={order.id} surface="card" padding="sm" rounded="md" gap="xs">
              <Row align="center" gap="xs" wrap>
                <Text size="sm" weight="medium">#{order.id}</Text>
                <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                {order.pickedAt && <Badge variant="success">Picked</Badge>}
                {order.packedAt && <Badge variant="success">Packed</Badge>}
              </Row>
              <Text size="xs" color="muted">
                {order.userName}
                {order.items && order.items.length > 0 && (
                  <> · {order.items.map((i) => i.productTitle).join(", ")}</>
                )}
              </Text>
              {order.assignedWorkerId && (
                <Text size="xs" color="muted">
                  Assigned to: {order.assignedWorkerId}
                </Text>
              )}
              <Row gap="xs">
                {!order.pickedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkPicked(order.id)}
                    isLoading={actionLoadingId === order.id + ":picked"}
                  >
                    Mark Picked
                  </Button>
                )}
                {order.pickedAt && !order.packedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkPacked(order.id)}
                    isLoading={actionLoadingId === order.id + ":packed"}
                  >
                    Mark Packed
                  </Button>
                )}
                {order.assignedWorkerId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUnassign(order.id)}
                    isLoading={actionLoadingId === order.id + ":unassign"}
                  >
                    Unassign
                  </Button>
                )}
              </Row>
            </Stack>
          ))}
        </Stack>
      )}

      {initialStoreName && !storeId && (
        <Text size="xs" color="muted">
          Previously viewing: {initialStoreName}
        </Text>
      )}
    </Stack>
  );
}
