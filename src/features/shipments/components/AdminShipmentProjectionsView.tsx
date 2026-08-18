"use client";

import React from "react";
import { Button, Div, Heading, Modal, Pagination, Select, Skeleton, Stack, Table, Thead, Tbody, Tr, Th, Td, Text } from "../../../ui";
import { useShipmentProjections, useShipmentItems } from "../hooks/useShipments";
import { ShipmentItemLinkModal } from "./ShipmentItemLinkModal";
import { formatCurrency } from "../../../utils/number.formatter";
import { sortBy } from "../../../constants/sort";
import type { ShipmentLot } from "../schemas/firestore";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: sortBy("projectedProfit", "DESC"), label: "Highest projected profit" },
  { value: sortBy("projectedProfit", "ASC"), label: "Lowest projected profit" },
  { value: sortBy("projectedRevenue", "DESC"), label: "Highest projected revenue" },
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
];

/**
 * A real, paginated, persisted list of lots across every non-cancelled
 * shipment — reads the rollup fields the Firestore Function cascade already
 * wrote, never recomputed on load. See CLAUDE.md's "Open design question,
 * resolved" note in the shipments plan for why this is dynamic-query, not
 * materialized, and why it's still "saved" rather than computed live.
 */
export function AdminShipmentProjectionsView() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sorts, setSorts] = React.useState(SORT_OPTIONS[0].value);
  const { lots, meta, isLoading, refetch } = useShipmentProjections({ page, pageSize, sorts });

  const [pickerLot, setPickerLot] = React.useState<ShipmentLot | null>(null);

  return (
    <Stack gap="md">
      <Div layout="flex" align="center" justify="between">
        <Heading level={2}>Projections</Heading>
        <Select
          aria-label="Sort by"
          value={sorts}
          onValueChange={setSorts}
          options={SORT_OPTIONS}
        />
      </Div>

      {isLoading ? (
        <Stack gap="sm">
          <Skeleton variant="rectangular" height="32px" />
          <Skeleton variant="rectangular" height="32px" />
          <Skeleton variant="rectangular" height="32px" />
        </Stack>
      ) : lots.length === 0 ? (
        <Text variant="secondary">No lots to project yet.</Text>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Lot</Th>
              <Th>Items</Th>
              <Th>Landed Cost</Th>
              <Th>Projected Revenue</Th>
              <Th>Projected Profit</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {lots.map((lot) => (
              <Tr key={lot.id}>
                <Td>{lot.lotName}</Td>
                <Td>{lot.itemCount}</Td>
                <Td>{formatCurrency(lot.totalLandedCost)}</Td>
                <Td>{formatCurrency(lot.projectedRevenue)}</Td>
                <Td className={lot.projectedProfit < 0 ? "text-error" : "text-success"}>
                  {formatCurrency(lot.projectedProfit)}
                </Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => setPickerLot(lot)}>
                    Create pre-order link
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

      {pickerLot && (
        <LotItemPickerModal lot={pickerLot} onClose={() => setPickerLot(null)} onLinked={refetch} />
      )}
    </Stack>
  );
}

function LotItemPickerModal({
  lot,
  onClose,
  onLinked,
}: {
  lot: ShipmentLot;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { items, refetch } = useShipmentItems(lot.shipmentId, lot.id, { pageSize: 100 });
  const [linkTarget, setLinkTarget] = React.useState<{ itemId: string; title: string } | null>(null);
  const unlinkedItems = items.filter((item) => !item.isForSelfUse && !item.linkedProductId);

  return (
    <>
      <Modal isOpen={!linkTarget} onClose={onClose} title={`Link an item from "${lot.lotName}"`} size="md">
        <Stack gap="sm">
          {unlinkedItems.length === 0 ? (
            <Text variant="secondary">No unlinked, resale-eligible items in this lot.</Text>
          ) : (
            unlinkedItems.map((item) => (
              <Div key={item.id} layout="flex" align="center" justify="between">
                <Text>{item.title}</Text>
                <Button size="sm" onClick={() => setLinkTarget({ itemId: item.id, title: item.title })}>
                  Link
                </Button>
              </Div>
            ))
          )}
        </Stack>
      </Modal>
      {linkTarget && (
        <ShipmentItemLinkModal
          shipmentId={lot.shipmentId}
          lotId={lot.id}
          itemId={linkTarget.itemId}
          itemTitle={linkTarget.title}
          isOpen={!!linkTarget}
          onClose={() => {
            setLinkTarget(null);
            onClose();
          }}
          onLinked={() => {
            refetch();
            onLinked();
          }}
        />
      )}
    </>
  );
}
