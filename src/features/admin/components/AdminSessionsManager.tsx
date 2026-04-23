import React from "react";

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
    <div className={`space-y-6 ${className}`} data-section="adminsessionsmanager-div-256">
      {renderHeader?.()}
      {renderStats()}
      {renderTable()}
      {renderConfirmModal?.()}
    </div>
  );
}
