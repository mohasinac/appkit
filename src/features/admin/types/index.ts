import type React from "react";
import type { TableColumn } from "@mohasinac/contracts";

// Re-export the base column type from contracts
export type { TableColumn } from "@mohasinac/contracts";

/**
 * Admin-specific column definition that narrows `render` to `React.ReactNode`.
 * Extends `TableColumn<T>` from `@mohasinac/contracts` so it is compatible
 * with column arrays built from the base type.
 */
export interface AdminTableColumn<T = Record<string, unknown>>
  extends Omit<TableColumn<T>, "render"> {
  render?: (row: T) => React.ReactNode;
}

export interface DashboardStats {
  totalOrders?: number;
  totalRevenue?: number;
  totalUsers?: number;
  totalProducts?: number;
  pendingOrders?: number;
  pendingReviews?: number;
  newUsersToday?: number;
  currency?: string;
}

export interface AdminListParams {
  q?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  filters?: string;
}

export interface AdminListResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
