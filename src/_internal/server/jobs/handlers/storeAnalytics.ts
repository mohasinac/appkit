/**
 * HTTPS callable handler: aggregate seller (store) analytics for the past
 * 6 months. Input: `{ sellerId }` (the Firebase Auth UID); store slug is
 * resolved server-side via `storeRepository.findByOwnerId`.
 */

import {
  orderRepository,
  productRepository,
  storeRepository,
} from "../../../../repositories";
import { formatMonthYear } from "../../../../utils/date.formatter";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { CallableHandler } from "../runtime/types";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

export interface StoreAnalyticsInput {
  sellerId: string;
}

export interface StoreAnalyticsResult {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    publishedProducts: number;
  };
  revenueByMonth: Array<{ month: string; orders: number; revenue: number }>;
  topProducts: Array<{
    productId: string;
    title: string;
    revenue: number;
    orders: number;
    mainImage: string;
  }>;
}

class StoreAnalyticsError extends Error {
  httpStatus: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "StoreAnalyticsError";
    this.httpStatus = status;
  }
}

function normalizeDate(raw: Date | string | number): Date {
  return raw instanceof Date ? raw : new Date(raw as string | number);
}

async function loadStore6MonthOrders(storeId: string): Promise<OrderDocument[]> {
  const now = new Date();
  const isoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const out: OrderDocument[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 5) {
    const result = await orderRepository.listAll({
      filters: `storeId==${storeId},createdAt>=${isoStart}`,
      sorts: "-createdAt",
      page: String(page),
      pageSize: "300",
    });
    out.push(...result.items);
    hasMore = result.hasMore;
    page += 1;
  }
  return out;
}

export const storeAnalyticsHandler: CallableHandler<StoreAnalyticsInput, StoreAnalyticsResult> =
  async (input, ctx) => {
    const sellerId = input?.sellerId;
    if (!sellerId || typeof sellerId !== "string") {
      throw new StoreAnalyticsError(400, "sellerId is required");
    }
    ctx.logger.info("Store analytics requested", { sellerId });

    const store = await storeRepository.findByOwnerId(sellerId);
    if (!store) throw new StoreAnalyticsError(404, "Store not found for this seller");
    const storeId = store.id;

    const [past6, totalProductsResult, publishedProductsResult] = await Promise.all([
      loadStore6MonthOrders(storeId),
      productRepository.list({ page: "1", pageSize: "1" }, { storeId }),
      productRepository.list(
        {
          filters: `status==${ProductStatusValues.PUBLISHED}`,
          page: "1",
          pageSize: "1",
        },
        { storeId, status: ProductStatusValues.PUBLISHED },
      ),
    ]);

    const productIds = Array.from(new Set(past6.map((o) => o.productId)));
    const products = await Promise.all(productIds.map((id) => productRepository.findById(id)));
    const productMap = new Map(products.filter(Boolean).map((p) => [p!.id, p!]));

    const totalOrders = past6.length;
    const totalRevenue = past6.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);

    const now = new Date();
    const monthMap = new Map<string, { month: string; orders: number; revenue: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { month: formatMonthYear(d), orders: 0, revenue: 0 });
    }
    for (const order of past6) {
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
      {
        productId: string;
        title: string;
        revenue: number;
        orders: number;
        mainImage: string;
      }
    >();
    for (const order of past6) {
      const existing = revenueByProduct.get(order.productId);
      if (existing) {
        existing.revenue += order.totalPrice ?? 0;
        existing.orders += 1;
      } else {
        const product = productMap.get(order.productId);
        revenueByProduct.set(order.productId, {
          productId: order.productId,
          title: order.productTitle,
          revenue: order.totalPrice ?? 0,
          orders: 1,
          mainImage: product?.mainImage ?? "",
        });
      }
    }

    const topProducts = Array.from(revenueByProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      summary: {
        totalOrders,
        totalRevenue,
        totalProducts: totalProductsResult.total,
        publishedProducts: publishedProductsResult.total,
      },
      revenueByMonth: Array.from(monthMap.values()),
      topProducts,
    };
  };
