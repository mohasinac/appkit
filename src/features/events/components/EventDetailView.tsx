import React from "react";
import { DetailViewShell } from "../../../ui";
import type { DetailViewShellProps } from "../../../ui";

export interface EventDetailViewProps extends Omit<
  DetailViewShellProps,
  "mainSlots" | "layout"
> {
  /** Render the cover image */
  renderCoverImage?: () => React.ReactNode;
  /** Render status badge + basic header (title, dates) */
  renderHeader?: () => React.ReactNode;
  /** Render the type-specific interactive section (poll / survey / feedback / offer CTA) */
  renderContent?: () => React.ReactNode;
  /** TS11/VD9 — Render a rich-text description block */
  renderDescription?: () => React.ReactNode;
  /** TS11/VD9 — Render an image gallery section */
  renderGallery?: () => React.ReactNode;
  /** TS11/VD9 — Render a winners section (post-event) */
  renderWinners?: () => React.ReactNode;
  /** Render an optional leaderboard section */
  renderLeaderboard?: () => React.ReactNode;
  /** Render a "participate" / "enter now" call-to-action when the event is active */
  renderParticipateAction?: () => React.ReactNode;
}

export function EventDetailView({
  renderCoverImage,
  renderHeader,
  renderContent,
  renderDescription,
  renderGallery,
  renderWinners,
  renderLeaderboard,
  renderParticipateAction,
  isLoading = false,
  ...rest
}: EventDetailViewProps) {
  return (
    <DetailViewShell
      portal="public"
      {...rest}
      layout="narrow"
      isLoading={isLoading}
      mainSlots={[
        renderCoverImage?.(),
        renderHeader?.(),
        renderDescription?.(),
        renderGallery?.(),
        renderContent?.(),
        renderParticipateAction?.(),
        renderWinners?.(),
        renderLeaderboard?.(),
      ]}
    />
  );
}
