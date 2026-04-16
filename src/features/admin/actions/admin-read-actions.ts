/**
 * Admin Domain Read Actions (appkit)
 *
 * Pure read functions for admin dashboards and paginated list queries.
 */

import { sessionRepository } from "../../auth";
import { orderRepository } from "../../orders";
import { userRepository } from "../../auth";
import { productRepository } from "../../products";
import { blogRepository } from "../../blog";
import { storeRepository } from "../../stores";
import { bidRepository } from "../../auctions";
import { payoutRepository } from "../../payments";
import { formatMonthYear } from "../../../utils";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import type { OrderDocument } from "../../orders";
import type { PayoutDocument } from "../../payments";
import type { UserDocument } from "../../auth";
import type { ProductDocument } from "../../products";
import type { BlogPostDocument } from "../../blog";
import type { StoreDocument } from "../../stores";
import type { BidDocument } from "../../auctions";

export async function getAdminDashboardStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsers,
    disabledUsers,
    adminUsers,
    totalProducts,
    totalOrders,
  ] = await Promise.all([
    userRepository.count().catch(() => 0),
    userRepository.countActive().catch(() => 0),
    userRepository.countNewSince(thirtyDaysAgo).catch(() => 0),
    userRepository.countDisabled().catch(() => 0),
    userRepository.countByRole("admin").catch(() => 0),
    productRepository.count().catch(() => 0),
    orderRepository.count().catch(() => 0),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      new: newUsers,
      newThisMonth: newUsers,
      disabled: disabledUsers,
      admins: adminUsers,
    },
    products: { total: totalProducts },
    orders: { total: totalOrders },
  };
}

export async function getAdminAnalytics() {
  const [allOrders, allProducts] = await Promise.all([
    orderRepository.findAll(),
    productRepository.findAll(),
  ]);

  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce(
    (sum, o) => sum + (o.totalPrice ?? 0),
    0,
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthOrders = allOrders.filter(
    (o) => new Date(o.createdAt as Date) >= monthStart,
  );
  const newOrdersThisMonth = thisMonthOrders.length;
  const revenueThisMonth = thisMonthOrders.reduce(
    (sum, o) => sum + (o.totalPrice ?? 0),
    0,
  );

  const monthMap = new Map<
    string,
    { month: string; orders: number; revenue: number }
  >();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { month: formatMonthYear(d), orders: 0, revenue: 0 });
  }

  for (const order of allOrders) {
    const d = new Date(order.createdAt as Date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      const entry = monthMap.get(key)!;
      entry.orders += 1;
      entry.revenue += order.totalPrice ?? 0;
    }
  }

  const ordersByMonth = Array.from(monthMap.values());

  const revenueByProduct = new Map<
    string,
    { productId: string; title: string; revenue: number; orders: number }
  >();

  for (const order of allOrders) {
    const existing = revenueByProduct.get(order.productId);
    if (existing) {
      existing.revenue += order.totalPrice ?? 0;
      existing.orders += 1;
    } else {
      revenueByProduct.set(order.productId, {
        productId: order.productId,
        title: order.productTitle,
        revenue: order.totalPrice ?? 0,
        orders: 1,
      });
    }
  }

  const topProducts = Array.from(revenueByProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => {
      const product = allProducts.find((item) => item.id === p.productId);
      return { ...p, mainImage: product?.mainImage ?? "" };
    });

  return {
    summary: {
      totalOrders,
      totalRevenue,
      newOrdersThisMonth,
      revenueThisMonth,
      totalProducts: allProducts.length,
      publishedProducts: allProducts.filter((p) => p.status === "published")
        .length,
    },
    ordersByMonth,
    topProducts,
  };
}

export async function listAdminOrders(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<OrderDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return orderRepository.listAll(model);
}

export async function listAdminUsers(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<UserDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return userRepository.list(model);
}

export async function listAdminBids(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<BidDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return bidRepository.list(model);
}

export async function listAdminBlog(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<BlogPostDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return blogRepository.listAll(model);
}

export async function listAdminPayouts(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<PayoutDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return payoutRepository.list(model);
}

export async function listAdminProducts(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<ProductDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return productRepository.list(model);
}

export async function listAdminStores(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<StoreDocument>> {
  const model: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return storeRepository.listAllStores(model);
}

export async function listAdminSessions(params?: {
  userId?: string;
  limit?: number;
}) {
  return sessionRepository.findAllForAdmin({
    userId: params?.userId,
    limit: params?.limit ?? 100,
  });
}
