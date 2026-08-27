"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Div, Heading, Row, Span, Stack, Text, useToast } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { useApiMutation } from "@mohasinac/appkit/client";

interface ClusterAddress {
  id: string;
  ownerId: string;
  ownerType: "user" | "store";
  city?: string;
  state?: string;
  postalCode?: string;
  banStatus?: string;
}

interface AddressCluster {
  addressHash: string;
  addresses: ClusterAddress[];
}

interface ClustersResponse {
  clusters?: AddressCluster[];
}

const BAN_BADGE: Record<string, "danger" | "warning" | "secondary"> = {
  banned: "danger",
  unban_requested: "warning",
  suspicious: "secondary",
};

export interface AdminAddressClustersViewProps {
  children?: React.ReactNode;
}

export function AdminAddressClustersView(_props: AdminAddressClustersViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery<ClustersResponse>({
    queryKey: ["admin", "address-clusters"],
    queryFn: async () => {
      const res = await apiClient.get<ClustersResponse>(ADMIN_ENDPOINTS.ADDRESS_CLUSTERS);
      return res;
    },
  });

  const flagMutation = useApiMutation({
    errorMessage: "Failed to flag address.",
    mutationFn: async (id: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ADDRESS_BY_ID(id), { action: "flag_suspicious" });
    },
    onSuccess: () => {
      showToast("Address flagged as suspicious.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "address-clusters"] });
    },
  });

  const clusters = data?.clusters ?? [];

  return (
    <Stack gap="lg" padding="page">
      <Stack gap="none">
        <Heading level={2} size="lg" weight="semibold" color="primary">Address Clusters</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Users sharing the same physical address. Flagging is informational only — users are not blocked.
        </Text>
      </Stack>

      {isLoading && (
        <Row justify="center" padding="y-4xl">
          <Div className="h-6 w-6 animate-spin border-2 border-[var(--appkit-color-primary)] border-t-transparent" rounded="full" />
        </Row>
      )}

      {error && (
        <Div surface="danger-surface" color="error" padding="inline" rounded="xl" textSize="sm">
          Failed to load clusters.
        </Div>
      )}

      {!isLoading && clusters.length === 0 && (
        <Div surface="muted" padding="y-4xl" rounded="xl" className="text-center">
          <Text color="muted" size="sm">No shared addresses found.</Text>
        </Div>
      )}

      {clusters.map((cluster) => (
        <Stack key={cluster.addressHash} surface="card" padding="md" gap="md" rounded="xl" border="default">
          <Row justify="between" align="start" gap="sm">
            <Stack gap="none">
              <Text size="xs" color="muted" weight="medium">Hash</Text>
              <Span size="xs" color="muted" className="font-mono truncate max-w-xs">{cluster.addressHash}</Span>
            </Stack>
            <Badge variant="secondary" size="sm">{cluster.addresses.length} accounts</Badge>
          </Row>

          <Stack gap="xs">
            {cluster.addresses.map((addr) => (
              <Row key={addr.id} justify="between" align="center" gap="sm" surface="muted" padding="inlineSm" rounded="lg">
                <Stack gap="none" className="min-w-0">
                  <Text size="sm" weight="medium" color="primary" className="truncate">
                    {addr.ownerType === "user" ? "User" : "Store"}: {addr.ownerId}
                  </Text>
                  {addr.city && (
                    <Text size="xs" color="muted">
                      {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}
                    </Text>
                  )}
                </Stack>
                <Row gap="xs" align="center">
                  {addr.banStatus && (
                    <Badge variant={BAN_BADGE[addr.banStatus] ?? "secondary"} size="sm">
                      {addr.banStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {addr.banStatus !== "suspicious" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => flagMutation.mutate(addr.id)}
                      disabled={flagMutation.isPending}
                    >
                      Flag Suspicious
                    </Button>
                  )}
                </Row>
              </Row>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
