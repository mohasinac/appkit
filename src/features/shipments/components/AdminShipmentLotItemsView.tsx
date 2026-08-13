"use client";

import React from "react";
import { useApiMutation } from "@mohasinac/appkit/client";
import {
  Alert,
  Badge,
  Button,
  Div,
  FieldCheckbox,
  FieldInput,
  Grid,
  Heading,
  Modal,
  Pagination,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Textarea,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { useShipmentItems } from "../hooks/useShipments";
import { ShipmentItemLinkModal } from "./ShipmentItemLinkModal";
import type { BulkShipmentItemsInput } from "../schemas/validation";
import { formatPaise } from "../../../utils/number.formatter";

export interface AdminShipmentLotItemsViewProps {
  shipmentId: string;
  lotId: string;
}

interface ParsedBulkRow {
  title: string;
  quantity: number;
  price?: number;
  isForSelfUse: boolean;
}

function parseBulkText(text: string): ParsedBulkRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,/).map((p) => p.trim());
      const [title, quantityStr, priceStr] = parts;
      const isForSelfUse = /^self$/i.test(priceStr ?? "");
      return {
        title: title ?? "",
        quantity: Number(quantityStr) || 1,
        price: isForSelfUse ? undefined : priceStr ? Math.round(Number(priceStr) * 100) : undefined,
        isForSelfUse,
      };
    })
    .filter((row) => row.title.length > 0);
}

