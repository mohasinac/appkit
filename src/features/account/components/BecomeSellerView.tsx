import React from "react";
import { Div, Heading } from "../../../ui";

export interface BecomeSellerViewLabels {
  title?: string;
  applyButton?: string;
  alreadySeller?: string;
}

export interface BecomeSellerViewProps {
  labels?: BecomeSellerViewLabels;
  renderGuide?: () => React.ReactNode;
  renderSuccess?: () => React.ReactNode;
  renderAlreadySeller?: () => React.ReactNode;
  /** Which state to render. Shell exposes all three slots; consumer controls which is active. */
  state?: "guide" | "success" | "already-seller";
  isLoading?: boolean;
  className?: string;
}

export function BecomeSellerView({
  labels = {},
  renderGuide,
  renderSuccess,
  renderAlreadySeller,
  state = "guide",
  isLoading = false,
  className = "",
}: BecomeSellerViewProps) {
  return (
    <Div className={className}>
      {labels.title && state === "guide" && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {state === "guide" && renderGuide?.()}
      {state === "success" && renderSuccess?.()}
      {state === "already-seller" && renderAlreadySeller?.()}
    </Div>
  );
}
