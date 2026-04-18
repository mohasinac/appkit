import React from "react";
import { Div, Heading } from "../../../ui";

export interface CartViewProps {
  labels?: { title?: string; emptyText?: string; checkoutButton?: string };
  renderItems: (isLoading: boolean) => React.ReactNode;
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
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      <Div className="flex gap-8">
        <Div className="flex-1">
          {renderItems(isLoading)}
          {renderPromoCode?.()}
        </Div>
        <Div className="w-80">
          {renderSummary?.()}
          {renderCheckoutButton?.(() => {}, isLoading)}
        </Div>
      </Div>
    </Div>
  );
}
