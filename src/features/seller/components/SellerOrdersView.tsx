"use client";
import { formatPhysicalLocation } from "../../../utils/physical-location";
import { OrderAddonBadges } from "../../orders/components/OrderAddonBadges";
import { OrderProvenanceCard } from "../../orders/components/OrderProvenanceCard";
import { groupOrderItemsByLine } from "../../orders/utils/bundle-grouping";
import type { OrderSourceContext } from "../../orders/schemas/firestore";
import { normalizeError } from "../../../errors/normalize";
import { formatCurrency } from "../../../utils/number.formatter";
// The defining module, not a barrel (Root Cause #18). Maps a server error CODE
// to user-facing copy; it can never return server text, which is the point.
import { toUserMessage } from "../../../errors/error-display-map";
import type { JsonValue } from "@mohasinac/appkit/client";

import { Row, SIEVE_OP, sieveFilter } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { Eye, ExternalLink, Printer, MapPin, Truck } from "lucide-react";
import { useActionDispatch } from "../../../react/hooks/use-action-dispatch";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

import { Badge } from "../../../ui/components/Badge";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import { SideDrawer } from "../../../ui/components/SideDrawer";
import { Span, Text } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
import { useToast } from "../../../ui/components/toast-context";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import type { SelectOption } from "../../../ui/components/Select";
import { SELLER_ORDER_STATUS_TABS } from "../../admin/constants/filter-tabs";
import { useOrderScope } from "../../orders/components/OrderScopeTabs";
import { ORDER_LANE_TABS } from "../../orders/constants/order-lane-tabs";
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
import { DispatchForm } from "./DispatchForm";
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

/*
 * The hairline that separates each panel section inside the order drawer.
 * Named because the drawer gained its fourth section with D55's balance
 * collector, and four copies of one border declaration is four places a
 * future token rename has to find.
 */
const SECTION_DIVIDER = "border-t border-[var(--appkit-color-border)]";

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
    /*
     * The collapse keys. A bundle or buyer-assembled group fans out into N
     * item rows sharing a `groupSlug` so each can carry its own HSN/GST and be
     * cancelled independently — correct for tax and refunds, and wrong to show
     * raw to the person packing the parcel, who sees four unrelated-looking
     * lines for one thing the buyer agreed as a unit.
     *
     * They arrive already: the route's allow-list filters TOP-LEVEL order keys
     * and passes `items` through whole, so everything inside each element
     * comes with it.
     */
    groupSlug?: string;
    groupTitle?: string;
    bundleCategorySlug?: string;
    bundleProductIds?: string[];
  }>;
  /*
   * How the buyer earned this price. Both of these are already in
   * `SELLER_ORDER_FIELDS` on `GET /api/store/orders/[id]` (route.ts:108,111),
   * so the data has always arrived — it was the local type and the render that
   * were missing, which is why the seller could not see an agreed offer price
   * on an order they had themselves accepted.
   *
   * 🛑 Dates inside it arrive as ISO STRINGS, not Dates: the allow-list
   * serialiser passes the value through `JSON`, so `acceptedAt` is a string
   * here while `OrderSourceOfferAccepted` declares a `Date`. The card's own
   * `dateText` normalises string | number | Date | Timestamp for exactly this
   * reason, so the declared type stays honest about intent and the renderer
   * copes with the wire shape.
   */
  sourceContext?: OrderSourceContext;
  currency?: string;
  trackingNumber?: string;
  /*
   * 🛑 `shippingCarrier` is the field `OrderDocument` declares and the one the
   * write path sets. `carrier` is declared only so the fallback reads above
   * type-check; nothing stores it.
   */
  shippingCarrier?: string;
  carrier?: string;
  trackingUrl?: string;
  /** Set by `bookShipment`; distinguishes "we booked it" from "you posted it". */
  platformBookedShipment?: boolean;
  /*
   * D55 — the pre-order balance, once OPENED for collection.
   *
   * 🛑 The seller's copy is deliberately narrower than the stored block:
   * `GET /api/store/orders/[id]` rebuilds it without `proofUrl` (the buyer's
   * bank screenshot) or `reviewedBy` (a staff uid), matching the deposit's
   * rule that a seller sees the reference and the state while the screenshot
   * is admin-only. Declaring the narrow shape here is what makes a later
   * `order.balance.proofUrl` a compile error rather than a blank image.
   */
  balance?: {
    amount: number;
    status: "awaiting" | "submitted" | "paid" | "rejected";
    dueBy?: JsonValue;
    transactionId?: string;
    submittedAt?: JsonValue;
  };
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

