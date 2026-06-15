import React from "react";
import { Div, Heading } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";

/** Minimal shape of a per-store/per-type order group surfaced to the slot. */
export interface CartOrderGroup {
  /** Unique key for this group (e.g. `${storeId}:${orderType}`). */
  key: string;
  storeId: string;
  storeName: string;
  orderType: string;
  items: unknown[];
  subtotalInPaise: number;
  shippingFeeInPaise: number;
}

export interface CartViewProps {
  labels?: { title?: string; emptyText?: string; checkoutButton?: string };
  renderItems: (isLoading: boolean) => React.ReactNode;
  /**
   * When provided, replaces `renderItems` + `renderPromoCode` with a
   * per-group tabbed breakdown. Each group shows its own subtotal + shipping.
   */
  renderGroups?: (groups: CartOrderGroup[], isLoading: boolean) => React.ReactNode;
  /** Computed groups passed to `renderGroups`. Ignored when `renderGroups` is absent. */
  groups?: CartOrderGroup[];
  renderSummary?: () => React.ReactNode;
  renderPromoCode?: () => React.ReactNode;
  renderCheckoutButton?: (onCheckout: () => void, isLoading: boolean) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function CartView({
  labels = {},
  renderItems,
  renderGroups,
  groups = [],
  renderSummary,
  renderPromoCode,
  renderCheckoutButton,
  renderEmpty,
  isEmpty = false,
  isLoading = false,
  className = "",
}: CartViewProps) {
  if (isEmpty && renderEmpty) return <>{renderEmpty()}</>;
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl mb-6" weight="bold">{labels.title}</Heading>
      )}
      <Div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <Div className="flex-1">
          {renderGroups ? renderGroups(groups, isLoading) : renderItems(isLoading)}
          {!renderGroups && renderPromoCode?.()}
          {renderGroups && renderPromoCode?.()}
          <AdSlot id="cart-upsell" className="mt-6" />
        </Div>
        <Div className="w-full lg:w-80">
          {renderSummary?.()}
          {renderCheckoutButton?.(() => {}, isLoading)}
        </Div>
      </Div>
    </Div>
  );
}
