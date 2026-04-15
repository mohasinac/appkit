import { getAdminDb } from "../../../providers/db-firebase";
import { serverLogger } from "../../../monitoring";
import { USER_COLLECTION } from "../../auth/schemas";

export interface UserWishlistItem {
  productId: string;
  addedAt: Date;
}

export class UserWishlistRepository {
  private readonly subcollection = "wishlist";

  private getUserWishlistRef(uid: string) {
    return getAdminDb()
      .collection(USER_COLLECTION)
      .doc(uid)
      .collection(this.subcollection);
  }

  async getWishlistItems(uid: string): Promise<UserWishlistItem[]> {
    try {
      const snapshot = await this.getUserWishlistRef(uid)
        .orderBy("addedAt", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        productId: doc.id,
        addedAt: doc.data().addedAt?.toDate?.() ?? new Date(),
      }));
    } catch (error) {
      serverLogger.error("UserWishlistRepository.getWishlistItems error", {
        uid,
        error,
      });
      throw error;
    }
  }

  async addItem(uid: string, productId: string): Promise<void> {
    try {
      await this.getUserWishlistRef(uid).doc(productId).set({
        productId,
        addedAt: new Date(),
      });
    } catch (error) {
      serverLogger.error("UserWishlistRepository.addItem error", {
        uid,
        productId,
        error,
      });
      throw error;
    }
  }

  async removeItem(uid: string, productId: string): Promise<void> {
    try {
      await this.getUserWishlistRef(uid).doc(productId).delete();
    } catch (error) {
      serverLogger.error("UserWishlistRepository.removeItem error", {
        uid,
        productId,
        error,
      });
      throw error;
    }
  }

  async isInWishlist(uid: string, productId: string): Promise<boolean> {
    try {
      const doc = await this.getUserWishlistRef(uid).doc(productId).get();
      return doc.exists;
    } catch (error) {
      serverLogger.error("UserWishlistRepository.isInWishlist error", {
        uid,
        productId,
        error,
      });
      return false;
    }
  }

  async clearWishlist(uid: string): Promise<void> {
    try {
      const snapshot = await this.getUserWishlistRef(uid).get();
      const batch = getAdminDb().batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      serverLogger.error("UserWishlistRepository.clearWishlist error", {
        uid,
        error,
      });
      throw error;
    }
  }
}

export const wishlistRepository = new UserWishlistRepository();
