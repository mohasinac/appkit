/**
 * Core: aggregate admin analytics. Returns 12-month order totals + monthly
 * breakdown + top-5 products by revenue.
 */

import { orderRepository, productRepository } from "../../../../repositories";
import { formatMonthYear } from "../../../../utils/date.formatter";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { JobContext } from "../runtime/types";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

export interface AdminAnalyticsResult {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    newOrdersThisMonth: number;
    revenueThisMonth: number;
    totalProducts: number;
    publishedProducts: number;
  };
  ordersByMonth: Array<{ month: string; orders: number; revenue: number }>;
  topProducts: Array<{
    productId: string;
    title: string;
    revenue: number;
    orders: number;
    mainImage: string;
  }>;
}

function normalizeDate(raw: Date | string | number): Date {
  return raw instanceof Date ? raw : new Date(raw as string | number);
}

async function loadOrdersSince(isoStart: string, pageCap: number): Promise<OrderDocument[]> {
  const out: OrderDocument[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= pageCap) {
    const result = await orderRepository.listAll({
      filters: `createdAt>=${isoStart}`,
      sorts: "-createdAt",
      page: String(page),
      pageSize: "500",
    });
    out.push(...result.items);
    hasMore = result.hasMore;
    page += 1;
  }
  return out;
}

export async function runAdminAnalytics(
  _input: void,
  ctx: JobContext,
): Promise<AdminAnalyticsResult> {
  ctx.logger.info("Admin analytics requested");
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [allTimeTotalsResult, past12, thisMonth, totalProductsResult, publishedProductsResult] =
    await Promise.all([
      orderRepository.listAll({ page: "1", pageSize: "1" }),
      loadOrdersSince(twelveMonthsAgo, 10),
      loadOrdersSince(monthStart, 10),
      productRepository.list({ page: "1", pageSize: "1" }),
      productRepository.list(
        {
          filters: `status==${ProductStatusValues.PUBLISHED}`,
          page: "1",
          pageSize: "1",
        },
        { status: ProductStatusValues.PUBLISHED },
      ),
    ]);

  const totalRevenue = past12.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const newOrdersThisMonth = thisMonth.length;
  const revenueThisMonth = thisMonth.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);

  const monthMap = new Map<string, { month: string; orders: number; revenue: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { month: formatMonthYear(d), orders: 0, revenue: 0 });
  }
  for (const order of past12) {
    const d = normalizeDate(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.orders += 1;
      entry.revenue += order.totalPrice ?? 0;
    }
  }

  const revenueByProduct = new Map<
    string,
    { productId: string; title: string; revenue: number; orders: number }
  >();
  for (const order of past12) {
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
    .slice(0, 5);
  const topProductDocs = await Promise.all(
    topProducts.map((p) => productRepository.findById(p.productId)),
  );
  const topProductsWithImages = topProducts.map((p, i) => ({
    ...p,
    mainImage: topProductDocs[i]?.mainImage ?? "",
  }));

  return {
    summary: {
      totalOrders: allTimeTotalsResult.total,
      totalRevenue,
      newOrdersThisMonth,
      revenueThisMonth,
      totalProducts: totalProductsResult.total,
      publishedProducts: publishedProductsResult.total,
    },
    ordersByMonth: Array.from(monthMap.values()),
    topProducts: topProductsWithImages,
  };
}
