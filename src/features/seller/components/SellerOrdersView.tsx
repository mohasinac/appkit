"use client";
import { OrderAddonBadges } from "../../orders/components/OrderAddonBadges";
import { normalizeError } from "../../../errors/normalize";
import type { JsonValue } from "@mohasinac/appkit/client";

import { Row, SIEVE_OP, sieveFilter } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { Eye, ExternalLink, Printer, MapPin, Truck } from "lucide-react";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

import { Badge, Button, Div, FilterChipGroup, Heading, Input, Select, SideDrawer, Span, Stack, Text, useToast } from "../../../ui";
import type { BulkActionItem, SelectOption } from "../../../ui";
import { SELLER_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { useOrderScope } from "../../orders/components/OrderScopeTabs";
import { OrderStatusValues } from "../../orders/schemas/firestore";
import { isManualPaymentMethod } from "../../orders/constants/payment-window";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import {
  sellerOrderUpdateSchema,
  type SellerOrderUpdateValues,
} from "../schemas/order-forms";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { PhysicalLocationModal } from "./PhysicalLocationModal";
import type { PhysicalLocation } from "./PhysicalLocationModal";
import { ROUTES } from "../../../constants";
import { toRecordArray, toCurrency, toStringValue } from "../hooks/useSellerListingData";
// Defining module (Root Cause #18) — the seller-side duplicate was deleted for drift.
import { toRelativeDate } from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { MediaImage } from "../../media/MediaImage";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
];
const STATUS_OPTIONS = SELLER_ORDER_STATUS_TABS;

// Keyed on the STORED lowercase values, and covering all nine. It was keyed
// UPPERCASE and read via `status.toUpperCase()` — the only consumer in the
// codebase doing that — and covered six, so `confirmed`, `return_requested`
// and `returned` all fell through to the neutral default badge.
const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  pending: "default",
  confirmed: "info",
  processing: "warning",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
  return_requested: "warning",
  returned: "danger",
};

const UPDATE_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "— keep current —" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

interface OrderRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  itemCount: number;
  totalAmount: number;
  buyerName: string;
  itemImage?: string;
  itemTitle?: string;
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface EmiInstallmentView {
  index: number;
  dueDate?: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paidAt?: string;
  transactionId?: string;
}

interface OrderDetail {
  id: string;
  status: string;
  totalAmount?: number;
  /*
   * 🛑 The flat legacy spelling of the order total, and the one that is ACTUALLY
   * populated. Measured against the single-order store endpoint on both a seeded order
   * and one placed through real checkout: `totalAmount` came back undefined on
   * both while `totalPrice` carried the real figure. Declared so the fallback
   * below is type-checked rather than reached through a cast.
   */
  totalPrice?: number;
  buyerName?: string;
  /*
   * Either shape. The endpoint returns a pre-formatted STRING for existing
   * orders ("Mock User 3, 123 Stadium Lane, …, India"); the object form is what
   * `OrderDocument` declares. Typed as the union so the string case cannot be
   * destructured by accident again — that is precisely how the drawer came to
   * show no shipping destination at all.
   */
  shippingAddress?: Record<string, JsonValue> | string;
  /*
   * 🛑 These names mirror `OrderDocumentItem` — `productTitle`, `unitPrice`,
   * `totalPrice`. The interface used to say `title` and `price`, which are not
   * fields of that document, so the drawer rendered a product slug at ₹0.00 and
   * tsc could not object: the type it was checked against was the mistake.
   * `title`/`price` are kept optional only so a caller passing the old shape
   * still compiles; nothing produces them.
   */
  items?: Array<{
    productId?: string;
    productTitle?: string;
    image?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    title?: string;
    price?: number;
  }>;
  trackingNumber?: string;
  /*
   * 🛑 `shippingCarrier` is the field `OrderDocument` declares and the one the
   * write path sets. `carrier` is declared only so the fallback reads above
   * type-check; nothing stores it.
   */
  shippingCarrier?: string;
  carrier?: string;
  trackingUrl?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  paymentProofUrl?: string;
  paymentReviewOutcome?: string;
  createdAt?: JsonValue;
  // Fulfilment flags — the seller has to act on all three, not just gift wrap:
  // WhatsApp changes how status updates go out, protection changes how a
  // loss claim is handled.
  whatsappNotifyAddon?: boolean;
  whatsappNotifyFee?: number;
  giftWrapAddon?: boolean;
  giftWrapFee?: number;
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
  shipmentProtectionFee?: number;
  couponCode?: string;
  couponDiscount?: number;
  emiEnabled?: boolean;
  emiTenureMonths?: number;
  emiTokenAmount?: number;
  emiRemainingBalance?: number;
  emiComplete?: boolean;
  emiInstallments?: EmiInstallmentView[];
}

