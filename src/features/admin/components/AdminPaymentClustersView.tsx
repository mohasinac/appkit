"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Div, Heading, Row, Span, Stack, Text, TextLink, useToast } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { useApiMutation } from "@mohasinac/appkit/client";

interface ClusterMethod {
  id: string;
  userId: string;
  type: string;
  displayLabel: string;
  banStatus?: string;
}

interface PaymentCluster {
  identifierHash: string;
  methods: ClusterMethod[];
}

interface ClustersResponse {
  clusters?: PaymentCluster[];
}

const BAN_BADGE: Record<string, "danger" | "warning" | "secondary"> = {
  banned: "danger",
  suspicious: "secondary",
};

export interface AdminPaymentClustersViewProps {
  children?: React.ReactNode;
}

export function AdminPaymentClustersView(_props: AdminPaymentClustersViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery<ClustersResponse>({
    queryKey: ["admin", "payment-clusters"],
    queryFn: async () => {
      const res = await apiClient.get<ClustersResponse>(ADMIN_ENDPOINTS.PAYMENT_METHOD_CLUSTERS);
      return res;
    },
  });

  const flagMutation = useApiMutation({
    errorMessage: "Failed to flag payment method.",
    mutationFn: async (id: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.PAYMENT_METHOD_BY_ID(id), { action: "flag_suspicious" });
    },
    onSuccess: () => {
      showToast("Payment method flagged as suspicious.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment-clusters"] });
    },
  });

  /*
   * 🛑 "Flag Suspicious" was ONE-WAY here too: no unflag, so a wrong call
   * left a permanent mark on a real buyer with no way back from this
   * screen. `clear_ban` is already in the route's action enum and calls
   * `clearBanById`; only the control was missing.
   */
  const clearFlagMutation = useApiMutation({
    errorMessage: "Failed to clear that flag.",
    mutationFn: async (id: string) => {
      await apiClient.patch(ADMIN_ENDPOINTS.PAYMENT_METHOD_BY_ID(id), { action: "clear_ban" });
    },
    onSuccess: () => {
      showToast("Flag cleared.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment-clusters"] });
    },
  });

  const clusters = data?.clusters ?? [];

  return (
    <Stack gap="lg" padding="page">
      <Stack gap="none">
        <Heading level={2} size="lg" weight="semibold" color="primary">Payment Method Clusters</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Multiple accounts sharing the same payment identifier. Flagging is informational only — users are not blocked.
        </Text>
      </Stack>

      {isLoading && (
        <Row justify="center" padding="y-4xl">
          <Div className="h-6 w-6 animate-spin border-2 border-[var(--appkit-color-primary)] border-t-transparent" rounded="full" />
        </Row>
      )}

      {error && (
        <Div surface="danger-surface" color="error" padding="inline" rounded="xl" textSize="sm">
          Failed to load payment clusters.
        </Div>
      )}

      {!isLoading && clusters.length === 0 && (
        <Div surface="muted" padding="y-4xl" rounded="xl" className="text-center">
          <Text color="muted" size="sm">No shared payment identifiers found.</Text>
        </Div>
      )}

      {clusters.map((cluster) => (
        <Stack key={cluster.identifierHash} surface="card" padding="md" gap="md" rounded="xl" border="default">
          <Row justify="between" align="start" gap="sm">
            <Stack gap="none">
              <Text size="xs" color="muted" weight="medium">Identifier Hash</Text>
              <Span size="xs" color="muted" className="font-mono truncate max-w-xs">{cluster.identifierHash}</Span>
            </Stack>
            <Badge variant="secondary" size="sm">{cluster.methods.length} accounts</Badge>
          </Row>

          <Stack gap="xs">
            {cluster.methods.map((m) => (
              <Row key={m.id} justify="between" align="center" gap="sm" surface="muted" padding="inlineSm" rounded="lg">
                <Stack gap="none" className="min-w-0">
                  <Text size="sm" weight="medium" color="primary" className="truncate">
                    {m.type.toUpperCase()} · {m.displayLabel}
                  </Text>
                  {/*
                    A LINK. This screen asks an admin to judge whether several
                    accounts share one payment identifier, and offered a
                    one-way flag against a user id printed as text.
                  */}
                  <TextLink href={String(ROUTES.ADMIN.USER_DETAIL(m.userId))} size="xs">
                    User: {m.userId}
                  </TextLink>
                </Stack>
                <Row gap="xs" align="center">
                  {m.banStatus && (
                    <Badge variant={BAN_BADGE[m.banStatus] ?? "secondary"} size="sm">
                      {m.banStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {m.banStatus === "suspicious" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearFlagMutation.mutate(m.id)}
                      disabled={clearFlagMutation.isPending}
                    >
                      Clear flag
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => flagMutation.mutate(m.id)}
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
