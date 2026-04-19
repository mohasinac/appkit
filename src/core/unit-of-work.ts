import "server-only";
import type {
  Firestore,
  Transaction,
  WriteBatch,
} from "firebase-admin/firestore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
const getAdminDb: () => Firestore = () =>
  (
    (module as any).require(
      "../providers/db-firebase",
    ) as typeof import("../providers/db-firebase")
  ).getAdminDb();
import { DatabaseError } from "../errors";
import { serverLogger } from "../monitoring";

import {
  userRepository,
  tokenRepository,
  sessionRepository,
} from "../features/auth/repository";
import { addressRepository } from "../features/account/repository/address.repository";
import { cartRepository } from "../features/cart/repository/cart.repository";
import { categoriesRepository } from "../features/categories/repository/categories.repository";
import { productRepository } from "../features/products/repository/products.repository";
import { orderRepository } from "../features/orders/repository/orders.repository";
import { reviewRepository } from "../features/reviews/repository/reviews.repository";
import { bidRepository } from "../features/auctions/repository/bid.repository";
import { siteSettingsRepository } from "../features/admin/repository/site-settings.repository";
import { notificationRepository } from "../features/admin/repository/notification.repository";
import { carouselRepository } from "../features/homepage/repository/carousel.repository";
import { homepageSectionsRepository } from "../features/homepage/repository/homepage-sections.repository";
import { couponsRepository } from "../features/promotions/repository/coupons.repository";
import { faqsRepository } from "../features/faq/repository/faqs.repository";
import { wishlistRepository } from "../features/wishlist/repository/user-wishlist.repository";
import { blogRepository } from "../features/blog/repository/blog.repository";
import { payoutRepository } from "../features/payments/repository/payout.repository";

export class UnitOfWork {
  private get db(): Firestore {
    return getAdminDb();
  }

  get users() {
    return userRepository;
  }
  get addresses() {
    return addressRepository;
  }
  get tokens() {
    return tokenRepository;
  }
  get products() {
    return productRepository;
  }
  get orders() {
    return orderRepository;
  }
  get reviews() {
    return reviewRepository;
  }
  get sessions() {
    return sessionRepository;
  }
  get bids() {
    return bidRepository;
  }
  get carts() {
    return cartRepository;
  }
  get siteSettings() {
    return siteSettingsRepository;
  }
  get carousel() {
    return carouselRepository;
  }
  get homepageSections() {
    return homepageSectionsRepository;
  }
  get categories() {
    return categoriesRepository;
  }
  get coupons() {
    return couponsRepository;
  }
  get faqs() {
    return faqsRepository;
  }
  get wishlists() {
    return wishlistRepository;
  }
  get blogs() {
    return blogRepository;
  }
  get payouts() {
    return payoutRepository;
  }
  get notifications() {
    return notificationRepository;
  }

  async runTransaction<TResult>(
    fn: (tx: Transaction) => Promise<TResult>,
  ): Promise<TResult> {
    serverLogger.debug("[UnitOfWork] Starting transaction");
    try {
      const result = await this.db.runTransaction(fn);
      serverLogger.debug("[UnitOfWork] Transaction committed successfully");
      return result;
    } catch (error) {
      serverLogger.error("[UnitOfWork] Transaction failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Transaction failed", error);
    }
  }

  async runBatch(
    fn: (batch: WriteBatch) => void | Promise<void>,
  ): Promise<void> {
    serverLogger.debug("[UnitOfWork] Starting batch write");
    try {
      const batch = this.db.batch();
      await fn(batch);
      await batch.commit();
      serverLogger.debug("[UnitOfWork] Batch write committed successfully");
    } catch (error) {
      serverLogger.error("[UnitOfWork] Batch write failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Batch write failed", error);
    }
  }
}

export const unitOfWork = new UnitOfWork();
