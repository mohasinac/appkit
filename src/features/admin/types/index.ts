import type React from "react";
import type { TableColumn } from "../../../contracts";

// Admin product types
export type {
  AdminProduct,
  AdminProductStatus,
  AdminProductDrawerMode,
} from "./product.types";
export { ADMIN_PRODUCT_STATUS_OPTIONS } from "./product.types";

/**
 * Admin-specific column definition that narrows `render` to `React.ReactNode`.
 * Extends `TableColumn<T>` from `@mohasinac/contracts` so it is compatible
 * with column arrays built from the base type.
 */
export interface AdminTableColumn<T = Record<string, unknown>> extends Omit<
  TableColumn<T>,
  "render"
> {
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

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface AnalyticsMonthEntry {
  month: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsTopProduct {
  productId: string;
  title: string;
  revenue: number;
  orders: number;
  mainImage?: string;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  newOrdersThisMonth: number;
  revenueThisMonth: number;
  totalProducts?: number;
  publishedProducts?: number;
}

export interface AdminAnalyticsData {
  summary: AnalyticsSummary;
  ordersByMonth: AnalyticsMonthEntry[];
  topProducts: AnalyticsTopProduct[];
}
