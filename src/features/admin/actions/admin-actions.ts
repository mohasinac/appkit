import { normalizeError } from "../../../errors/normalize";
/**
 * Admin Domain Mutations (appkit)
 *
 * Pure business functions. Auth, role checks, input validation, and rate limiting
 * are handled by thin server-action wrappers in the consumer.
 */

import { serverLogger } from "../../../monitoring";
import { sessionRepository } from "../../auth/repository/session.repository";
import { orderRepository } from "../../orders/repository/orders.repository";
import { payoutRepository } from "../../payments/repository/payout.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { productRepository } from "../../products/repository/products.repository";
import { NotFoundError, ValidationError } from "../../../errors";
import {
  finalizeStagedMediaUrl,
  finalizeStagedMediaField,
  finalizeStagedMediaArray,
} from "../../media/finalize";
import { getProviders } from "../../../contracts";
import { getAdminAuth } from "../../../providers/db-firebase";
import { isAdminUser } from "../../auth/role-predicates";
import type { OrderAdminUpdateInput, OrderDocument } from "../../orders";
import type { PayoutDocument, PayoutUpdateInput } from "../../payments";
import type { UserAdminUpdateInput, UserDocument } from "../../auth";
import type {
  ProductAdminUpdateInput,
  ProductCreateInput,
  ProductDocument,
} from "../../products";
import {
  assertPrizeDrawNotLocked,
  assertPrizeDrawWonItemsImmutable,
} from "../../../_internal/server/features/products/service";
import { recordAdminAction } from "../../../_internal/server/features/audit-log/actions";
import { AdminAuditActionValues } from "../../audit-log/schemas/firestore";

const ERR_UID_REQUIRED = "uid is required";

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
    ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
    // The payment reference. Absent from this pick until 2026-08-26, so every
    // payout marked paid was stored WITHOUT the UTR the modal required — see
    // PAYOUT_ADMIN_UPDATEABLE_FIELDS for the full trace.
    ...(input.transactionId !== undefined ? { transactionId: input.transactionId } : {}),
    ...(input.processedAt
      ? {
          processedAt:
            input.processedAt instanceof Date
              ? input.processedAt
              : new Date(input.processedAt),
        }
      : {}),
  };

  /*
   * Through `updateStatus`, not a bare `update`, so the change lands on the
   * payout's own timeline — `existing` is threaded in as `prior`, so that
   * costs no second read of a document this function already holds.
   */
  const updated =
    input.status !== undefined
      ? await payoutRepository.updateStatus(
          id,
          input.status,
          updateData,
          { actor: { role: "admin", uid: adminId }, trigger: "adminUpdatePayout" },
          existing,
        )
      : await payoutRepository.update(id, updateData);

  serverLogger.info("adminUpdatePayout", {
    adminId,
    payoutId: id,
  });

  if (input.status === "paid") {
    void recordAdminAction({
      actorUid: adminId,
      action: AdminAuditActionValues.PAYOUT_MARK_PAID,
      targetType: "payout",
      targetId: id,
      targetLabel: existing.sellerName ?? id,
      metadata: { amount: existing.netAmount ?? existing.amount },
    });
  }

  return updated;
}

export async function adminUpdateUser(
  adminId: string,
  uid: string,
  input: UserAdminUpdateInput,
): Promise<UserDocument> {
  if (!uid?.trim()) {
    throw new ValidationError(ERR_UID_REQUIRED);
  }

  const existing = await userRepository.findById(uid);
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  const updated = await userRepository.update(uid, input);

  // Sync role to Firebase custom claims so it takes effect on next token refresh
  if (input.role !== undefined) {
    try {
      const providers = getProviders();
      await providers.auth.updateUser(uid, { role: input.role });
    } catch (err) {
      void normalizeError(err);
      serverLogger.warn("adminUpdateUser: custom claims sync failed", { uid, err });
    }
  }

  serverLogger.info("adminUpdateUser", {
    adminId,
    targetUid: uid,
    changes: Object.keys(input),
  });

  if (input.role !== undefined && input.role !== existing.role) {
    void recordAdminAction({
      actorUid: adminId,
      action: AdminAuditActionValues.USER_ROLE_CHANGE,
      targetType: "user",
      targetId: uid,
      targetLabel: existing.displayName ?? uid,
      metadata: { fromRole: existing.role, toRole: input.role },
    });
  }

  return updated;
}