type SellerOrderItem = NonNullable<OrderDetail["items"]>[number];

/**
 * One item row. Extracted verbatim when grouping landed so the single and
 * grouped paths cannot render differently — two copies of this markup is how
 * the field-name bug below would come back on one path only.
 */
function sellerOrderItemRow(item: SellerOrderItem, key: string) {
  return (
    <Row key={key} paddingY="y-xs-tall" padding="x-sm" align="center" justify="between" gap="3">
      <Row align="center" gap="sm" className="min-w-0">
        <Div className="h-10 w-10 shrink-0" rounded="md" overflow="hidden">
          <MediaImage src={item.image} alt={item.title ?? "Order item"} size="thumbnail" />
        </Div>
        <Div className="min-w-0">
          {/*
            🛑 `productTitle` and `totalPrice` — NOT `title` and `price`, which
            are not fields of `OrderDocumentItem`.

            It read `item.title ?? item.productId` and `item.price ?? 0`, so
            every line in this drawer showed the buyer a product SLUG priced at
            ₹0.00 — "product-beyblade-original-dranzer-s · Qty: 1 · ₹0.00". The
            data was there the whole time: the same response carries
            `productTitle: "Beyblade Original — Dranzer S"` and
            `totalPrice: 977.92`. Both wrong names came from a loosely-typed
            `order`, so tsc could not see them (Root Cause #45).

            `totalPrice` is the LINE total, which is what a single figure at the
            end of the row means; `unitPrice` here would understate any line
            with quantity > 1.
          */}
          <Text size="sm" className="truncate" weight="medium">
            {item.productTitle ?? item.title ?? item.productId ?? "Item"}
          </Text>
          <Text size="xs" className="text-[var(--appkit-color-text-muted)]">
            Qty: {item.quantity ?? 1}
          </Text>
        </Div>
      </Row>
      <Text size="sm" className="shrink-0" weight="medium">
        {toCurrency(item.totalPrice ?? item.unitPrice ?? item.price ?? 0)}
      </Text>
    </Row>
  );
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
  items?: unknown[];
  meta?: { total: number };
}

export interface SellerOrdersViewProps {
  orderDetailApiBase?: string;
}

/**
 * D55 — the seller's half of the pre-order balance.
 *
 * ## 🛑 Opening is an EVENT, and the control has to say so
 *
 * The balance has existed on the order since checkout. What the seller is
 * declaring here is that the GOODS HAVE ARRIVED — a pre-order's premise is
 * that the item does not exist yet, so asking for the balance before then is
 * asking a buyer to fund inventory. The button's label and its blurb both
 * name that, rather than saying "request payment", which would read as a
 * nudge the seller could send at any time.
 *
 * ## Why no Cancel and no confirm dialog
 *
 * Opening takes money NOWHERE and reverses by simply not chasing it — the
 * worst case is a buyer told a week early. A confirmation step on a
 * non-destructive, idempotent action is the dialog people learn to click
 * through, which is what makes the ones on real deletions worthless.
 *
 * ## The states are the seller's, not the buyer's
 *
 * Once opened the seller cannot act again, so every later state is read-only
 * here: "with the buyer", "proof submitted, we are checking it", "paid". The
 * verification is staff-only and deliberately NOT offered — a seller
 * approving payment to themselves is not a review.
 */
