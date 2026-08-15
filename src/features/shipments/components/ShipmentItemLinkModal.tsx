"use client";

import React from "react";
import { useApiMutation } from "@mohasinac/appkit/client";
import { Button, FieldInput, Modal, Row, Stack, TagInput, Text, Toggle } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";

export interface ShipmentItemLinkModalProps {
  shipmentId: string;
  lotId: string;
  itemId: string;
  itemTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onLinked: () => void;
}

/**
 * "Create pre-order link" (req #11) — manual, opt-in only, per main item.
 * Shared between AdminShipmentLotItemsView and AdminShipmentProjectionsView.
 */
export function ShipmentItemLinkModal({
  shipmentId,
  lotId,
  itemId,
  itemTitle,
  isOpen,
  onClose,
  onLinked,
}: ShipmentItemLinkModalProps) {
  const [mode, setMode] = React.useState<"link" | "create">("create");
  const [existingProductId, setExistingProductId] = React.useState<string | null>(null);
  const [categorySlugs, setCategorySlugs] = React.useState<string[]>([]);
  const [brandSlug, setBrandSlug] = React.useState("");

  const linkMutation = useApiMutation({
    successMessage: "Item linked to product",
    mutationFn: () => {
      const body =
        mode === "link"
          ? { mode: "link" as const, productId: existingProductId! }
          : {
              mode: "create" as const,
              categorySlugs,
              brandSlug: brandSlug.trim() || undefined,
            };
      return apiClient.post(ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEM_LINK(shipmentId, lotId, itemId), body);
    },
    onSuccess: () => {
      onLinked();
      onClose();
    },
  });

  const canSubmit = mode === "link" ? !!existingProductId : categorySlugs.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create pre-order link — ${itemTitle}`} size="md">
      <Stack gap="md">
        <Text variant="secondary">
          Links this item to a real product listing. This is a deliberate, one-time action — nothing links
          automatically.
        </Text>
        <Row gap="sm" align="center">
          <Toggle checked={mode === "create"} onChange={(checked) => setMode(checked ? "create" : "link")} size="sm" />
          <Text>{mode === "create" ? "Create a new pre-order product" : "Link to an existing product"}</Text>
        </Row>

        {mode === "link" ? (
          <ProductInlineSelect
            scope="admin"
            value={existingProductId}
            onChange={setExistingProductId}
            placeholder="Search products…"
          />
        ) : (
          <Stack gap="sm">
            <TagInput
              label="Category slugs"
              value={categorySlugs}
              onChange={setCategorySlugs}
              placeholder="category-action-figures"
            />
            <FieldInput name="brandSlug" label="Brand slug (optional)" value={brandSlug} onChange={setBrandSlug} />
          </Stack>
        )}

        <Button isLoading={linkMutation.isPending} disabled={!canSubmit} onClick={() => linkMutation.mutate()}>
          {mode === "create" ? "Create & Link" : "Link"}
        </Button>
      </Stack>
    </Modal>
  );
}