/**
 * Manual-payment state for the seller's read-only badge. Derived from the same
 * two fields the admin queue uses (`paymentProofUrl` + `paymentReviewOutcome`)
 * rather than a denormalised flag, so seller and admin can't disagree about
 * whether an order is waiting on the buyer or on us (Root Cause #42).
 */
function sellerPaymentBadge(order: {
  paymentStatus?: string;
  paymentProofUrl?: string;
  paymentReviewOutcome?: string;
}): { label: string; variant: "success" | "warning" | "danger" | "info" } {
  if (order.paymentStatus === "paid") return { label: "Verified", variant: "success" };
  if (order.paymentReviewOutcome === "rejected_fraud") return { label: "Rejected", variant: "danger" };
  if (order.paymentReviewOutcome === "reupload_requested") return { label: "Re-upload requested", variant: "warning" };
  if (order.paymentProofUrl) return { label: "Awaiting verification", variant: "info" };
  return { label: "Awaiting payment", variant: "warning" };
}

const EMI_INSTALLMENT_BADGE_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

interface SellerOrdersResponse {
  orders?: unknown[];
  meta?: { total: number };
}

export interface SellerOrdersViewProps {
  orderDetailApiBase?: string;
}

/**
 * Fetches + renders one order's full detail content (items, address,
 * payment, EMI, status/tracking update form). Shared by the seller orders
 * list's `OrderDetailDrawer` (SideDrawer chrome) and the standalone
 * `/store/orders/[id]/view` page (full-page chrome) so the two surfaces
 * can't drift — see CLAUDE.md Root Cause Pattern list for the order-detail
 * duplication class of bug this avoids.
 */
