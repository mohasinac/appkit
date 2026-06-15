import React from "react";
import { Div, Stack } from "../../../ui";
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
    <Stack className={`${className}`} gap="lg">
      {renderHeader?.()}
      {renderStats()}
      {renderTable()}
      {renderConfirmModal?.()}
    </Stack>
  );
}
