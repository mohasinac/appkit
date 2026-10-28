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
import { apiClient, ApiClientError } from "../../../http/index";
import { useApiMutation } from "../../../client/api/useApiMutation";
import { useQuery } from "@tanstack/react-query";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Row } from "../../../ui/components/Layout";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
/*
 * audit-form-sectionised-ok: `shipOrderSchema` is a `z.discriminatedUnion`,
 * and `buildSectionsFromSchema` cannot drive a form from one — `resolveFields`
 * calls `objectShape(schema)` and returns `[]` when there is no `.shape`.
 * Measured against the repo's zod (4.4.3): a discriminated union's `.shape` is
 * `undefined`, so `<SectionForm sections={buildSectionsFromSchema(shipOrderSchema)}>`
 * would render ZERO fields. That is the whole form, silently blank.
 *
 * The branch structure is the reason the schema is a union rather than one
 * object with every field optional: "custom" needs a carrier and a tracking
 * id, "platform" needs a pickup address and a box, and neither set is valid
 * for the other. Flattening them to make this sectionisable would delete the
 * per-branch requiredness the route and the action both parse against — i.e.
 * it would weaken the server contract to satisfy a client-side layout rule.
 *
 * The schema is still load-bearing here: the submit handler safe-parses
 * against it and pipes issues through `applyZodIssues` + `rootLevelMessages`,
 * so every bound is enforced on this surface. What is missing is only the
 * schema-DERIVED section layout.
 */
import type { z } from "zod";
import { shipOrderSchema } from "../schemas/order-forms";

/*
 * The parsed payload, derived from the schema rather than restated — a
 * second hand-written shape here would be a copy of the one contract the
 * route, the action and this form all parse against.
 */
type ShipOrderPayload = z.infer<typeof shipOrderSchema>;
import { applyZodIssues, rootLevelMessages } from "../../../ui/forms/apply-zod-issues";
import { getBrandName } from "../../../core/brand-resolver";

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
  const [error, setError] = useState<string | null>(null);

  /*
   * 🛑 Fetched ONLY when the platform branch is open. The custom branch is
   * the common case and needs no address at all, so loading this on mount
   * would be a request on every order panel open for a field most sellers
   * never reach (Rule #6).
   */
  /*
   * 🛑 `toUserMessage(code)` on failure, never the server's own `error`
   * string — an unmapped code would print server internals into the panel,
   * which is literally how a Node `MODULE_NOT_FOUND` with a require stack
   * reached a buyer-facing modal (Root Cause #86). `ApiClientError` carries
   * the stable code, so the mapping survives the move off raw `fetch`.
   */
  /*
   * 🛑 A REF, because `setFieldError` comes from `<Form>`'s render-prop and
   * therefore does not exist in component scope where the mutation is
   * declared. The mutation needs a STABLE sink — passing the render-prop
   * helper directly is impossible, and re-creating the mutation per render to
   * close over it would reset its pending state mid-request.
   *
   * It is assigned inside the render-prop below, so by the time any submit
   * can fire it is populated. The `?.` is not defensive decoration: the first
   * render completes before `<Form>` calls its child.
   */
  const fieldErrorSink = React.useRef<((name: string, error: string | null) => void) | null>(null);

  const shipMutation = useApiMutation({
    /*
     * 🛑 Passed so the server's own per-field `issues` land on the fields
     * they name. The route parses the same `shipOrderSchema` this form does,
     * so a rejection it produces that the client parse did not is real news
     * — a carrier the courier does not recognise, a pickup address that
     * stopped being serviceable — and collapsing that into one generic
     * sentence hides which input to fix.
     */
    setFieldError: (field: string, message: string) =>
      fieldErrorSink.current?.(field, message),
    mutationFn: (payload: ShipOrderPayload) =>
      apiClient.post(SELLER_ENDPOINTS.ORDER_SHIP(orderId), payload),
    onSuccess: () => onDispatched(),
    onError: (err) => {
      void normalizeError(err);
      setError(toUserMessage(err instanceof ApiClientError ? err.code : undefined));
    },
  });

  /*
   * 🛑 `enabled` is what keeps this request off the common path. The custom
   * branch needs no address at all, so loading pickups on mount would fire a
   * request on every order panel a seller opens for a field most of them
   * never reach (Rule #6). `useQuery` also dedupes and caches it, which the
   * hand-rolled effect could not — it refetched on every branch toggle.
   */
  const pickupsQuery = useQuery({
    queryKey: ["store", "addresses", "pickup"],
    enabled: method === "platform",
    queryFn: () => apiClient.get<{ items?: PickupOption[] }>(SELLER_ENDPOINTS.STORE_ADDRESSES),
  });
  const pickups: PickupOption[] = Array.isArray(pickupsQuery.data?.items)
    ? pickupsQuery.data.items
    : [];
  /*
   * 🛑 A FAILED request and an empty list must not render the same. An empty
   * dropdown reads as "this store has no pickup addresses" — a fact about the
   * store — when it may be a network error, and the two need different
   * actions from the seller.
   */
  const pickupsFailed = pickupsQuery.isError;

  React.useEffect(() => {
    if (pickups.length === 1 && !pickupId) setPickupId(pickups[0]!.id);
  }, [pickups, pickupId]);

  if (trackingNumber) {
    return (
      <Stack gap="sm">
        <Text size="sm" weight="medium">
          Dispatched
        </Text>
        <Text size="xs" color="muted">
          {platformBooked
            ? `Booked through ${getBrandName()} · ${trackingNumber}`
            : `Posted by you · ${trackingNumber}`}
        </Text>
      </Stack>
    );
  }

  const submit = async (
    /* The `<Form>` render-prop's own signature — `applyZodIssues` clears a
     * field by passing `null`, so a `string`-only sink is not assignable. */
    setFieldError: (name: string, error: string | null) => void,
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

    shipMutation.mutate(parsed.data);
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
          Book through {getBrandName()}
        </Button>
      </Row>

      <Form onSubmit={(e) => e.preventDefault()}>
        {({ setFieldError, clearErrors }) => {
          fieldErrorSink.current = setFieldError;
          return (
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
              isLoading={shipMutation.isPending}
              onClick={() => void submit(setFieldError, clearErrors)}
            />
          </Stack>
          );
        }}
      </Form>
    </Stack>
  );
}
