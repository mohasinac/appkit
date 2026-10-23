"use client";

/*
 * WHY: Bug 0e — a seller could not express "book this through us". The write
 *      shape said `method: z.literal("custom")`, so there was no option to
 *      offer; `platformBookedShipment`, which `order-math.ts` gates shipping
 *      reimbursement on, had ZERO writers.
 *
 *      The schema now carries a discriminated union and the server does the
 *      booking. This is the control that reaches it.
 *
 * WHAT: One dispatch panel with two branches — post it yourself, or book a
 *       pickup on the platform's carrier account.
 *
 * EXPORTS: DispatchForm
 *
 * @tag domain:seller,orders,shipping
 * @tag layer:component
 * @tag pattern:form
 * @tag access:client
 * @tag consumers:SellerOrderDetailPanel
 * @tag sideEffects:network
 */

import React, { useState } from "react";

import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Layout";
import { Row } from "../../../ui/components/Layout";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import { shipOrderSchema } from "../schemas/order-forms";
import { applyZodIssues, rootLevelMessages } from "../../../ui/forms/apply-zod-issues";

/** A store pickup address, as `GET /api/store/addresses` returns it. */
interface PickupOption {
  id: string;
  label?: string;
  city?: string;
  postalCode?: string;
}

/**
 * Box presets, in centimetres and kilograms.
 *
 * 🛑 A PRESET rather than four number inputs, and that is the whole UX
 * argument: a seller packing a Beyblade does not know the parcel's
 * dimensions, and a carrier rejects a wrong one with an opaque error at
 * pickup time rather than at booking time. Four free fields produce four
 * chances to guess. "Custom" exists for the genuinely odd parcel.
 */
const BOX_PRESETS = [
  { id: "small", label: "Small — single top (0.3 kg)", weight: 0.3, length: 20, width: 15, height: 10 },
  { id: "medium", label: "Medium — a few items (1 kg)", weight: 1, length: 30, width: 25, height: 15 },
  { id: "large", label: "Large — stadium or bundle (3 kg)", weight: 3, length: 45, width: 35, height: 25 },
] as const;

type Method = "custom" | "platform";

