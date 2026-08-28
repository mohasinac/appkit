import { normalizeError } from "../errors/normalize";
import type {
  Firestore,
  Transaction,
  WriteBatch,
} from "firebase-admin/firestore";

// Static import, deliberately. This used to be
// `(module as any).require("../providers/db-firebase")` — the bundler-evasion
// idiom used correctly elsewhere in appkit (admin.ts's firebase-admin loaders),
// but every OTHER use passes a BARE specifier, which Node resolves from
// node_modules at any depth. A RELATIVE one is resolved against the emitted
// chunk, not this source file, so in a bundled Lambda it became
// `.next/server/chunks/providers/db-firebase` → MODULE_NOT_FOUND, and every
// runBatch/runTransaction threw before touching Firestore.
//
// The lazy form also bought nothing: the 19 repository imports below already
// pull this module into the graph statically (bid.repository.ts et al), and
// db-firebase reaches firebase-admin only through `import type` plus its own
// bare-specifier runtime requires. See CLAUDE.md Root Cause #24.
import { getAdminDb } from "../providers/db-firebase";
import { DatabaseError } from "../errors";

import {
  userRepository,
  tokenRepository,
  sessionRepository,
} from "../features/auth/repository";
import { addressesRepository } from "../features/addresses/repository/addresses.repository";
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
    return addressesRepository;
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
    try {
      return await this.db.runTransaction(fn);
    } catch (error) {
      void normalizeError(error);
      // Interpolate the underlying message. Without it the persisted
      // serverErrors row reads only "Transaction failed" and the real cause
      // survives nowhere the store can see — `cause` carries the stack, but
      // the message is what the admin list actually renders.
      const detail = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(`Transaction failed: ${detail}`, error);
    }
  }

  async runBatch(
    fn: (batch: WriteBatch) => void | Promise<void>,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      await fn(batch);
      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      const detail = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(`Batch write failed: ${detail}`, error);
    }
  }
}

export const unitOfWork = new UnitOfWork();
