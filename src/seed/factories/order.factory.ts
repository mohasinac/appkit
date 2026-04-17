// appkit/src/seed/factories/order.factory.ts
import { getDefaultCurrency } from "../seed-market-config";

let _seq = 1;

export interface SeedBaseOrderItem {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SeedBaseOrderDocument {
  id: string;
  userId: string;
  items: SeedBaseOrderItem[];
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  totalPrice: number;
  currency: string;
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function makeOrder(
  overrides: Partial<SeedBaseOrderDocument> = {},
): SeedBaseOrderDocument {
  const n = _seq++;
  const now = new Date();
  return {
    id: overrides.id ?? `order-${n}`,
    userId: overrides.userId ?? "user-1",
    items: overrides.items ?? [],
    status: overrides.status ?? "confirmed",
    paymentStatus: overrides.paymentStatus ?? "paid",
    totalPrice: overrides.totalPrice ?? 0,
    currency: overrides.currency ?? getDefaultCurrency(),
    orderDate: overrides.orderDate ?? now,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}
