import React from "react";

export interface PlaceBidFormProps {
  currentBid?: number;
  minBidIncrement?: number;
  isLoading?: boolean;
  /** Render the bid amount input field */
  renderInput?: () => React.ReactNode;
  /** Render the submit button */
  renderAction?: () => React.ReactNode;
  /** Render the current bid / min bid info row */
  renderBidInfo?: () => React.ReactNode;
  /** Render an error message */
  renderError?: () => React.ReactNode;
  /** Render auth gate when user is not logged in */
  renderAuthGate?: () => React.ReactNode;
  /** Render countdown timer for auction end */
  renderCountdown?: () => React.ReactNode;
  className?: string;
}

export function PlaceBidForm({
  renderInput,
  renderAction,
  renderBidInfo,
  renderError,
  renderAuthGate,
  renderCountdown,
  className = "",
}: PlaceBidFormProps) {
  if (renderAuthGate) return <>{renderAuthGate()}</>;

  return (
    <div className={`space-y-4 ${className}`}>
      {renderCountdown?.()}
      {renderBidInfo?.()}
      {renderError?.()}
      {renderInput?.()}
      {renderAction?.()}
    </div>
  );
}