function SellerBalanceBlock({
  orderId,
  apiBase,
  balance,
  balanceDue,
  currency,
  onOpened,
}: {
  orderId: string;
  apiBase: string;
  balance?: OrderDetail["balance"];
  balanceDue: number;
  currency?: string;
  onOpened: () => void;
}) {
  const [opening, setOpening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (balance) {
    const label =
      balance.status === "paid"
        ? "Balance paid"
        : balance.status === "submitted"
          ? "Balance proof under review"
          : balance.status === "rejected"
            ? "Balance proof rejected — the buyer has been asked to resend"
            : "Balance open — awaiting the buyer";
    return (
      <Div>
        <Text size="sm" weight="semibold" color="primary">Pre-order balance</Text>
        <Text className="mt-1" color="muted" size="xs">
          {formatCurrency(balance.amount, currency)} — {label}
          {balance.transactionId ? ` · Ref ${balance.transactionId}` : ""}
        </Text>
      </Div>
    );
  }

  const handleOpen = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${orderId}/open-balance`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not open the balance. Try again, or contact support if it persists.");
        return;
      }
      onOpened();
    } catch (err: unknown) {
      void normalizeError(err);
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Div>
      <Text size="sm" weight="semibold" color="primary">Pre-order balance</Text>
      <Text className="mt-1" color="muted" size="xs">
        {formatCurrency(balanceDue, currency)} is still owed on this order. Open
        it once the stock is physically with you — the buyer is notified and
        gets a week to pay, and the parcel ships when it clears.
      </Text>
      <Row className="mt-2" gap="3">
        <Button variant="primary" size="sm" disabled={opening} onClick={handleOpen}>
          {opening ? "Opening…" : "Stock has arrived — open balance"}
        </Button>
      </Row>
      {error && (
        <Div textSize="xs" className="mt-2 border border-error/20" color="error" surface="danger-surface" padding="inlineSm" rounded="lg">
          {error}
        </Div>
      )}
    </Div>
  );
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
        const d = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          issues?: { path: (string | number)[]; message: string }[];
        };

        /*
         * 🛑 FIELD ERRORS GO ON THE FIELD. The server already sends them.
         *
         * `mapToHttpError` answers a rejected body with
         * `{ status: 400, code: VALIDATION_FAILED, message: "Validation
         * failed", issues }` — the per-field detail is ON THE WIRE. This
         * handler used to throw `d.error` and render it in the banner below,
         * so the seller saw a bare "Validation failed" with nothing marked and
         * no way to tell WHICH field was wrong. Rule #9 §6.
         *
         * `applyZodIssues` keys by the full dotted path, so a nested field
         * lands on itself rather than collapsing onto `issue.path[0]`.
         */
        if (Array.isArray(d.issues) && d.issues.length > 0) {
          applyZodIssues(d.issues, form.setFieldError);
          return;
        }

        /*
         * 🛑 NEVER the server's own message, and this is not hypothetical.
         * `d.error` is server text; rendering it is how a Node
         * `MODULE_NOT_FOUND` with a `/var/task/.next/...` require stack was
         * once shown inside a buyer's "Place your bid" modal (Root Cause #86).
         * `toUserMessage` resolves through `errors.codes.*`, terminates at
         * UNKNOWN, and cannot return server internals.
         */
        throw new Error(toUserMessage(d.code));
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
      /*
       * `normalizeError`'s RESULT, not an `as Error` cast. The cast asserted a
       * shape nothing checked, and the only reason it happened to work is that
       * every throw above is one we construct — a rejected promise from `fetch`
       * or a JSON parse failure is not an `Error` by that assertion's logic,
       * it just happens to be one at runtime.
       *
       * What reaches the banner is now bounded: either `toUserMessage(code)`
       * from the throw above (mapped copy, never server text) or a browser-level
       * network message. Field-level problems never get here at all — they were
       * routed to the fields by `applyZodIssues`.
       */
      setSaveError(normalizeError(err).message);
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
              <Text size="sm" className="text-[var(--appkit-color-text-muted)]">
                {toRelativeDate(order.createdAt)}
              </Text>
            </Row>

            {/*
              Above the items on purpose: the seller needs to know this was an
              accepted offer or a won collector drop BEFORE reading what is in the
              parcel, because it is the thing that explains a price that does
              not match the listing. Renders nothing on an ordinary order.
            */}
            <OrderProvenanceCard
              sourceContext={order.sourceContext}
              currency={order.currency}
            />

            {(order.items ?? []).length > 0 && (
              <Div>
                <Text size="sm" className="text-[var(--appkit-color-text)] mb-2" weight="semibold">Items</Text>
                <Div className="divide-y divide-[var(--appkit-color-border)] divide-[var(--appkit-color-border)] border border-[var(--appkit-color-border)]" rounded="lg">
                  {/*
                    Collapsed by `groupOrderItemsByLine` — the SAME helper the
                    buyer's receipt uses. It had exactly one caller
                    (user/orders/[id]/page.tsx) while the seller and admin saw
                    the raw per-member fan-out, so one grouped purchase read as
                    N unrelated lines to the only people who have to pick and
                    pack it.
                  */}
                  {groupOrderItemsByLine(order.items ?? []).map((group, gi) =>
                    group.kind === "single" ? (
                      sellerOrderItemRow(group.item, `s-${group.index}`)
                    ) : (
                      <Div key={`g-${gi}`}>
                        <Row
                          paddingY="y-xs"
                          padding="x-sm"
                          align="center"
                          gap="sm"
                          surface="muted"
                        >
                          <Text size="xs" weight="semibold">
                            {group.groupTitle ?? "Grouped purchase"}
                          </Text>
                          <Text size="xs" className="text-[var(--appkit-color-text-muted)]">
                            {`${group.memberCount} ${group.memberCount === 1 ? "item" : "items"} · one line`}
                          </Text>
                        </Row>
                        <Div paddingX="l-md">
                          {group.items.map(({ item, index }) =>
                            sellerOrderItemRow(item, `m-${index}`),
                          )}
                        </Div>
                      </Div>
                    ),
                  )}
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
                  <Text size="sm" className="mt-1 text-[var(--appkit-color-text-muted)]">
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
                <Text size="sm" className="text-[var(--appkit-color-text-muted)]">
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
                <Text size="sm" className="text-[var(--appkit-color-text-muted)]" transform="capitalize">{order.paymentMethod}</Text>
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
              <Div className={SECTION_DIVIDER} padding="t-md">
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

            {/*
              D55 — the pre-order balance.

              Rendered only when the order HAS one: `sourceContext.path` is
              `pre-order` with a non-zero `balanceDue`. On every other order
              there is nothing to open and the block is absent rather than
              disabled — a greyed control the seller can never use is noise
              on 95% of orders.

              Sits above dispatch because that is the sequence: the balance
              has to be collected before the parcel goes out, which is the
              whole reason a pre-order splits its payment in two.
            */}
            {order.sourceContext?.path === "pre-order" &&
              order.sourceContext.balanceDue > 0 && (
                <Stack className={SECTION_DIVIDER} padding="t-md" gap="3">
                  <SellerBalanceBlock
                    orderId={orderId}
                    apiBase={apiBase}
                    balance={order.balance}
                    balanceDue={order.sourceContext.balanceDue}
                    currency={order.currency}
                    onOpened={() => {
                      showToast("Balance opened — the buyer has been notified", "success");
                      void fetch(`${apiBase}/${orderId}`)
                        .then((r) => r.json())
                        .then((json) => setOrder((json?.data ?? json) as OrderDetail))
                        .catch((err: unknown) => void normalizeError(err));
                    }}
                  />
                </Stack>
              )}

            {/*
              🛑 Dispatch is its OWN form, above the status form, not a section
              inside it — and that separation is the point rather than layout
              taste. The status form diffs its draft against the loaded order
              and PATCHes whatever moved; dispatch posts a discriminated union
              to a different route and, on the platform branch, enqueues a job
              that spends money. Folding them together would give one Save two
              meanings, which is bug 0d one level up from where it was found.

              It carries its own single submit and no `bottomBar`: this panel
              renders inside a `SideDrawer` on the orders list, where
              `useFormBottomActions` suppresses the bar anyway.
            */}
            <Stack className={SECTION_DIVIDER} padding="t-md" gap="3">
              <DispatchForm
                orderId={orderId}
                trackingNumber={order.trackingNumber}
                platformBooked={order.platformBookedShipment}
                onDispatched={() => {
                  showToast("Dispatch recorded", "success");
                  /*
                   * Re-read rather than patching local state: the platform
                   * branch's tracking id is produced by the CARRIER, so there
                   * is no value here to optimistically write. On that branch
                   * the job is still running, so this first re-read correctly
                   * shows no tracking number yet.
                   */
                  void fetch(`${apiBase}/${orderId}`)
                    .then((r) => r.json())
                    .then((json) => setOrder((json?.data ?? json) as OrderDetail))
                    .catch((err: unknown) => void normalizeError(err));
                }}
              />
            </Stack>

            <Stack className={SECTION_DIVIDER} padding="t-md" gap="3">
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
          {/*
            🛑 THE SECOND Close/Save PAIR WAS HERE AND IS DELETED.
            `SectionForm` above already renders a footer — `submitLabel="Save"`,
            `cancelLabel="Close"`, `onCancel={onClose}` — so this panel showed
            TWO identical pairs, one under the other, with the error banner
            sandwiched between them.

            They were not equivalent, which is what made it more than cosmetic:
            SectionForm's Save runs the schema parse, scrolls to the first
            erroring section and calls `applyZodIssues` before submitting,
            while the pair here called `handleSave()` RAW — so whichever one
            the seller happened to press decided whether the form validated at
            all. The lower pair was also the visually obvious one, sitting at
            the bottom of the panel.

            Deleted rather than deduplicated: a form owns its own submit, and
            a second one beside it is an invitation to drift (Rule #9 §5).
          */}
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
            {/*
              🛑 One owner for this label. This used to re-derive it here —
              `row.itemTitle` plus its own `+${itemCount - 1} more` — and
              PREFERRED that over `row.primary`, so `primary` was dead on every
              row that had a title. Two derivations of one string in one file is
              how a grouped order would have kept reading as an arbitrary
              member here while reading correctly everywhere else.

              `primary` is now the single grouped-aware label (see `mapRows`);
              `itemCount` stays below because a member count is a genuinely
              different fact from a line count.
            */}
            <Text className="truncate" size="sm" weight="semibold">
              {row.primary}
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
      render: (row) => {
        // Shared formatter — see utils/physical-location.ts.
        const loc = formatPhysicalLocation(row.physicalLocation);
        return loc ? (
          <Span size="xs" className="font-mono" color="muted">
            {loc}
          </Span>
        ) : (
          <Span size="xs" color="muted">—</Span>
        );
      },
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
    filterKeys: ["status", "orderType"],
    defaultSort: DEFAULT_SORT,
    queryKey: ["seller", "orders", "listing"],
    endpoint: SELLER_ENDPOINTS.ORDERS,
    sortOptions: SORT_OPTIONS,
    columns,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
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
            /*
             * Counted in LINES, not item rows, and a grouped line is named by
             * its own title.
             *
             * This was `items[0].productTitle` + `itemsArr.length - 1`, so a
             * four-member bundle read "Dranzer S +3 more" — an arbitrary
             * member, implying four separate purchases. Grouping through the
             * same helper the drawer now uses makes it "Starter Bundle", and a
             * bundle beside one standalone item "+1 more".
             */
            const groups = groupOrderItemsByLine(
              itemsArr
                .filter(
                  (entry): entry is Record<string, unknown> =>
                    Boolean(entry) && typeof entry === "object",
                )
                /*
                 * Narrowed, not cast: `Record<string, unknown>` does NOT
                 * satisfy `OrderItemForLineGrouping` — its `groupSlug` is
                 * `unknown`, which is not assignable to `string | undefined`.
                 * A cast would compile and then group on whatever junk a bad
                 * document carried.
                 */
                .map((e) => ({
                  productTitle: typeof e.productTitle === "string" ? e.productTitle : undefined,
                  groupSlug: typeof e.groupSlug === "string" ? e.groupSlug : undefined,
                  groupTitle: typeof e.groupTitle === "string" ? e.groupTitle : undefined,
                  bundleCategorySlug:
                    typeof e.bundleCategorySlug === "string" ? e.bundleCategorySlug : undefined,
                  bundleProductIds: Array.isArray(e.bundleProductIds)
                    ? e.bundleProductIds.filter((v): v is string => typeof v === "string")
                    : undefined,
                })),
            );
            const head = groups[0];
            const extra = Math.max(0, groups.length - 1);
            const title =
              head === undefined
                ? typeof firstItem.productTitle === "string"
                  ? firstItem.productTitle
                  : ""
                : head.kind === "bundle"
                  ? (head.groupTitle ?? "Grouped purchase")
                  : (head.item.productTitle ?? "");
            if (!title) return `Order ${toStringValue(item.id, "-")}`;
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
    /*
     * Two independent axes, joined. The lane answers "how was this won", the
     * status answers "where is it now" — a seller asking "which of my collector drop
     * wins are still unshipped" should not have to choose between them.
     *
     * 🛑 `orderType` is a registered SELLER_SIEVE_FIELD as of this change. It
     * was not, and the failure would have been invisible: `throwExceptions` is
     * false, so an unallowlisted field drops its clause and the chip would have
     * returned the seller's whole order list while looking like it filtered
     * (Root Cause #62). `standard` is stripped from the query server-side and
     * refined in memory — see `/api/store/orders`.
     */
    buildFilters: (state) =>
      [
        state.status && state.status !== "All"
          ? sieveFilter("status", SIEVE_OP.EQ, state.status)
          : null,
        state.orderType ? sieveFilter("orderType", SIEVE_OP.EQ, state.orderType) : null,
      ]
        .filter(Boolean)
        .join(",") || undefined,
    buildExtraParams: () => orderScope.extraParams,
    renderAboveContent: orderScope.renderAboveContent,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={STATUS_OPTIONS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        {/*
          Provenance — the same tabs the buyer has had, from the same shared
          constant. A seller could see every order and could not ask "show me
          the ones I accepted an offer on", which is exactly the split that
          changes how one is handled: a collector drop win has a forfeit deadline, an
          accepted offer has an agreed price that is not the listing price.
        */}
        <FilterChipGroup
          label="Type"
          tabs={ORDER_LANE_TABS}
          value={pendingFilters.orderType ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, orderType: id }))}
        />
      </>
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
