"use client";

import React from "react";
import { Button, Div, Heading, Modal, Pagination, Stack, Table, Text } from "../../../ui";
import { useShipmentProjections, useShipmentItems } from "../hooks/useShipments";
import { ShipmentItemLinkModal } from "./ShipmentItemLinkModal";
import { formatPaise } from "../../../utils/number.formatter";
import type { ShipmentLot } from "../schemas/firestore";

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
  const [sorts, setSorts] = React.useState("-projectedProfitPaise");
  const { lots, meta, isLoading, refetch } = useShipmentProjections({ page, pageSize, sorts });

  const [pickerLot, setPickerLot] = React.useState<ShipmentLot | null>(null);

  return (
    <Stack gap="md">
      <Div className="flex items-center justify-between">
        <Heading level={2}>Projections</Heading>
        <select
          aria-label="Sort by"
          value={sorts}
          onChange={(e) => setSorts(e.target.value)}
          className="appkit-form-field"
        >
          <option value="-projectedProfitPaise">Highest projected profit</option>
          <option value="projectedProfitPaise">Lowest projected profit</option>
          <option value="-projectedRevenuePaise">Highest projected revenue</option>
          <option value="-createdAt">Newest</option>
        </select>
      </Div>

      {isLoading ? (
        <Text variant="secondary">Loading…</Text>
      ) : lots.length === 0 ? (
        <Text variant="secondary">No lots to project yet.</Text>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Items</th>
              <th>Landed Cost</th>
              <th>Projected Revenue</th>
              <th>Projected Profit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>{lot.lotName}</td>
                <td>{lot.itemCount}</td>
                <td>{formatPaise(lot.totalLandedCostPaise)}</td>
                <td>{formatPaise(lot.projectedRevenuePaise)}</td>
                <td className={lot.projectedProfitPaise < 0 ? "text-error" : "text-success"}>
                  {formatPaise(lot.projectedProfitPaise)}
                </td>
                <td>
                  <Button size="sm" variant="ghost" onClick={() => setPickerLot(lot)}>
                    Create pre-order link
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
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
              <Div key={item.id} className="flex items-center justify-between">
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
