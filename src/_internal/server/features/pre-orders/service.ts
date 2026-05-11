import { productRepository } from "../../../../repositories";
import {
  PreOrderNotFoundError,
  PreOrderSoldOutError,
  PreOrderNotOpenError,
} from "../../../shared/features/pre-orders/errors";
import type { ProductDocument } from "../../../shared/features/products/types";

/** Assert a pre-order exists, is published, and has remaining capacity. */
export async function assertPreOrderAvailable(preOrderId: string, requestedQty = 1): Promise<ProductDocument> {
  const product = await productRepository.findByIdOrSlug(preOrderId).catch(() => null);
  if (!product || !product.isPreOrder) throw new PreOrderNotFoundError(preOrderId);
  if (product.status !== "published") throw new PreOrderNotOpenError(product.status);

  const maxQty = product.preOrderMaxQuantity ?? Infinity;
  const current = product.preOrderCurrentCount ?? 0;
  if (current + requestedQty > maxQty) throw new PreOrderSoldOutError(preOrderId);

  return product as unknown as ProductDocument;
}

/** Compute deposit amount in paise. */
export function computeDeposit(product: ProductDocument): number {
  if ((product as any).preOrderDepositAmount) return (product as any).preOrderDepositAmount;
  const percent = (product as any).preOrderDepositPercent ?? 20;
  return Math.round(((product as any).price * percent) / 100);
}

/** Determine if the pre-order is still open for new reservations. */
export function isPreOrderOpen(product: ProductDocument): boolean {
  if (product.status !== "published") return false;
  const status = (product as any).preOrderProductionStatus;
  return status === "upcoming" || status === "in_production";
}
