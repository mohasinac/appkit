import React from "react";

export interface MakeOfferFormProps {
  listedPrice?: number;
  isLoading?: boolean;
  isSubmitted?: boolean;
  /** Render the offer amount input */
  renderInput?: () => React.ReactNode;
  /** Render the create / submit action button */
  renderAction?: () => React.ReactNode;
  /** Render terms acceptance checkbox or note */
  renderTerms?: () => React.ReactNode;
  /** Render success confirmation after offer is placed */
  renderSuccess?: () => React.ReactNode;
  /** Render auth gate when user is not authenticated */
  renderAuthGate?: () => React.ReactNode;
  /** Render validation error message */
  renderError?: () => React.ReactNode;
  className?: string;
}

export function MakeOfferForm({
  isSubmitted = false,
  renderInput,
  renderAction,
  renderTerms,
  renderSuccess,
  renderAuthGate,
  renderError,
  className = "",
}: MakeOfferFormProps) {
  if (renderAuthGate) return <>{renderAuthGate()}</>;
  if (isSubmitted && renderSuccess) return <>{renderSuccess()}</>;

  return (
    <div className={`space-y-4 ${className}`} data-section="makeofferform-div-423">
      {renderError?.()}
      {renderInput?.()}
      {renderTerms?.()}
      {renderAction?.()}
    </div>
  );
}
