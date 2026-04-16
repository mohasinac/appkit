/**
 * Admin Domain Mutations (appkit)
 *
 * Pure business functions. Auth, role checks, input validation, and rate limiting
 * are handled by thin server-action wrappers in the consumer.
 */

import { serverLogger } from "../../../monitoring";
import { sessionRepository } from "../../auth";
import { orderRepository } from "../../orders";
import { payoutRepository } from "../../payments";
import { userRepository } from "../../auth";
import { productRepository } from "../../products";
import { NotFoundError, ValidationError } from "../../../errors";
import type { OrderAdminUpdateInput, OrderDocument } from "../../orders";
import type { PayoutDocument, PayoutUpdateInput } from "../../payments";
import type { UserAdminUpdateInput, UserDocument } from "../../auth";
import type {
  ProductAdminUpdateInput,
  ProductCreateInput,
  ProductDocument,
} from "../../products";

export interface AdminActor {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

export async function revokeSession(
  adminId: string,
  sessionId: string,
): Promise<{ success: true; message: string }> {
  if (!sessionId?.trim()) {
    throw new ValidationError("sessionId is required");
  }

  const session = await sessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundError("Session not found");
  }

  await sessionRepository.revokeSession(sessionId, adminId);

  serverLogger.info("revokeSession", {
    adminId,
    sessionId,
    targetUserId: session.userId,
  });

  return { success: true, message: "Session revoked" };
}

export async function revokeUserSessions(
  adminId: string,
  userId: string,
): Promise<{ success: true; message: string; revokedCount: number }> {
  if (!userId?.trim()) {
    throw new ValidationError("userId is required");
  }

  const revokedCount = await sessionRepository.revokeAllUserSessions(
    userId,
    adminId,
  );

  serverLogger.info("revokeUserSessions", {
    adminId,
    targetUserId: userId,
    revokedCount,
  });

  return { success: true, message: "All user sessions revoked", revokedCount };
}

export async function adminUpdateOrder(
  adminId: string,
  id: string,
  input: OrderAdminUpdateInput,
): Promise<OrderDocument> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await orderRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Order not found");
  }

  const updated = await orderRepository.update(id, input);

  serverLogger.info("adminUpdateOrder", {
    adminId,
    orderId: id,
  });

  return updated;
}

export async function adminUpdatePayout(
  adminId: string,
  id: string,
  input: PayoutUpdateInput,
): Promise<PayoutDocument> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await payoutRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Payout not found");
  }

  const updateData: PayoutUpdateInput = {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
    ...(input.processedAt
      ? {
          processedAt:
            input.processedAt instanceof Date
              ? input.processedAt
              : new Date(input.processedAt),
        }
      : {}),
  };

  const updated = await payoutRepository.update(id, updateData);

  serverLogger.info("adminUpdatePayout", {
    adminId,
    payoutId: id,
  });

  return updated;
}

export async function adminUpdateUser(
  adminId: string,
  uid: string,
  input: UserAdminUpdateInput,
): Promise<UserDocument> {
  if (!uid?.trim()) {
    throw new ValidationError("uid is required");
  }

  const existing = await userRepository.findById(uid);
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  const updated = await userRepository.update(uid, input);

  serverLogger.info("adminUpdateUser", {
    adminId,
    targetUid: uid,
    changes: Object.keys(input),
  });

  return updated;
}

export async function adminDeleteUser(
  adminId: string,
  uid: string,
): Promise<void> {
  if (!uid?.trim()) {
    throw new ValidationError("uid is required");
  }

  if (uid === adminId) {
    throw new ValidationError("Cannot delete your own account");
  }

  const existing = await userRepository.findById(uid);
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  await userRepository.delete(uid);

  serverLogger.info("adminDeleteUser", {
    adminId,
    deletedUid: uid,
  });
}

export async function adminUpdateStoreStatus(
  adminId: string,
  input: { uid: string; action: "approve" | "reject" },
): Promise<void> {
  const { uid, action } = input;
  if (!uid?.trim()) {
    throw new ValidationError("uid is required");
  }

  const user = await userRepository.findById(uid);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await userRepository.updateStoreApproval(uid, newStatus);

  serverLogger.info("adminUpdateStoreStatus", {
    adminId,
    targetUid: uid,
    action,
  });
}

export async function adminUpdateProduct(
  adminId: string,
  id: string,
  input: ProductAdminUpdateInput,
): Promise<ProductDocument> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await productRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Product not found");
  }

  const updated = await productRepository.updateProduct(id, input);

  serverLogger.info("adminUpdateProduct", {
    adminId,
    productId: id,
  });

  return updated;
}

export async function adminCreateProduct(
  admin: AdminActor,
  input: ProductCreateInput &
    Partial<Pick<ProductDocument, "sellerId" | "sellerName" | "sellerEmail">>,
): Promise<ProductDocument> {
  const product = await productRepository.create({
    ...input,
    sellerId: input.sellerId || admin.uid,
    sellerName: input.sellerName || admin.displayName || admin.email || "Admin",
    sellerEmail: input.sellerEmail || admin.email || "",
  });

  serverLogger.info("adminCreateProduct", {
    adminId: admin.uid,
    productId: product.id,
  });

  return product;
}

export async function adminDeleteProduct(
  adminId: string,
  id: string,
): Promise<void> {
  if (!id?.trim()) {
    throw new ValidationError("id is required");
  }

  const existing = await productRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Product not found");
  }

  await productRepository.delete(id);

  serverLogger.info("adminDeleteProduct", {
    adminId,
    productId: id,
  });
}
