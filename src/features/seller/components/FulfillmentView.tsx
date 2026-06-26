"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack, Row } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";
import { Badge } from "../../../ui/components/Badge";
import { apiClient } from "../../../http";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import type { OrderDocument } from "../../orders/schemas/firestore";
import type { ProductDocument } from "../../products/schemas/firestore";
import { BarcodeField } from "./BarcodeField";
import { normalizeError } from "../../../errors/normalize";
import { useToast } from "../../../ui";

export interface FulfillmentViewProps {
  currentUserId?: string;
  currentUserName?: string;
}

type ViewMode = "scan" | "list";

interface ScanResult {
  product: ProductDocument;
  order: OrderDocument;
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "confirmed") return "warning";
  if (status === "processing") return "info";
  if (status === "shipped") return "success";
  return "default";
}

export function FulfillmentView({
  currentUserId,
}: FulfillmentViewProps) {
  const [mode, setMode] = useState<ViewMode>("scan");
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    // toast-intentionally-silent: background data loader — stale list is kept on error
    setIsLoadingOrders(true);
    try {
      const res = await apiClient.get<{ orders: OrderDocument[]; total: number }>(
        SELLER_ENDPOINTS.ORDERS_FULFILLMENT,
      );
      setOrders(res.orders ?? []);
    } catch {
      // keep stale list on error
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleScan = useCallback(
    async (barcode: string) => {
      setScanError(null);
      setScanResult(null);
      try {
        const product = await apiClient.get<ProductDocument>(
          SELLER_ENDPOINTS.PRODUCTS_SCAN(barcode),
        );
        const matchedOrder = orders.find(
          (o) =>
            o.productId === product.id ||
            o.items?.some((i) => i.productId === product.id),
        );
        if (!matchedOrder) {
          setScanError(`No pending order found for barcode "${barcode}".`);
          return;
        }
        setScanResult({ product, order: matchedOrder });
      } catch (err: unknown) {
        setScanError(normalizeError(err).message);
      }
    },
    [orders],
  );

  const confirmPick = useCallback(async () => {
    if (!scanResult) return;
    setIsConfirming(true);
    try {
      await apiClient.patch(
        SELLER_ENDPOINTS.ORDERS_BY_ID(scanResult.order.id),
        { markPicked: true },
      );
      setScanResult(null);
      setScanValue("");
      setScanError(null);
      showToast("Order marked as picked!", "success");
      await fetchOrders();
    } catch (err: unknown) {
      setScanError(normalizeError(err).message);
    } finally {
      setIsConfirming(false);
    }
  }, [scanResult, fetchOrders, showToast]);

  const handleMarkPicked = useCallback(
    async (orderId: string) => {
      setActionLoadingId(orderId + ":picked");
      try {
        await apiClient.patch(SELLER_ENDPOINTS.ORDERS_BY_ID(orderId), {
          markPicked: true,
        });
        await fetchOrders();
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchOrders],
  );

  const handleMarkPacked = useCallback(
    async (orderId: string) => {
      setActionLoadingId(orderId + ":packed");
      try {
        await apiClient.patch(SELLER_ENDPOINTS.ORDERS_BY_ID(orderId), {
          markPacked: true,
        });
        await fetchOrders();
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchOrders],
  );

  const visibleOrders = filterMine
    ? orders.filter((o) => o.assignedWorkerId === currentUserId)
    : orders;

  return (
    <Stack gap="md" padding="md">
      <Row align="center" justify="between" gap="sm" wrap>
        <Heading level={3}>Pick &amp; Pack</Heading>
        <Row gap="xs">
          <Button
            onClick={() => setMode("scan")}
            variant={mode === "scan" ? "primary" : "secondary"}
            size="sm"
          >
            Scan Mode
          </Button>
          <Button
            onClick={() => setMode("list")}
            variant={mode === "list" ? "primary" : "secondary"}
            size="sm"
          >
            List Mode
          </Button>
        </Row>
      </Row>

      {mode === "scan" && (
        <Stack gap="md">
          <BarcodeField
            autoFocus
            value={scanValue}
            onChange={setScanValue}
            onScan={handleScan}
            helperText="Point scanner at an item sticker or type the barcode and press Enter."
          />

          {scanError && (
            <Text color="error" size="sm">
              {scanError}
            </Text>
          )}

          {scanResult && (
            <Stack surface="card" padding="md" rounded="md" gap="sm">
              <Text size="xs" color="muted">Scanned item</Text>
              <Heading level={5}>{scanResult.product.title ?? scanResult.product.id}</Heading>
              <Row gap="md" wrap>
                <Stack gap="xs">
                  <Text size="xs" color="muted">Order</Text>
                  <Text size="sm" weight="medium">#{scanResult.order.id}</Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="xs" color="muted">Buyer</Text>
                  <Text size="sm" weight="medium">{scanResult.order.userName}</Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="xs" color="muted">Status</Text>
                  <Badge variant={statusBadgeVariant(scanResult.order.status)}>
                    {scanResult.order.status}
                  </Badge>
                </Stack>
              </Row>
              <Row gap="xs">
                <Button
                  variant="primary"
                  onClick={confirmPick}
                  isLoading={isConfirming}
                >
                  Confirm Pick
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setScanResult(null);
                    setScanValue("");
                    setScanError(null);
                  }}
                >
                  Cancel
                </Button>
              </Row>
            </Stack>
          )}

          {!scanResult && !scanError && (
            <Text color="muted" size="sm">
              {orders.length === 0 && !isLoadingOrders
                ? "No orders waiting — great work!"
                : `${orders.length} order${orders.length === 1 ? "" : "s"} in queue.`}
            </Text>
          )}
        </Stack>
      )}

      {mode === "list" && (
        <Stack gap="sm">
          <Row align="center" gap="sm">
            <Button
              variant={filterMine ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterMine((v) => !v)}
            >
              {filterMine ? "Showing My Orders" : "My Orders"}
            </Button>
            <Text size="xs" color="muted">
              {isLoadingOrders ? "Loading…" : `${visibleOrders.length} order${visibleOrders.length === 1 ? "" : "s"}`}
            </Text>
          </Row>

          {visibleOrders.length === 0 && !isLoadingOrders && (
            <Text color="muted">No orders waiting — great work!</Text>
          )}

          {visibleOrders.map((order) => (
            <Stack key={order.id} surface="card" padding="sm" rounded="md" gap="xs">
              <Row align="center" gap="xs" wrap>
                <Text size="sm" weight="medium">#{order.id}</Text>
                <Badge variant={statusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
                {order.pickedAt && (
                  <Badge variant="success">Picked</Badge>
                )}
                {order.packedAt && (
                  <Badge variant="success">Packed</Badge>
                )}
              </Row>
              <Text size="xs" color="muted">
                {order.userName}
                {order.items && order.items.length > 0 && (
                  <> · {order.items.map((i) => i.productTitle).join(", ")}</>
                )}
              </Text>
              {order.assignedWorkerId && (
                <Text size="xs" color="muted">
                  Assigned: {order.assignedWorkerId === currentUserId ? "Me" : order.assignedWorkerId}
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
              </Row>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