export function AdminShipmentLotItemsView({ shipmentId, lotId }: AdminShipmentLotItemsViewProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const { items, meta, isLoading, refetch } = useShipmentItems(shipmentId, lotId, { page, pageSize });

  const [showAddItem, setShowAddItem] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [priceRupees, setPriceRupees] = React.useState("0");
  const [isForSelfUse, setIsForSelfUse] = React.useState(false);

  const [showBulkImport, setShowBulkImport] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const parsedBulkRows = React.useMemo(() => parseBulkText(bulkText), [bulkText]);

  const [linkTarget, setLinkTarget] = React.useState<{ itemId: string; title: string } | null>(null);

  const addItemMutation = useApiMutation({
    successMessage: "Item added",
    mutationFn: () =>
      apiClient.post(ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEMS(shipmentId, lotId), {
        title,
        quantity: Number(quantity),
        isForSelfUse,
        price: isForSelfUse ? undefined : Math.round(Number(priceRupees) * 100),
      }),
    onSuccess: () => {
      setTitle("");
      setQuantity("1");
      setPriceRupees("0");
      setIsForSelfUse(false);
      setShowAddItem(false);
      refetch();
    },
  });

  const bulkImportMutation = useApiMutation({
    successMessage: "Items imported",
    mutationFn: () => {
      const rows: BulkShipmentItemsInput = parsedBulkRows.map((row) => ({
        title: row.title,
        quantity: row.quantity,
        isForSelfUse: row.isForSelfUse,
        price: row.price,
      }));
      return apiClient.post(ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEMS_BULK(shipmentId, lotId), rows);
    },
    onSuccess: () => {
      setBulkText("");
      setShowBulkImport(false);
      refetch();
    },
  });

  const deleteItemMutation = useApiMutation({
    successMessage: "Item deleted",
    mutationFn: (itemId: string) => apiClient.delete(ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEM_BY_ID(shipmentId, lotId, itemId)),
    onSuccess: () => refetch(),
  });

  const unlinkItemMutation = useApiMutation({
    successMessage: "Item unlinked",
    mutationFn: (itemId: string) =>
      apiClient.patch(ADMIN_ENDPOINTS.SHIPMENT_LOT_ITEM_BY_ID(shipmentId, lotId, itemId), {
        linkedProductId: null,
        linkedProductSlug: null,
        linkedProductListingType: null,
      }),
    onSuccess: () => refetch(),
  });

  return (
    <Stack gap="md">
      <Div layout="flex" align="center" justify="between">
        <Heading level={3}>Lot Items ({meta?.total ?? items.length}/500)</Heading>
        <Div className="flex gap-[var(--appkit-space-2)]">
          <Button size="sm" variant="secondary" onClick={() => setShowAddItem((v) => !v)}>
            {showAddItem ? "Cancel" : "+ Add Item"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowBulkImport(true)}>
            Bulk Import
          </Button>
        </Div>
      </Div>

      <Alert variant="info">
        Only individually notable "main" items need a row here — everything else in the lot can be captured
        as a single remainder estimate on the lot itself. Linking an item to a product does not sync future
        edits either way.
      </Alert>

      {showAddItem && (
        <Grid cols={4} gap="sm">
          <FieldInput name="title" label="Title" required value={title} onChange={setTitle} />
          <FieldInput name="quantity" label="Quantity" type="number" min="1" value={quantity} onChange={setQuantity} />
          <FieldInput
            name="price"
            label="Projected Sale Price (₹)"
            type="number"
            min="0"
            value={priceRupees}
            onChange={setPriceRupees}
            disabled={isForSelfUse}
          />
          <FieldCheckbox name="isForSelfUse" label="For self use (no resale)" checked={isForSelfUse} onChange={setIsForSelfUse} />
          <Button
            size="sm"
            isLoading={addItemMutation.isPending}
            disabled={!title || (!isForSelfUse && Number(priceRupees) <= 0)}
            onClick={() => addItemMutation.mutate()}
          >
            Save Item
          </Button>
        </Grid>
      )}

      {items.length === 0 ? (
        <Text variant="secondary">No items tracked yet.</Text>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th>Qty</Th>
              <Th>Price</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.title}</Td>
                <Td>{item.quantity}</Td>
                <Td>{item.isForSelfUse ? "—" : formatPaise(item.price ?? 0)}</Td>
                <Td>
                  {item.isForSelfUse ? (
                    <Badge variant="secondary">Self use</Badge>
                  ) : item.linkedProductId ? (
                    <Badge variant="success">Linked</Badge>
                  ) : (
                    <Badge variant="default">Unlinked</Badge>
                  )}
                </Td>
                <Td className="flex gap-[var(--appkit-space-2)]">
                  {!item.isForSelfUse &&
                    (item.linkedProductId ? (
                      <Button size="sm" variant="ghost" isLoading={unlinkItemMutation.isPending} onClick={() => unlinkItemMutation.mutate(item.id)}>
                        Unlink
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setLinkTarget({ itemId: item.id, title: item.title })}>
                        Create pre-order link
                      </Button>
                    ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    action={ACTIONS.SHIPMENT["delete"]}
                    isLoading={deleteItemMutation.isPending}
                    onClick={() => deleteItemMutation.mutate(item.id)}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <Modal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} title="Bulk import items" size="lg">
        <Stack gap="md">
          <Text variant="secondary">
            Paste one item per line: <code>title, quantity, price</code> — use <code>self</code> instead of a
            price for self-use items. Up to 500 rows per lot.
          </Text>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            placeholder={"Charizard PSA9, 1, 25000\nBooster box (assorted), 6, 3500\nMy personal grail card, 1, self"}
          />
          <Text variant="secondary">{parsedBulkRows.length} row(s) parsed</Text>
          <Button
            isLoading={bulkImportMutation.isPending}
            disabled={parsedBulkRows.length === 0}
            onClick={() => bulkImportMutation.mutate()}
          >
            Import {parsedBulkRows.length} item(s)
          </Button>
        </Stack>
      </Modal>

      {linkTarget && (
        <ShipmentItemLinkModal
          shipmentId={shipmentId}
          lotId={lotId}
          itemId={linkTarget.itemId}
          itemTitle={linkTarget.title}
          isOpen={!!linkTarget}
          onClose={() => setLinkTarget(null)}
          onLinked={() => refetch()}
        />
      )}
    </Stack>
  );
}
