"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@mohasinac/appkit/client";
import {
  Alert,
  Button,
  Div,
  FieldInput,
  Grid,
  Heading,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  TextLink,
  FormErrorSummary,
} from "../../../ui";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { createShipmentSchema } from "../schemas/validation";
import { useShipment } from "../hooks/useShipments";
import type { ShipmentDocument, ShipmentLot } from "../schemas/firestore";
import { formatCurrency } from "../../../utils/number.formatter";
import { RecordStatusTimeline } from "../../status-history/components/RecordStatusTimeline";

export interface AdminShipmentEditorViewProps {
  shipmentId?: string;
  onSaved?: (id: string) => void;
  embedded?: boolean;
}

/**
 * The draft this form edits.
 *
 * Money and hours are NUMBERS here, not the strings the hand-rolled version
 * kept, because `createShipmentSchema` declares them `z.number()` — the old
 * code coerced at the payload and passed a different shape to the parse than
 * to the API.
 */
interface ShipmentValues {
  [key: string]: unknown;
  shipmentNumber: string;
  supplierName: string;
  originCountry: string;
  status: string;
  trackingNumber: string;
  carrier: string;
  etaDate: string;
  receivedDate: string;
  customsTotal: number;
  shippingTotal: number;
  laborHoursSpent: number;
  laborRatePerHour: number;
  notes: string;
}

const EMPTY_SHIPMENT: ShipmentValues = {
  shipmentNumber: "",
  supplierName: "",
  originCountry: "",
  status: "planning",
  trackingNumber: "",
  carrier: "",
  etaDate: "",
  receivedDate: "",
  customsTotal: 0,
  shippingTotal: 0,
  laborHoursSpent: 0,
  laborRatePerHour: 0,
  notes: "",
};

/** A Firestore date, as a `<input type="date">` value. */
function toDateInput(value: string | Date | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function AdminShipmentEditorView({ shipmentId, onSaved }: AdminShipmentEditorViewProps) {
  const isCreate = !shipmentId;
  const queryClient = useQueryClient();
  const { shipment, lots, refetchLots } = useShipment(shipmentId);

  const [form, setForm] = React.useState<ShipmentValues>(EMPTY_SHIPMENT);
  const patch = (partial: Partial<ShipmentValues>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  React.useEffect(() => {
    if (!shipment) return;
    const doc = shipment as ShipmentDocument & {
      receivedDate?: string | Date;
      laborRatePerHour?: number;
    };
    patch({
      shipmentNumber: doc.shipmentNumber,
      supplierName: doc.supplierName,
      originCountry: doc.originCountry ?? "",
      status: doc.status,
      trackingNumber: doc.trackingNumber ?? "",
      carrier: doc.carrier ?? "",
      etaDate: toDateInput(doc.etaDate as string | Date | undefined),
      receivedDate: toDateInput(doc.receivedDate),
      customsTotal: doc.customsTotal,
      shippingTotal: doc.shippingTotal,
      laborHoursSpent: doc.laborHoursSpent ?? 0,
      laborRatePerHour: doc.laborRatePerHour ?? 0,
      notes: doc.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment]);

  const saveMutation = useApiMutation<ShipmentDocument>({
    successMessage: isCreate ? "Shipment created" : "Shipment updated",
    mutationFn: async () => {
      const draft = visibleValues(createShipmentSchema, form) as ShipmentValues;
      const payload = {
        shipmentNumber: draft.shipmentNumber,
        supplierName: draft.supplierName,
        originCountry: draft.originCountry || undefined,
        status: draft.status,
        trackingNumber: draft.trackingNumber || undefined,
        carrier: draft.carrier || undefined,
        etaDate: draft.etaDate || undefined,
        receivedDate: draft.receivedDate || undefined,
        notes: draft.notes || undefined,
        customsTotal: draft.customsTotal,
        shippingTotal: draft.shippingTotal,
        laborHoursSpent: draft.laborHoursSpent,
        laborRatePerHour: draft.laborRatePerHour || undefined,
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

  const sections = React.useMemo(
    () => buildSectionsFromSchema<ShipmentValues>(createShipmentSchema),
    [],
  );
  const nav = useSectionFormNav(sections, form, { scope: "admin:shipment-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(createShipmentSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const handleSubmit = () => {
    clearErrors();
    /*
     * The whole draft, not six of its thirteen fields.
     *
     * The hand-rolled parse passed a literal covering `shipmentNumber`,
     * `supplierName`, `status` and the three money fields — so `originCountry`,
     * `trackingNumber`, `carrier`, `etaDate` and `notes` were never checked by
     * anything, and `receivedDate` / `laborRatePerHour` had no control at all
     * although the schema declares them and the route accepts them.
     */
    const parsed = createShipmentSchema.safeParse(
      visibleValues(createShipmentSchema, form),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Stack gap="md">
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<ShipmentValues>
          sections={sections}
          values={form}
          onChange={patch}
          onSubmit={handleSubmit}
          schema={createShipmentSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={saveMutation.isPending}
          submitLabel={isCreate ? "Create shipment" : "Save changes"}
        />
      </FormShellContext.Provider>

      {!isCreate && shipmentId && (
        <ShipmentLotsSection shipmentId={shipmentId} lots={lots} onLotsChanged={refetchLots} />
      )}

      {/*
        "How many times did the ETA slip before this landed" — each slip
        overwrites `etaDate`, so the timeline is the only place the
        earlier promises survive.
      */}
      {!isCreate && (
        <RecordStatusTimeline
          entries={(shipment as { statusHistory?: never[] } | undefined)?.statusHistory}
          truncatedCount={
            (shipment as { statusHistoryTruncated?: number } | undefined)?.statusHistoryTruncated
          }
        />
      )}
    </Stack>
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
        purchaseCost: Math.round(Number(purchaseCostRupees) * 100) / 100,
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
      <Div layout="flex" align="center" justify="between">
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
          <FieldInput name="purchaseCost" label="Purchase Cost (₹)" type="number" min="0" value={purchaseCostRupees} onChange={setPurchaseCostRupees} />
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
          <Thead>
            <Tr>
              <Th>Lot</Th>
              <Th>Weight (g)</Th>
              <Th>Items</Th>
              <Th>Projected Profit</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {lots.map((lot) => (
              <Tr key={lot.id}>
                <Td>{lot.lotName}</Td>
                <Td>{lot.weightGrams}</Td>
                <Td>{lot.itemCount}</Td>
                <Td>{formatCurrency(lot.projectedProfit)}</Td>
                <Td className="flex gap-[var(--appkit-space-2)]">
                  <TextLink href={ROUTES.ADMIN.SHIPMENT_LOT_ITEMS(shipmentId, lot.id)}>
                    Manage Items →
                  </TextLink>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    action={ACTIONS.SHIPMENT["delete-lot"]}
                    isLoading={deleteLotMutation.isPending}
                    onClick={() => deleteLotMutation.mutate(lot.id)}
                  >
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
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
