"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { ShipmentDocument, ShipmentLot, ShipmentItem } from "../schemas/firestore";

interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

interface ShipmentsListResponse {
  shipments: ShipmentDocument[];
  meta: ListMeta;
}

export interface UseShipmentsParams {
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
}

export function useShipments(params: UseShipmentsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sorts) sp.set("sorts", params.sorts);
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<ShipmentsListResponse>({
    queryKey: ["admin", "shipments", qs],
    queryFn: () => apiClient.get<ShipmentsListResponse>(`${ADMIN_ENDPOINTS.SHIPMENTS}${qs ? `?${qs}` : ""}`),
  });

  return {
    shipments: data?.shipments ?? [],
    meta: data?.meta,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useShipment(shipmentId?: string) {
  const shipmentQuery = useQuery<ShipmentDocument>({
    queryKey: ["admin", "shipment", shipmentId],
    queryFn: () => apiClient.get<ShipmentDocument>(ADMIN_ENDPOINTS.SHIPMENT_BY_ID(shipmentId!)),
    enabled: !!shipmentId,
  });

  const lotsQuery = useQuery<{ lots: ShipmentLot[] }>({
    queryKey: ["admin", "shipment", shipmentId, "lots"],
    queryFn: () => apiClient.get<{ lots: ShipmentLot[] }>(ADMIN_ENDPOINTS.SHIPMENT_LOTS(shipmentId!)),
    enabled: !!shipmentId,
  });

  return {
    shipment: shipmentQuery.data,
    lots: lotsQuery.data?.lots ?? [],
    isLoading: shipmentQuery.isLoading || lotsQuery.isLoading,
    error:
      shipmentQuery.error instanceof Error
        ? shipmentQuery.error.message
        : lotsQuery.error instanceof Error
          ? lotsQuery.error.message
          : null,
    refetchShipment: shipmentQuery.refetch,
    refetchLots: lotsQuery.refetch,
  };
}

interface ShipmentItemsListResponse {
  items: ShipmentItem[];
  meta: ListMeta;
}

export interface UseShipmentItemsParams {
  page?: number;
  pageSize?: number;
  sorts?: string;
}

export function useShipmentItems(
  shipmentId?: string,
  lotId?: string,
  params: UseShipmentItemsParams = {},
) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sorts) sp.set("sorts", params.sorts);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<ShipmentItemsListResponse>({
    queryKey: ["admin", "shipment", shipmentId, "lot", lotId, "items", qs],
    queryFn: () =>
      apiClient.get<ShipmentItemsListResponse>(
        `${ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEMS(shipmentId!, lotId!)}${qs ? `?${qs}` : ""}`,
      ),
    enabled: !!shipmentId && !!lotId,
  });

  return {
    items: data?.items ?? [],
    meta: data?.meta,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

interface ShipmentProjectionsResponse {
  lots: ShipmentLot[];
  meta: ListMeta;
}

export interface UseShipmentProjectionsParams {
  page?: number;
  pageSize?: number;
  sorts?: string;
  filters?: string;
}

export function useShipmentProjections(params: UseShipmentProjectionsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sorts) sp.set("sorts", params.sorts);
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<ShipmentProjectionsResponse>({
    queryKey: ["admin", "shipments", "projections", qs],
    queryFn: () =>
      apiClient.get<ShipmentProjectionsResponse>(`${ADMIN_ENDPOINTS.SHIPMENTS_PROJECTIONS}${qs ? `?${qs}` : ""}`),
  });

  return {
    lots: data?.lots ?? [],
    meta: data?.meta,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
