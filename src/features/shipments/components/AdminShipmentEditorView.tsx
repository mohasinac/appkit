"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import {
  Alert,
  Button,
  Div,
  Form,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  Grid,
  Heading,
  Stack,
  Table,
  Text,
  TextLink,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { createShipmentSchema } from "../schemas/validation";
import { useShipment } from "../hooks/useShipments";
import type { ShipmentDocument, ShipmentLot } from "../schemas/firestore";
import { formatPaise } from "../../../utils/number.formatter";

const STATUS_OPTIONS = [
  { label: "Planning", value: "planning" },
  { label: "Ordered", value: "ordered" },
  { label: "In Transit", value: "in_transit" },
  { label: "Customs", value: "customs" },
  { label: "Received", value: "received" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export interface AdminShipmentEditorViewProps {
  shipmentId?: string;
  onSaved?: (id: string) => void;
  embedded?: boolean;
}

export function AdminShipmentEditorView({ shipmentId, onSaved, embedded }: AdminShipmentEditorViewProps) {
  const isCreate = !shipmentId;
  const queryClient = useQueryClient();
  const { shipment, lots, refetchLots } = useShipment(shipmentId);

  const [shipmentNumber, setShipmentNumber] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [originCountry, setOriginCountry] = React.useState("");
  const [status, setStatus] = React.useState("planning");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [etaDate, setEtaDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [customsTotalRupees, setCustomsTotalRupees] = React.useState("0");
  const [shippingTotalRupees, setShippingTotalRupees] = React.useState("0");
  const [laborHoursSpent, setLaborHoursSpent] = React.useState("0");

  React.useEffect(() => {
    if (!shipment) return;
    setShipmentNumber(shipment.shipmentNumber);
    setSupplierName(shipment.supplierName);
    setOriginCountry(shipment.originCountry ?? "");
    setStatus(shipment.status);
    setTrackingNumber(shipment.trackingNumber ?? "");
    setCarrier(shipment.carrier ?? "");
    setEtaDate(shipment.etaDate ? new Date(shipment.etaDate).toISOString().slice(0, 10) : "");
    setNotes(shipment.notes ?? "");
    setCustomsTotalRupees(String(shipment.customsTotalPaise / 100));
    setShippingTotalRupees(String(shipment.shippingTotalPaise / 100));
    setLaborHoursSpent(String(shipment.laborHoursSpent ?? 0));
  }, [shipment]);

  const saveMutation = useApiMutation<ShipmentDocument>({
    successMessage: isCreate ? "Shipment created" : "Shipment updated",
    mutationFn: async () => {
      const payload = {
        shipmentNumber,
        supplierName,
        originCountry: originCountry || undefined,
        status,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        etaDate: etaDate || undefined,
        notes: notes || undefined,
        customsTotalPaise: Math.round(Number(customsTotalRupees) * 100),
        shippingTotalPaise: Math.round(Number(shippingTotalRupees) * 100),
        laborHoursSpent: Number(laborHoursSpent),
      };
      if (isCreate) {
        return apiClient.post<ShipmentDocument>(ADMIN_ENDPOINTS.SHIPMENTS, payload);
      }
      return apiClient.patch<ShipmentDocument>(ADMIN_ENDPOINTS.SHIPMENT_BY_ID(shipmentId!), payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shipments"] });
      onSaved?.(saved.id);
    },
  });

  return (
    <Form schema={createShipmentSchema} spacing="md">
      {({ setFieldError }) => (
        <>
          <Grid cols={2} gap="md">
            <FieldInput name="shipmentNumber" label="Shipment Number" required value={shipmentNumber} onChange={setShipmentNumber} placeholder="SH-2026-0001" />
            <FieldInput name="supplierName" label="Supplier Name" required value={supplierName} onChange={setSupplierName} />
            <FieldInput name="originCountry" label="Origin Country" value={originCountry} onChange={setOriginCountry} />
            <FieldSelect name="status" label="Status" required value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <FieldInput name="trackingNumber" label="Tracking Number" value={trackingNumber} onChange={setTrackingNumber} />
            <FieldInput name="carrier" label="Carrier" value={carrier} onChange={setCarrier} />
            <FieldInput name="etaDate" label="ETA Date" type="date" value={etaDate} onChange={setEtaDate} />
            <FieldInput name="laborHoursSpent" label="Labor Hours Spent" type="number" min="0" value={laborHoursSpent} onChange={setLaborHoursSpent} />
            <FieldInput name="customsTotalPaise" label="Customs Total (₹)" type="number" min="0" value={customsTotalRupees} onChange={setCustomsTotalRupees} hint="Split across lots by declared value" />
            <FieldInput name="shippingTotalPaise" label="Shipping Total (₹)" type="number" min="0" value={shippingTotalRupees} onChange={setShippingTotalRupees} hint="Split across lots by weight" />
          </Grid>
          <FieldTextarea name="notes" label="Notes" value={notes} onChange={setNotes} rows={3} />

          <Button
            type="button"
            isLoading={saveMutation.isPending}
            onClick={() => {
              const parsed = createShipmentSchema.safeParse({
                shipmentNumber,
                supplierName,
                status,
                customsTotalPaise: Math.round(Number(customsTotalRupees) * 100),
                shippingTotalPaise: Math.round(Number(shippingTotalRupees) * 100),
                laborHoursSpent: Number(laborHoursSpent),
              });
              if (!parsed.success) {
                for (const issue of parsed.error.issues) setFieldError(String(issue.path[0]), issue.message);
                return;
              }
              saveMutation.mutate();
            }}
          >
            {isCreate ? "Create Shipment" : "Save Changes"}
          </Button>

          {!isCreate && shipmentId && (
            <ShipmentLotsSection shipmentId={shipmentId} lots={lots} onLotsChanged={refetchLots} />
          )}
        </>
      )}
    </Form>
  );
}

function ShipmentLotsSection({
  shipmentId,
  lots,
  onLotsChanged,
}: {
  shipmentId: string;
  lots: ShipmentLot[];
  onLotsChanged: () => void;
}) {
  const [showAddLot, setShowAddLot] = React.useState(false);
  const [lotName, setLotName] = React.useState("");
  const [weightGrams, setWeightGrams] = React.useState("0");
  const [purchaseCostRupees, setPurchaseCostRupees] = React.useState("0");

  const addLotMutation = useApiMutation({
    successMessage: "Lot added",
    mutationFn: () =>
      apiClient.post(ADMIN_ENDPOINTS.SHIPMENT_LOTS(shipmentId), {
        lotName,
        weightGrams: Number(weightGrams),
        purchaseCostPaise: Math.round(Number(purchaseCostRupees) * 100),
      }),
    onSuccess: () => {
      setLotName("");
      setWeightGrams("0");
      setPurchaseCostRupees("0");
      setShowAddLot(false);
      onLotsChanged();
    },
  });

  const deleteLotMutation = useApiMutation({
    successMessage: "Lot deleted",
    mutationFn: (lotId: string) => apiClient.delete(ADMIN_ENDPOINTS.SHIPMENT_LOT_BY_ID(shipmentId, lotId)),
    onSuccess: () => onLotsChanged(),
  });

  return (
    <Stack gap="md" className="border-t pt-[var(--appkit-space-4)]">
      <Div className="flex items-center justify-between">
        <Heading level={4}>Lots ({lots.length}/10)</Heading>
        {lots.length < 10 && (
          <Button size="sm" variant="secondary" type="button" onClick={() => setShowAddLot((v) => !v)}>
            {showAddLot ? "Cancel" : "+ Add Lot"}
          </Button>
        )}
      </Div>

      {showAddLot && (
        <Grid cols={3} gap="sm">
          <FieldInput name="lotName" label="Lot Name" value={lotName} onChange={setLotName} />
          <FieldInput name="weightGrams" label="Weight (g)" type="number" min="0" value={weightGrams} onChange={setWeightGrams} />
          <FieldInput name="purchaseCostPaise" label="Purchase Cost (₹)" type="number" min="0" value={purchaseCostRupees} onChange={setPurchaseCostRupees} />
          <Button
            type="button"
            size="sm"
            isLoading={addLotMutation.isPending}
            disabled={!lotName}
            onClick={() => addLotMutation.mutate()}
          >
            Save Lot
          </Button>
        </Grid>
      )}

      {lots.length === 0 ? (
        <Text variant="secondary">No lots yet. Add a lot, then manage its items.</Text>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Weight (g)</th>
              <th>Items</th>
              <th>Projected Profit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>{lot.lotName}</td>
                <td>{lot.weightGrams}</td>
                <td>{lot.itemCount}</td>
                <td>{formatPaise(lot.projectedProfitPaise)}</td>
                <td className="flex gap-[var(--appkit-space-2)]">
                  <TextLink href={ROUTES.ADMIN.SHIPMENT_LOT_ITEMS(shipmentId, lot.id)}>
                    Manage Items →
                  </TextLink>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    action={ACTIONS.SHIPMENT["delete"]}
                    isLoading={deleteLotMutation.isPending}
                    onClick={() => deleteLotMutation.mutate(lot.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {lots.length > 0 && (
        <Alert variant="info">
          Customs/shipping allocation and profit totals recompute in the background a few seconds after any
          lot or item change — reload if a number looks stale.
        </Alert>
      )}
    </Stack>
  );
}