/**
 * Permanently deletes a user's Firestore record, all of their session
 * records, and their Firebase Auth account — a genuine, irreversible
 * delete (unlike hard-ban, which only disables/marks the account and
 * stays recoverable). Deliberately narrow: only these 3 records are
 * removed. Orders, reviews, addresses, payouts, etc. are left untouched —
 * they're business/audit records that reference this uid and deleting
 * them would corrupt other parties' (sellers', buyers') own history, the
 * same reasoning testerSandboxCleanup already documents for why it leaves
 * orders/reviews/wishlists/history alone when a test product disappears.
 */
export async function adminDeleteUser(
  adminId: string,
  uid: string,
): Promise<void> {
  if (!uid?.trim()) {
    throw new ValidationError(ERR_UID_REQUIRED);
  }

  if (uid === adminId) {
    throw new ValidationError("Cannot delete your own account");
  }

  const existing = await userRepository.findById(uid);
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  if (isAdminUser(existing)) {
    throw new ValidationError("Cannot delete an admin account");
  }

  // 1. Delete all session records for this user.
  try {
    const sessions = await sessionRepository.findAllByUser(uid, 1000);
    await Promise.all(sessions.map((s) => sessionRepository.delete(s.id)));
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("adminDeleteUser: session cleanup failed (non-fatal)", {
      adminId,
      uid,
    });
  }

  // 2. Delete the Firebase Auth record.
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("adminDeleteUser: Auth delete failed (user may lack Auth record)", {
      adminId,
      uid,
    });
  }

  // 3. Delete the Firestore user document — the one write that must
  // succeed for the delete to take effect.
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
    throw new ValidationError(ERR_UID_REQUIRED);
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
  if (input.status && input.status !== "published" && existing.status === "published") {
    assertPrizeDrawNotLocked(existing, "unpublished or archived");
  }
  assertPrizeDrawWonItemsImmutable(existing, input.prizeDrawItems);

  const finalized = { ...input } as typeof input & {
    mainImage?: string;
    images?: string[];
    video?: { url?: string; thumbnailUrl?: string };
  };
  if (typeof finalized.mainImage === "string" && finalized.mainImage) {
    finalized.mainImage = await finalizeStagedMediaUrl(finalized.mainImage);
  }
  if (Array.isArray(finalized.images) && finalized.images.length > 0) {
    finalized.images = await finalizeStagedMediaArray(finalized.images);
  }
  if (finalized.video?.url) {
    finalized.video = {
      ...finalized.video,
      url: await finalizeStagedMediaUrl(finalized.video.url),
      thumbnailUrl: (await finalizeStagedMediaField(finalized.video.thumbnailUrl)) ?? finalized.video.thumbnailUrl,
    };
  }

  const updated = await productRepository.updateProduct(id, finalized);

  serverLogger.info("adminUpdateProduct", {
    adminId,
    productId: id,
  });

  return updated;
}

export async function adminCreateProduct(
  admin: AdminActor,
  input: ProductCreateInput &
    Partial<Pick<ProductDocument, "storeId" | "storeName">>,
): Promise<ProductDocument> {
  const product = await productRepository.create({
    ...input,
    storeId: input.storeId,
    storeName: input.storeName || "Admin",
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
  assertPrizeDrawNotLocked(existing, "deleted");

  await productRepository.delete(id);

  serverLogger.info("adminDeleteProduct", {
    adminId,
    productId: id,
  });
}