export function SellerOrderDetailPanel({
  orderId,
  apiBase,
  onClose,
}: {
  orderId: string;
  apiBase: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SellerOrderUpdateValues>({
    status: "", trackingNumber: "", carrier: "", trackingUrl: "",
  });
  const [markingPaidIndex, setMarkingPaidIndex] = useState<number | null>(null);
  const [emiError, setEmiError] = useState<string | null>(null);
  const { showToast } = useToast();

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<SellerOrderUpdateValues>(sellerOrderUpdateSchema, {
        options: { status: UPDATE_STATUS_OPTIONS },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, draft, { scope: "store:order-update" });
  const form = useFormShellState(sellerOrderUpdateSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`${apiBase}/${orderId}`)
      .then((r) => r.json())
      .then((json) => {
        const o = (json?.data ?? json) as OrderDetail;
        setOrder(o);
        setDraft({
          status: "",
          trackingNumber: o.trackingNumber ?? "",
          /*
           * 🛑 `shippingCarrier` is the stored field. `OrderDocument` declares
           * it at line ~422 and declares no `carrier` at all.
           *
           * The WRITE below already gets this right (`payload.shippingCarrier`),
           * so the carrier has been persisting correctly all along — verified
           * against the live endpoint after shipping an order: `shippingCarrier:
           * "QA Carrier"`, `carrier: undefined`. Only the read-back was wrong, so
           * reopening a shipped order showed an EMPTY Carrier box next to a
           * populated tracking number. A seller would reasonably retype it, and
           * the diff-against-loaded-state payload means retyping the same value
           * would then look like no change at all.
           *
           * Not a lost write — a field the form could not see.
           */
          carrier: o.shippingCarrier ?? o.carrier ?? "",
          trackingUrl: o.trackingUrl ?? "",
        });
      })
      .catch(() => setFetchError("Failed to load order details"))
      .finally(() => setLoading(false));
  }, [orderId, apiBase]);

  const handleMarkInstallmentPaid = async (installmentIndex: number) => {
    setMarkingPaidIndex(installmentIndex);
    setEmiError(null);
    try {
      const res = await fetch(`${apiBase}/${orderId}/emi-installment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentIndex }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string })?.error ?? "Failed to mark installment paid");
      setOrder((json as { data?: OrderDetail })?.data ?? (json as OrderDetail));
      showToast("Installment marked paid.", "success");
    } catch (err) {
      void normalizeError(err);
      const message = err instanceof Error ? err.message : "Failed to mark installment paid.";
      setEmiError(message);
      showToast(message, "error");
    } finally {
      setMarkingPaidIndex(null);
    }
  };

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    setSaveError(null);
    try {
      const v = visibleValues(sellerOrderUpdateSchema, draft) as SellerOrderUpdateValues;
      const payload: Record<string, JsonValue> = {};
      // A DIFF, not a snapshot: the panel writes only what the seller changed,
      // so re-saving an untouched field cannot clobber a value another path
      // (the shipping provider, a support agent) has since written.
      if (v.status) payload.status = v.status;
      if ((v.trackingNumber ?? "") !== (order.trackingNumber ?? "")) payload.trackingNumber = v.trackingNumber ?? "";
      if ((v.carrier ?? "") !== (order.carrier ?? "")) payload.shippingCarrier = v.carrier ?? "";
      if ((v.trackingUrl ?? "") !== (order.trackingUrl ?? "")) payload.trackingUrl = v.trackingUrl ?? "";

      if (Object.keys(payload).length === 0) { onClose(); return; }

      const res = await fetch(`${apiBase}/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error ?? "Failed to update order");
      }
      const updated = await res.json();
      const next = (updated?.data ?? updated) as OrderDetail;
      setOrder(next);
      // Reset to "keep current" and re-seed the shipment fields from what the
      // server actually stored, so the next diff is against the saved state.
      setDraft({
        status: "",
        trackingNumber: next.trackingNumber ?? "",
        // Same stored-field name as the initial load above — this re-seed is
        // explicitly "against the saved state", so reading the wrong field here
        // makes every subsequent diff think the carrier had been cleared.
        carrier: next.shippingCarrier ?? next.carrier ?? "",
        trackingUrl: next.trackingUrl ?? "",
      });
    } catch (err) {
      void normalizeError(err);
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /*
   * 🛑 `shippingAddress` is sometimes a STRING, and destructuring one yields
   * nothing but silence.
   *
   * Measured on both a seeded order and one placed through real checkout,
   * the single-order store endpoint returns it pre-formatted:
   *
   *     "Mock User 3, 123 Stadium Lane, Vijay Nagar, Indore, Madhya Pradesh, 452010, India"
   *
   * Reading `.addressLine1` / `.city` / `.state` / `.pincode` off a string gives
   * four undefineds, `filter(Boolean)` drops them all, and `addrLine` became "".
   * The block below renders only when `addrLine` is truthy — so the seller was
   * shown NO shipping destination at all for an order they are expected to post,
   * with no error and no empty state. (`Object.keys()` on it returns "0".."80",
   * which is the tell: those are string indices, not fields.)
   *
   * Handle both shapes rather than picking one: the object form is what the
   * schema declares and what newer writes produce, and a seller needs the
   * address either way.
   */
  const rawAddr = order?.shippingAddress;
  const addr = (typeof rawAddr === "object" && rawAddr !== null ? rawAddr : {}) as Record<string, JsonValue>;
  const addrLine =
    typeof rawAddr === "string" && rawAddr.trim()
      ? rawAddr.trim()
      : [addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");

  return (
    <>
      {loading && (
        <Row align="center" justify="center" padding="y-4xl">
          <Div className="h-6 w-6 animate-spin border-2 border-[var(--appkit-color-primary)] border-t-transparent" rounded="full" />
        </Row>
      )}

      {fetchError && (
        <Div textSize="sm" className="mx-4 mt-4 border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="lg">
          {fetchError}
        </Div>
      )}

      {order && !loading && (
        <Stack gap="none">
          <Stack className={`flex-1 ${__O.yAuto}`} gap="5" padding="md">
            <Row align="center" justify="between">
              <Badge variant={STATUS_BADGE_VARIANT[order.status ?? ""] ?? "default"}>
                {order.status ?? "Unknown"}
              </Badge>
              <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                {toRelativeDate(order.createdAt)}
              </Text>
            </Row>

            {(order.items ?? []).length > 0 && (
              <Div>
                <Text size="sm" className="text-[var(--appkit-color-text-primary)] mb-2" weight="semibold">Items</Text>
                <Div className="divide-y divide-[var(--appkit-color-border)] divide-[var(--appkit-color-border)] border border-[var(--appkit-color-border)]" rounded="lg">
                  {(order.items ?? []).map((item, i) => (
                    <Row key={i} paddingY="y-xs-tall" padding="x-sm" align="center" justify="between" gap="3">
                      <Row align="center" gap="sm" className="min-w-0">
                        <Div className="h-10 w-10 shrink-0" rounded="md" overflow="hidden">
                          <MediaImage src={item.image} alt={item.title ?? "Order item"} size="thumbnail" />
                        </Div>
                        <Div className="min-w-0">
                          {/*
                            🛑 `productTitle` and `totalPrice` — NOT `title` and
                            `price`, which are not fields of `OrderDocumentItem`.

                            It read `item.title ?? item.productId` and
                            `item.price ?? 0`, so every line in this drawer showed
                            the buyer a product SLUG priced at ₹0.00 —
                            "product-beyblade-original-dranzer-s · Qty: 1 · ₹0.00".
                            The data was there the whole time: the same response
                            carries `productTitle: "Beyblade Original — Dranzer S"`
                            and `totalPrice: 977.92`. Both wrong names came from a
                            loosely-typed `order`, so tsc could not see them
                            (Root Cause #45).

                            `totalPrice` is the LINE total, which is what a
                            single figure at the end of the row means; `unitPrice`
                            here would understate any line with quantity > 1.
                          */}
                          <Text size="sm" className="truncate" weight="medium">{item.productTitle ?? item.title ?? item.productId ?? "Item"}</Text>
                          <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">Qty: {item.quantity ?? 1}</Text>
                        </Div>
                      </Row>
                      <Text size="sm" className="shrink-0" weight="medium">{toCurrency(item.totalPrice ?? item.unitPrice ?? item.price ?? 0)}</Text>
                    </Row>
                  ))}
                </Div>
              </Div>
            )}

            {/* Every add-on the buyer paid for, plus any coupon — was a
                gift-wrap-only block, so a seller had no way to see that a buyer
                had bought WhatsApp updates or shipment protection. */}
            <OrderAddonBadges order={order} variant="detail" />

            {order.giftWrapAddon && (
              <Div className="border border-[var(--appkit-color-primary-200)] dark:border-[var(--appkit-color-primary-800)]" surface="subtle" padding="inline" rounded="lg">
                <Text size="sm" weight="semibold">🎁 Gift wrap requested</Text>
                {order.giftWrapMessage && (
                  <Text size="sm" className="mt-1 text-[var(--appkit-color-text-secondary)]">
                    &ldquo;{order.giftWrapMessage}&rdquo;
                  </Text>
                )}
              </Div>
            )}

            <Row surface="muted" padding="inline" align="center" justify="between" rounded="lg">
              <Text size="sm" weight="semibold">Total</Text>
              {/*
                🛑 Fall back to `totalPrice`. Measured against the live endpoint,
                `totalAmount` is UNDEFINED on every order the single-order store endpoint
                serves — both a seeded one and one placed through real checkout —
                while `totalPrice` carries the real figure (997.8 = 899 item + 77
                shipping + 10 platform + 10 WhatsApp). So `order.totalAmount ?? 0`
                rendered a confident **₹0.00** as the order total on every single
                order in the seller's drawer.

                Reading both names is the fix that is certain here. Why the stored
                documents use `totalPrice` when `OrderDocument` declares
                `totalAmount` is a schema-vs-data divergence spanning the order
                write paths — recorded in docs/TEST-RUN-3-OUTOFSCOPE.md rather
                than guessed at from one drawer.
              */}
              <Text size="sm" className="text-[var(--appkit-color-primary)]" weight="bold">{toCurrency(order.totalAmount ?? order.totalPrice ?? 0)}</Text>
            </Row>

            {addrLine && (
              <Div>
                <Text size="sm" className="mb-1" weight="semibold">Shipping address</Text>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)]">
                  {[String(addr.fullName ?? ""), addrLine].filter(Boolean).join(" · ")}
                </Text>
              </Div>
            )}

            {order.paymentMethod && (
              <Div>
                <Row align="center" justify="between" className="mb-1" gap="3">
                  <Text size="sm" weight="semibold">Payment</Text>
                  {isManualPaymentMethod(order.paymentMethod) && (
                    <Badge variant={sellerPaymentBadge(order).variant}>{sellerPaymentBadge(order).label}</Badge>
                  )}
                </Row>
                <Text size="sm" className="text-[var(--appkit-color-text-secondary)]" transform="capitalize">{order.paymentMethod}</Text>
                {/* Read-only for sellers: verifying / rejecting a manual payment
                    is admin+moderator only (`adminVerifyPaymentAction`). The
                    buyer's payment screenshot itself is deliberately not shown
                    here — it's a bank/UPI capture, and the seller only needs
                    to know whether the money landed. */}
                {isManualPaymentMethod(order.paymentMethod) && order.paymentTransactionId && (
                  <Text size="xs" color="muted" className="mt-1">UTR: {order.paymentTransactionId}</Text>
                )}
              </Div>
            )}

            {order.emiEnabled && (
              <Div className="border-t border-[var(--appkit-color-border)]" padding="t-md">
                <Row align="center" justify="between" className="mb-2">
                  <Text size="sm" weight="semibold">
                    EMI plan {order.emiTenureMonths ? `· ${order.emiTenureMonths} months` : ""}
                  </Text>
                  <Badge variant={order.emiComplete ? "success" : "warning"}>
                    {order.emiComplete ? "Fully paid" : "In progress"}
                  </Badge>
                </Row>
                <Row align="center" justify="between" className="mb-2">
                  <Text size="xs" color="muted">Token collected</Text>
                  <Text size="xs" weight="medium">{toCurrency(order.emiTokenAmount ?? 0)}</Text>
                </Row>
                <Row align="center" justify="between" className="mb-3">
                  <Text size="xs" color="muted">Remaining balance</Text>
                  <Text size="xs" weight="medium">{toCurrency(order.emiRemainingBalance ?? 0)}</Text>
                </Row>
                <Div className="divide-y divide-[var(--appkit-color-border)] border border-[var(--appkit-color-border)]" rounded="lg">
                  {(order.emiInstallments ?? []).map((inst) => (
                    <Row key={inst.index} paddingY="y-xs-tall" padding="x-sm" align="center" justify="between" gap="3">
                      <Div className="min-w-0">
                        <Text size="sm" weight="medium">
                          Installment {inst.index} · {toCurrency(inst.amount)}
                        </Text>
                        <Text size="xs" color="muted">
                          {inst.status === "paid" && inst.paidAt
                            ? `Paid ${toRelativeDate(inst.paidAt)}`
                            : inst.dueDate
                              ? `Due ${toRelativeDate(inst.dueDate)}`
                              : ""}
                        </Text>
                      </Div>
                      <Row align="center" gap="sm" className="shrink-0">
                        <Badge variant={EMI_INSTALLMENT_BADGE_VARIANT[inst.status] ?? "default"}>{inst.status}</Badge>
                        {inst.status !== "paid" && (
                          <Button
                            action={ACTIONS.STORE["mark-installment-paid"]}
                            size="sm"
                            variant="outline"
                            isLoading={markingPaidIndex === inst.index}
                            disabled={markingPaidIndex !== null}
                            onClick={() => handleMarkInstallmentPaid(inst.index)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </Row>
                    </Row>
                  ))}
                </Div>
                {emiError && (
                  <Div textSize="xs" className="mt-2 border border-error/20" color="error" surface="danger-surface" padding="inlineSm" rounded="lg">
                    {emiError}
                  </Div>
                )}
              </Div>
            )}

            <Stack className="border-t border-[var(--appkit-color-border)]" padding="t-md" gap="3">
              <FormShellContext.Provider value={form.shellCtx}>
                <FormErrorSummary />
                <SectionForm<SellerOrderUpdateValues>
                  sections={sections}
                  values={draft}
                  onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
                  onSubmit={() => {
                    // SectionForm scrolls to the first erroring section and then
                    // submits regardless, so the guard lives here.
                    form.clearErrors();
                    const parsed = sellerOrderUpdateSchema.safeParse(
                      visibleValues(sellerOrderUpdateSchema, draft),
                    );
                    if (!parsed.success) {
                      applyZodIssues(parsed.error.issues, form.setFieldError);
                      return;
                    }
                    void handleSave();
                  }}
                  onValidationChange={() => form.validate(draft)}
                  schema={sellerOrderUpdateSchema}
                  openIds={nav.openIds}
                  onOpenChange={nav.setOpenIds}
                  submitLabel="Save"
                  cancelLabel="Close"
                  onCancel={onClose}
                  isLoading={saving}
                />
              </FormShellContext.Provider>
              {saveError && (
                <Div textSize="xs" className="border border-error/20" color="error" surface="danger-surface" padding="inlineSm" rounded="lg">
                  {saveError}
                </Div>
              )}
            </Stack>
          </Stack>
          <Row border="top" paddingY="y-sm-tall" padding="x-md" align="center" justify="end" gap="3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
            <Button onClick={handleSave} isLoading={saving} disabled={saving}>Save</Button>
          </Row>
        </Stack>
      )}
    </>
  );
}

function OrderDetailDrawer({
  orderId,
  apiBase,
  onClose,
}: {
  orderId: string;
  apiBase: string;
  onClose: () => void;
}) {
  return (
    <SideDrawer isOpen title={`Order ${orderId}`} onClose={onClose}>
      <SellerOrderDetailPanel orderId={orderId} apiBase={apiBase} onClose={onClose} />
    </SideDrawer>
  );
}

export function SellerOrdersView({
  orderDetailApiBase = SELLER_ENDPOINTS.ORDERS,
}: SellerOrdersViewProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [setLocationOpen, setSetLocationOpen] = useState(false);
  const [shippingRowId, setShippingRowId] = useState<string | null>(null);
  const dispatch = useActionDispatch();
  const { showToast } = useToast();

  const handleQuickShip = useCallback(async (row: OrderRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setShippingRowId(row.id);
    try {
      const res = await fetch(`${orderDetailApiBase}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shipped" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to mark order shipped");
      }
      showToast("Order marked shipped.", "success");
      setSelectedOrderId(null);
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to mark order shipped.", "error");
    } finally {
      setShippingRowId(null);
    }
  }, [orderDetailApiBase, showToast]);

  const handleSetLocation = useCallback(async (loc: PhysicalLocation, ids: string[]) => {
    try {
      const res = await fetch(SELLER_ENDPOINTS.ORDERS_BULK_LOCATION, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids, physicalLocation: loc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to update location");
      }
      showToast("Location updated.", "success");
      setSetLocationOpen(false);
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to update location.", "error");
    }
  }, [showToast]);

  const requestPayoutForSelection = useCallback(async (selection: ListingSelectionContext<OrderRow>) => {
    if (!selection.selectedIds.length) return;
    try {
      const res = await fetch(SELLER_ENDPOINTS.PAYOUT_REQUEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selection.selectedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to request payout");
      }
      showToast("Payout requested.", "success");
      selection.clearSelection();
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to request payout.", "error");
    }
  }, [showToast]);

  const [selectedIdsForLocation, setSelectedIdsForLocation] = useState<string[]>([]);

  const columns: AdminTableColumn<OrderRow>[] = [
    {
      key: "primary",
      header: "Order",
      render: (row) => (
        <Row gap="sm" align="center" className="min-w-0">
          <Div className="h-10 w-10 shrink-0" rounded="md" overflow="hidden">
            <MediaImage src={row.itemImage} alt={row.itemTitle ?? "Order item"} size="thumbnail" />
          </Div>
          <Stack gap="none" className="min-w-0">
            <Text className="truncate" size="sm" weight="semibold">
              {row.itemTitle
                ? `${row.itemTitle}${row.itemCount > 1 ? ` +${row.itemCount - 1} more` : ""}`
                : row.primary}
            </Text>
            <Text size="xs" color="muted">{row.buyerName} · {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}</Text>
          </Stack>
        </Row>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      className: "w-28",
      render: (row) => <Span size="sm" weight="semibold">{toCurrency(row.totalAmount)}</Span>,
    },
    {
      key: "status",
      header: "Status",
      className: "w-32",
      render: (row) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status ?? ""] ?? "default"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "physicalLocation",
      header: "Staging",
      className: "w-28",
      render: (row) =>
        row.physicalLocation ? (
          <Span size="xs" className="font-mono" color="muted">
            {row.physicalLocation.zone}/{row.physicalLocation.shelf}/{row.physicalLocation.bin}
          </Span>
        ) : (
          <Span size="xs" color="muted">—</Span>
        ),
    },
    {
      key: "updatedAt",
      header: "Date",
      className: "w-28",
      render: (row) => <Span size="xs" color="muted">{row.updatedAt}</Span>,
    },
  ];

  const orderScope = useOrderScope();


  const config: ListingViewConfig<SellerOrdersResponse, OrderRow> = {
    portal: "seller",
    title: "Orders",
    // buildOrderSearchTxt indexes productTitle, storeName and trackingNumber.
    // It does NOT index the buyer's name, email or address — those are PII,
    // and the placeholder must not promise a match it will never make.
    // buildOrderSearchTxt indexes productTitle, storeName and trackingNumber.
    // NOT the buyer's name, email or address — those are PII (D1).
    search: {
      placeholder: "Search by product, store or tracking number…",
      mode: "partial",
      fields: ["productTitle", "storeName", "trackingNumber"],
      commit: "debounce",
    },
    emptyLabel: "No orders yet",
    filterKeys: ["status"],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "orders", "listing"],
    endpoint: SELLER_ENDPOINTS.ORDERS,
    sortOptions: SORT_OPTIONS,
    columns,
    mapRows: (response) =>
      toRecordArray(response.orders).map((item, index) => {
        const itemsArr = Array.isArray(item.items) ? (item.items as unknown[]) : [];
        /*
         * Same legacy fallback as AdminOrdersView: `items[]` is canonical and
         * every real checkout writes it, but older documents carry
         * `productTitle` at the top level instead, and reading only `items[]`
         * leaves the row with no title or thumbnail at all.
         */
        const firstItem =
          itemsArr[0] && typeof itemsArr[0] === "object"
            ? (itemsArr[0] as Record<string, unknown>)
            : typeof item.productTitle === "string" && item.productTitle
              ? { productTitle: item.productTitle, image: item.image }
              : {};
        const loc = item.physicalLocation as { zone?: string; shelf?: string; bin?: string } | undefined;
        return {
          id: toStringValue(item.id, `order-${index}`),
          /*
           * 🛑 The row says WHAT WAS SOLD, not the id repeated.
           *
           * This was `Order ${id.slice(0, 14)}` — a raw id, truncated
           * mid-date, so two different orders rendered identically. The title
           * was available the whole time: `items[0].productTitle` is
           * denormalised onto every order precisely so a list never needs a
           * second fetch (Root Cause #52), and it is already read three lines
           * below as `itemTitle`.
           */
          primary: (() => {
            const title =
              typeof firstItem.productTitle === "string" ? firstItem.productTitle : "";
            if (!title) return `Order ${toStringValue(item.id, "-")}`;
            const extra = itemsArr.length - 1;
            return extra > 0 ? `${title} +${extra} more` : title;
          })(),
          /*
           * `userName` / `totalPrice` are the document's real field names.
           * `buyerName`/`buyerDisplayName`/`totalAmount`/`total` are four
           * spellings the order document has never carried, so every seller's
           * order list showed "Unknown buyer" and ₹0 — see AdminOrdersView for
           * the full writeup. They are removed rather than demoted: nothing
           * declares them and nothing emits them.
           */
          secondary: toStringValue(item.userName, "Unknown buyer"),
          status: toStringValue(item.status, "PENDING"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.orderDate ?? item.createdAt),
          itemCount: itemsArr.length,
          totalAmount: Number(item.totalPrice ?? 0),
          buyerName: toStringValue(item.userName, "Unknown buyer"),
          itemImage: typeof firstItem.image === "string" ? firstItem.image : undefined,
          itemTitle: typeof firstItem.productTitle === "string" ? firstItem.productTitle : undefined,
          physicalLocation:
            loc && typeof loc.zone === "string"
              ? { zone: loc.zone, shelf: loc.shelf ?? "", bin: loc.bin ?? "" }
              : undefined,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    // The scope narrows; the status chip drills down inside it. Both are
    // emitted — an explicit status always wins, since picking "Delivered"
    // while sitting on Active should show delivered orders, not nothing.
    buildFilters: (state) => (state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined),
    buildExtraParams: () => orderScope.extraParams,
    renderAboveContent: orderScope.renderAboveContent,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={STATUS_OPTIONS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
    buildBulkActions: (selection) => {
      const handlePrintPackingSlips = () => {
        const ids = selection.selectedIds.join(",");
        void dispatch({
          type: "NAVIGATE",
          href: `${String(ROUTES.STORE.PRINT_CENTER)}?type=order&ids=${ids}&autoprint=1`,
        });
      };
      return [
        buildBulkAction(ACTIONS.STORE["print-packing-slips"], handlePrintPackingSlips, { icon: <Printer className="w-4 h-4" /> }),
        buildBulkAction(ACTIONS.STORE["set-location"], () => { setSelectedIdsForLocation(selection.selectedIds); setSetLocationOpen(true); }, { icon: <MapPin className="w-4 h-4" /> }),
        buildBulkAction(ACTIONS.STORE["request-payout"], () => void requestPayoutForSelection(selection), { variant: "primary" }),
      ] as BulkActionItem[];
    },
    renderRowActions: (row) => {
      // Compared against the stored lowercase values, like every other
      // consumer — the uppercase form here was a local convention that only
      // worked because of the `.toUpperCase()` alongside it.
      const isShippable = ([
        OrderStatusValues.PENDING,
        OrderStatusValues.PROCESSING,
        OrderStatusValues.CONFIRMED,
      ] as string[]).includes(row.status ?? "");
      return (
        <Row align="center" gap="xs">
          {isShippable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => void handleQuickShip(row, e)}
              aria-label="Mark as shipped"
              title="Mark shipped"
              isLoading={shippingRowId === row.id}
              disabled={shippingRowId !== null}
            >
              <Truck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setSelectedOrderId(row.id); }}
            title="View order details"
            aria-label="View order details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void dispatch({ type: "NAVIGATE", href: String(ROUTES.STORE.ORDER_DETAIL(row.id)) });
            }}
            title="Open full page"
            aria-label="Open full page"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Row>
      );
    },
  };

  return (
    <>
      <DataListingView config={config} />

      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          apiBase={orderDetailApiBase}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {setLocationOpen && (
        <PhysicalLocationModal
          count={selectedIdsForLocation.length}
          onSave={(loc) => handleSetLocation(loc, selectedIdsForLocation)}
          onClose={() => setSetLocationOpen(false)}
        />
      )}
    </>
  );
}
