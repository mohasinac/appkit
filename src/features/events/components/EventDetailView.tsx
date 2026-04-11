import React from "react";

export interface EventDetailViewProps {
  isLoading?: boolean;
  /** Render the cover image */
  renderCoverImage?: () => React.ReactNode;
  /** Render status badge + basic header (title, dates) */
  renderHeader?: () => React.ReactNode;
  /** Render the type-specific interactive section (poll / survey / feedback / offer CTA) */
  renderContent?: () => React.ReactNode;
  /** Render an optional leaderboard section */
  renderLeaderboard?: () => React.ReactNode;
  /** Render a "participate" / "enter now" call-to-action when the event is active */
  renderParticipateAction?: () => React.ReactNode;
  /** Loading skeleton — provided by caller for brand-consistent skeleton */
  renderSkeleton?: () => React.ReactNode;
  /** Not-found / error state */
  renderNotFound?: () => React.ReactNode;
  className?: string;
}

export function EventDetailView({
  isLoading = false,
  renderCoverImage,
  renderHeader,
  renderContent,
  renderLeaderboard,
  renderParticipateAction,
  renderSkeleton,
  renderNotFound,
  className = "",
}: EventDetailViewProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return <div className="flex justify-center py-20">Loading…</div>;
  }

  if (renderNotFound) {
    return <>{renderNotFound()}</>;
  }

  return (
    <div className={`max-w-3xl mx-auto space-y-6 ${className}`}>
      {renderCoverImage?.()}
      {renderHeader?.()}
      {renderContent?.()}
      {renderParticipateAction?.()}
      {renderLeaderboard?.()}
    </div>
  );
}
