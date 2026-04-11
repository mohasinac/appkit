import React from "react";

export interface EventParticipateViewProps {
  isLoading?: boolean;
  isSubmitted?: boolean;
  /** Render the event title / summary at the top of the form */
  renderEventInfo?: () => React.ReactNode;
  /** Render the participation form fields (survey, poll options, etc.) */
  renderForm?: () => React.ReactNode;
  /** Render the submit button / action row */
  renderAction?: () => React.ReactNode;
  /** Render the success confirmation after submission */
  renderSuccess?: () => React.ReactNode;
  /** Loading skeleton */
  renderSkeleton?: () => React.ReactNode;
  /** Redirect/gate when user is not authenticated */
  renderAuthGate?: () => React.ReactNode;
  className?: string;
}

export function EventParticipateView({
  isLoading = false,
  isSubmitted = false,
  renderEventInfo,
  renderForm,
  renderAction,
  renderSuccess,
  renderSkeleton,
  renderAuthGate,
  className = "",
}: EventParticipateViewProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return <div className="flex justify-center py-20">Loading…</div>;
  }

  if (renderAuthGate) return <>{renderAuthGate()}</>;

  if (isSubmitted && renderSuccess) return <>{renderSuccess()}</>;

  return (
    <div className={`max-w-xl mx-auto space-y-6 ${className}`}>
      {renderEventInfo?.()}
      {renderForm?.()}
      {renderAction?.()}
    </div>
  );
}
