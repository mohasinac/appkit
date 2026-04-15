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
} from "../features/auth";
import { addressRepository } from "../features/account";
import { cartRepository } from "../features/cart";
import { categoriesRepository } from "../features/categories";
import { productRepository } from "../features/products";
import { orderRepository } from "../features/orders";
import { reviewRepository } from "../features/reviews";
import { bidRepository } from "../features/auctions";
import {
  siteSettingsRepository,
  notificationRepository,
} from "../features/admin";
import {
  carouselRepository,
  homepageSectionsRepository,
} from "../features/homepage";
import { couponsRepository } from "../features/promotions";
import { faqsRepository } from "../features/faq";
import { wishlistRepository } from "../features/wishlist";
import { blogRepository } from "../features/blog";
import { payoutRepository } from "../features/payments";

class UnitOfWork {
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
export type { UnitOfWork };
