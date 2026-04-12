import React from "react";
import type { EventType } from "../types";

export interface EventFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  eventType?: EventType;
  /** Render the drawer header (title and close button) */
  renderHeader?: () => React.ReactNode;
  /** Render the base fields (title, description, dates, cover image) */
  renderBaseFields?: () => React.ReactNode;
  /** Render the media fields (cover, gallery, winners, additional) */
  renderMediaFields?: () => React.ReactNode;
  /** Render the type-specific config form */
  renderTypeConfig?: () => React.ReactNode;
  /** Render the type selector (shown only in create mode) */
  renderTypeSelector?: () => React.ReactNode;
  /** Render the footer actions (save/cancel) */
  renderFooter?: () => React.ReactNode;
  className?: string;
}

export function EventFormDrawer({
  isOpen,
  onClose,
  renderHeader,
  renderBaseFields,
  renderMediaFields,
  renderTypeConfig,
  renderTypeSelector,
  renderFooter,
  className = "",
}: EventFormDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {renderHeader?.()}
      {renderTypeSelector?.()}
      {renderBaseFields?.()}
      {renderMediaFields?.()}
      {renderTypeConfig?.()}
      {renderFooter?.()}
    </div>
  );
}