export function DispatchForm({
  orderId,
  /** Already dispatched? Then there is nothing to book and nothing to record. */
  trackingNumber,
  /** Set by `bookShipment`; a booked parcel must not be re-booked. */
  platformBooked,
  onDispatched,
}: {
  orderId: string;
  trackingNumber?: string;
  platformBooked?: boolean;
  onDispatched: () => void;
}) {
  const [method, setMethod] = useState<Method>("custom");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [pickupId, setPickupId] = useState("");
  const [boxId, setBoxId] = useState<string>(BOX_PRESETS[1].id);
  const [pickups, setPickups] = useState<PickupOption[]>([]);
  const [pickupsFailed, setPickupsFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * 🛑 Fetched ONLY when the platform branch is open. The custom branch is
   * the common case and needs no address at all, so loading this on mount
   * would be a request on every order panel open for a field most sellers
   * never reach (Rule #6).
   */
  React.useEffect(() => {
    if (method !== "platform" || pickups.length > 0 || pickupsFailed) return;
    let live = true;
    fetch(SELLER_ENDPOINTS.STORE_ADDRESSES)
      .then((r) => r.json())
      .then((json) => {
        if (!live) return;
        const rows = (json?.data?.items ?? json?.data ?? json?.items ?? []) as PickupOption[];
        setPickups(Array.isArray(rows) ? rows : []);
        if (Array.isArray(rows) && rows.length === 1) setPickupId(rows[0]!.id);
      })
      .catch((err: unknown) => {
        void normalizeError(err);
        /*
         * 🛑 Recorded, not swallowed into an empty list. An empty dropdown
         * reads as "this store has no pickup addresses" — a fact about the
         * store — when it may be a failed request. The two need different
         * actions from the seller, so they must not render the same.
         */
        if (live) setPickupsFailed(true);
      });
    return () => {
      live = false;
    };
  }, [method, pickups.length, pickupsFailed]);

  if (trackingNumber) {
    return (
      <Stack gap="2">
        <Text size="sm" weight="medium">
          Dispatched
        </Text>
        <Text size="xs" color="muted">
          {platformBooked
            ? `Booked through LetItRip · ${trackingNumber}`
            : `Posted by you · ${trackingNumber}`}
        </Text>
      </Stack>
    );
  }

  const submit = async (
    setFieldError: (field: string, message: string) => void,
    clearErrors: () => void,
  ) => {
    clearErrors();
    setError(null);

    const box = BOX_PRESETS.find((b) => b.id === boxId) ?? BOX_PRESETS[1];
    const payload =
      method === "platform"
        ? {
            method: "platform" as const,
            pickupAddressId: pickupId,
            dimensions: {
              weight: box.weight,
              length: box.length,
              width: box.width,
              height: box.height,
            },
          }
        : {
            method: "custom" as const,
            shippingCarrier: carrier.trim(),
            trackingNumber: tracking.trim(),
            trackingUrl: trackingUrl.trim(),
          };

    /*
     * Parsed against the SAME schema the route and the action use, so the
     * branch's required fields are stated once. `applyZodIssues` can only
     * attach path-bearing issues, so root-level refinements are surfaced
     * separately or a refused save shows nothing at all.
     */
    const parsed = shipOrderSchema.safeParse(payload);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      const root = rootLevelMessages(parsed.error.issues);
      if (root.length > 0) setError(root.join(" "));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(SELLER_ENDPOINTS.ORDER_SHIP(orderId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        /*
         * 🛑 `toUserMessage(code)`, never the server's own `error` string —
         * an unmapped code would otherwise print server internals into the
         * panel, which is literally how a Node `MODULE_NOT_FOUND` with a
         * require stack reached a buyer-facing modal (Root Cause #86).
         */
        setError(toUserMessage(json?.code));
        return;
      }
      onDispatched();
    } catch (err) {
      void normalizeError(err);
      setError(toUserMessage(undefined));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="3">
      <Text size="sm" weight="medium">
        Dispatch
      </Text>

      {/*
        A two-way choice, so a segmented pair rather than a dropdown — both
        options and their consequences are readable without opening anything.
      */}
      <Row gap="sm">
        <Button
          size="sm"
          variant={method === "custom" ? "primary" : "outline"}
          aria-pressed={method === "custom"}
          onClick={() => setMethod("custom")}
        >
          I posted it
        </Button>
        <Button
          size="sm"
          variant={method === "platform" ? "primary" : "outline"}
          aria-pressed={method === "platform"}
          onClick={() => setMethod("platform")}
        >
          Book through LetItRip
        </Button>
      </Row>

      <Form onSubmit={(e) => e.preventDefault()}>
        {({ setFieldError, clearErrors }) => (
          <Stack gap="3">
            {method === "custom" ? (
              <>
                <FieldInput
                  name="shippingCarrier"
                  label="Carrier"
                  required
                  value={carrier}
                  onChange={setCarrier}
                />
                <FieldInput
                  name="trackingNumber"
                  label="Tracking number"
                  required
                  value={tracking}
                  onChange={setTracking}
                />
                <FieldInput
                  name="trackingUrl"
                  label="Tracking URL"
                  required
                  type="url"
                  value={trackingUrl}
                  onChange={setTrackingUrl}
                />
              </>
            ) : (
              <>
                {pickupsFailed ? (
                  <Text size="xs" color="error" role="alert">
                    Could not load your pickup addresses. Reopen this panel to try again.
                  </Text>
                ) : pickups.length === 0 ? (
                  <Text size="xs" color="muted">
                    Loading your pickup addresses…
                  </Text>
                ) : (
                  <FieldSelect
                    name="pickupAddressId"
                    label="Collect from"
                    required
                    value={pickupId}
                    onChange={setPickupId}
                    options={pickups.map((p) => ({
                      value: p.id,
                      label: [p.label, p.city, p.postalCode].filter(Boolean).join(" · ") || p.id,
                    }))}
                  />
                )}
                <FieldSelect
                  name="box"
                  label="Parcel size"
                  required
                  value={boxId}
                  onChange={setBoxId}
                  options={BOX_PRESETS.map((b) => ({ value: b.id, label: b.label }))}
                />
                <Text size="xs" color="muted">
                  The courier is booked on the platform&apos;s account and the tracking id comes
                  back from them — you do not enter one.
                </Text>
              </>
            )}

            {error && (
              <Div
                textSize="xs"
                className="border border-error/20"
                color="error"
                surface="danger-surface"
                padding="inlineSm"
                rounded="lg"
                role="alert"
              >
                {error}
              </Div>
            )}

            {/*
              🛑 ONE submit control, and deliberately NO `bottomBar`.
              This panel renders inside a `SideDrawer` on the orders list, and
              `useFormBottomActions` suppresses the bar inside an overlay — so
              a configured bar would read as the footer's configuration while
              doing nothing (bug 0d, `audit-one-submit-control` R1).
            */}
            <Button
              type="submit"
              action={
                method === "platform"
                  ? ACTIONS.STORE["dispatch-platform"]
                  : ACTIONS.STORE["dispatch-custom"]
              }
              isLoading={busy}
              onClick={() => void submit(setFieldError, clearErrors)}
            />
          </Stack>
        )}
      </Form>
    </Stack>
  );
}
