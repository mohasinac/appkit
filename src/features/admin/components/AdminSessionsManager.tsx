import React from "react";
import { Div } from "../../../ui";

export interface AdminSessionsManagerProps {
  renderHeader?: () => React.ReactNode;
  renderStats: () => React.ReactNode;
  renderTable: () => React.ReactNode;
  renderConfirmModal?: () => React.ReactNode;
  className?: string;
}

export function AdminSessionsManager({
  renderHeader,
  renderStats,
  renderTable,
  renderConfirmModal,
  className = "",
}: AdminSessionsManagerProps) {
  return (
    <Div className={`space-y-6 ${className}`}>
      {renderHeader?.()}
      {renderStats()}
      {renderTable()}
      {renderConfirmModal?.()}
    </Div>
  );
}
