"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import { Badge, Button, Div, Grid, Heading, Row, SideDrawer, Skeleton, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { CatalogueItemEditorView } from "./CatalogueItemEditorView";
import type { CatalogueItemDocument } from "../schemas/firestore";

const STATUS_VARIANT: Record<CatalogueItemDocument["listingStatus"], "default" | "success" | "warning" | "secondary"> = {
  not_listed: "secondary",
  pending_admin_approval: "warning",
  listed: "success",
  rejected: "default",
};

export interface UserCatalogueViewProps {
  /** Whether the signed-in user is a seller (enables direct "List" instead of "Request to sell"). */
  isSeller: boolean;
}

export function UserCatalogueView({ isSeller }: UserCatalogueViewProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ items: CatalogueItemDocument[] }>({
    queryKey: ["user", "catalogue"],
    queryFn: () => apiClient.get<{ items: CatalogueItemDocument[] }>(ACCOUNT_ENDPOINTS.CATALOGUE),
  });
  const items = data?.items ?? [];

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["user", "catalogue"] });

  const toggleVisibilityMutation = useApiMutation({
    successMessage: "Visibility updated",
    mutationFn: (item: CatalogueItemDocument) =>
      apiClient.patch(ACCOUNT_ENDPOINTS.CATALOGUE_BY_ID(item.id), {
        visibility: item.visibility === "public" ? "private" : "public",
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useApiMutation({
    successMessage: "Removed from catalogue",
    mutationFn: (id: string) => apiClient.delete(ACCOUNT_ENDPOINTS.CATALOGUE_BY_ID(id)),
    onSuccess: invalidate,
  });

  const listMutation = useApiMutation({
    successMessage: "Listed",
    mutationFn: (id: string) => apiClient.post(ACCOUNT_ENDPOINTS.CATALOGUE_LIST(id)),
    onSuccess: invalidate,
  });

  const submitMutation = useApiMutation({
    successMessage: "Requested — an admin will review it",
    mutationFn: (id: string) => apiClient.post(ACCOUNT_ENDPOINTS.CATALOGUE_SUBMIT(id)),
    onSuccess: invalidate,
  });

  const editingItem = items.find((i) => i.id === editingId);

  return (
    <Stack gap="md">
      <Row align="center" justify="between">
        <Heading level={2}>My Catalogue</Heading>
        <Button onClick={() => setCreating(true)}>+ Add Item</Button>
      </Row>

      {isLoading ? (
        <Grid cols={3} gap="md">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} variant="rectangular" height={220} />
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Text variant="secondary">Nothing in your catalogue yet.</Text>
      ) : (
        <Grid cols={3} gap="md">
          {items.map((item) => (
            <Div key={item.id} rounded="xl" border="default" padding="md" surface="card">
              <MediaImage src={item.mainImage || item.images[0] || ""} alt={item.title} size="card" />
              <Stack gap="xs" padding="t-sm">
                <Text weight="medium">{item.title}</Text>
                <Row gap="sm" align="center">
                  <Badge variant={STATUS_VARIANT[item.listingStatus]}>{item.listingStatus.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary">{item.visibility}</Badge>
                </Row>
                <Row gap="sm" wrap>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(item.id)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleVisibilityMutation.mutate(item)}>
                    {item.visibility === "public" ? "Make private" : "Make public"}
                  </Button>
                  {item.listingStatus === "not_listed" && (
                    isSeller ? (
                      <Button size="sm" isLoading={listMutation.isPending} onClick={() => listMutation.mutate(item.id)}>List</Button>
                    ) : (
                      <Button size="sm" isLoading={submitMutation.isPending} onClick={() => submitMutation.mutate(item.id)}>Request to sell</Button>
                    )
                  )}
                  {item.listingStatus === "not_listed" && (
                    <Button size="sm" variant="ghost" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item.id)}>Delete</Button>
                  )}
                </Row>
              </Stack>
            </Div>
          ))}
        </Grid>
      )}

      <SideDrawer isOpen={creating} onClose={() => setCreating(false)} title="Add to Catalogue">
        <CatalogueItemEditorView onSaved={() => { setCreating(false); invalidate(); }} />
      </SideDrawer>
      <SideDrawer isOpen={!!editingItem} onClose={() => setEditingId(null)} title="Edit Catalogue Item">
        {editingItem && (
          <CatalogueItemEditorView item={editingItem} onSaved={() => { setEditingId(null); invalidate(); }} />
        )}
      </SideDrawer>
    </Stack>
  );
}
