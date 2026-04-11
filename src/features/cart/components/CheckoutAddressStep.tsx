"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface CheckoutAddressStepLabels {
  title?: string;
}

export interface CheckoutAddressStepProps<TAddress> {
  labels?: CheckoutAddressStepLabels;
  addresses: TAddress[];
  selectedAddressId: string | null;
  getAddressId: (address: TAddress) => string;
  onSelectAddress: (addressId: string, address: TAddress) => void;
  renderAddressCard: (
    address: TAddress,
    context: {
      isSelected: boolean;
      select: () => void;
      addressId: string;
    },
  ) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  renderAddNew?: () => React.ReactNode;
  className?: string;
}

export function CheckoutAddressStep<TAddress>({
  labels = {},
  addresses,
  selectedAddressId,
  getAddressId,
  onSelectAddress,
  renderAddressCard,
  renderEmptyState,
  renderAddNew,
  className = "",
}: CheckoutAddressStepProps<TAddress>) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={2} className="text-lg mb-4">
          {labels.title}
        </Heading>
      )}

      {addresses.length === 0 ? (
        (renderEmptyState?.() ?? null)
      ) : (
        <Div className="space-y-3">
          {addresses.map((address) => {
            const addressId = getAddressId(address);
            const isSelected = addressId === selectedAddressId;
            const select = () => onSelectAddress(addressId, address);
            return (
              <React.Fragment key={addressId}>
                {renderAddressCard(address, { isSelected, select, addressId })}
              </React.Fragment>
            );
          })}
        </Div>
      )}

      {renderAddNew?.()}
    </Div>
  );
}
