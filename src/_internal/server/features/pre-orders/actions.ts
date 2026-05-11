"use server";

import { productRepository } from "../../../../repositories";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { reservePreOrderSchema } from "../../../shared/features/pre-orders/schema";
import { assertPreOrderAvailable, computeDeposit } from "./service";
import { ValidationError } from "../../../shared/errors/index";

export async function reservePreOrderAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);
  const parsed = reservePreOrderSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid reservation input");

  const { preOrderId, quantity } = parsed.data;
  const product = await assertPreOrderAvailable(preOrderId, quantity);
  const deposit = computeDeposit(product);

  // Increment reservation count
  await productRepository.update(preOrderId, {
    preOrderCurrentCount: ((product as any).preOrderCurrentCount ?? 0) + quantity,
  } as any);

  return {
    preOrderId,
    buyerId: user.uid,
    quantity,
    depositAmount: deposit * quantity,
    status: "pending_payment",
  };
}
