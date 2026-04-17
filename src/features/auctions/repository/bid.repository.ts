/**
 * Bid Repository
 *
 * Data access layer for bid documents in Firestore
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import type {
  SieveModel,
  FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type {
  BidDocument,
  BidCreateInput,
  BidUpdateInput,
  BidAdminUpdateInput,
  BidStatus,
} from "../schemas";
import { BID_COLLECTION, createBidId } from "../schemas";
import {
  encryptPiiFields,
  decryptPiiFields,
  BID_PII_FIELDS,
} from "../../../security";

const BID_FIELDS = {
  PRODUCT_ID: "productId",
  USER_ID: "userId",
  STATUS: "status",
  IS_WINNING: "isWinning",
} as const;

class BidRepository extends BaseRepository<BidDocument> {
  constructor() {
    super(BID_COLLECTION);
  }

  /** Override mapDoc to auto-decrypt PII on every bid read */
  protected override mapDoc<D = BidDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<BidDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...BID_PII_FIELDS,
    ]) as unknown as D;
  }

  /**
   * Create new bid with auto-generated ID
   */
  async create(input: BidCreateInput): Promise<BidDocument> {
    const bidIdInput = {
      productName: input.productTitle,
      userFirstName: input.userName.split(" ")[0] || input.userName,
      date: new Date(),
    };

    const id = createBidId(bidIdInput);

    const bidData: Omit<BidDocument, "id"> = {
      ...input,
      status: "active",
      isWinning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Encrypt PII before persisting
    const encrypted = encryptPiiFields(
      bidData as unknown as Record<string, unknown>,
      [...BID_PII_FIELDS],
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...bidData }; // return plaintext to caller
  }

  /**
   * Find bids by product ID
   */
  async findByProduct(productId: string): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.PRODUCT_ID, productId);
  }

  /**
   * Find bids by user ID
   */
  async findByUser(userId: string): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.USER_ID, userId);
  }

  /**
   * Find bids by status
   */
  async findByStatus(status: BidStatus): Promise<BidDocument[]> {
    return this.findBy(BID_FIELDS.STATUS, status);
  }

  /**
   * Find current winning bid for a product
   */
  async findWinningBid(productId: string): Promise<BidDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .where(BID_FIELDS.IS_WINNING, "==", true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.mapDoc<BidDocument>(doc);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find winning bid for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Find highest bid amount for a product
   */
  async findHighestBid(productId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .where("status", "==", "active")
        .orderBy("bidAmount", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const doc = snapshot.docs[0];
      const bid = doc.data() as BidDocument;
      return bid.bidAmount;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find highest bid for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Find all bids for a product sorted by amount (descending)
   */
  async findByProductSorted(productId: string): Promise<BidDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .orderBy("bidAmount", "desc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<BidDocument>(doc));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Update bid (user can only update autoMaxBid)
   */
  async updateBid(bidId: string, data: BidUpdateInput): Promise<BidDocument> {
    const updateData: Partial<BidDocument> = {
      ...data,
      updatedAt: new Date(),
    };

    return this.update(bidId, updateData);
  }

  /**
   * Admin update bid (can update any field except id and createdAt)
   */
  async adminUpdateBid(
    bidId: string,
    data: BidAdminUpdateInput,
  ): Promise<BidDocument> {
    const updateData: Partial<BidDocument> = {
      ...data,
      updatedAt: new Date(),
    };

    return this.update(bidId, updateData);
  }

  /**
   * Mark bid as winning and set all other bids for the product as outbid
   */
  async setWinningBid(bidId: string, productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Set all bids for this product to not winning
      const allBidsSnapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .get();

      allBidsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isWinning: false,
          status: doc.id === bidId ? "active" : "outbid",
          updatedAt: new Date(),
        });
      });

      // Set the new winning bid
      const winningBidRef = this.db.collection(this.collection).doc(bidId);
      batch.update(winningBidRef, {
        isWinning: true,
        status: "active",
        updatedAt: new Date(),
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(`Failed to set winning bid: ${bidId}`, error);
    }
  }

  /**
   * End auction - mark winning bid as won and others as lost
   */
  async endAuction(productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      const bidsSnapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .get();

      bidsSnapshot.docs.forEach((doc) => {
        const bid = doc.data() as BidDocument;
        batch.update(doc.ref, {
          status: bid.isWinning ? "won" : "lost",
          updatedAt: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to end auction for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Cancel all bids for a product (when product is deleted)
   */
  async cancelProductBids(productId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      const bidsSnapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .get();

      bidsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          isWinning: false,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to cancel bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Get bid count for a product
   */
  async countByProduct(productId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("productId", "==", productId)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count bids for product: ${productId}`,
        error,
      );
    }
  }

  /**
   * Get user's bid count
   */
  async countByUser(userId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("userId", "==", userId)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count bids for user: ${userId}`,
        error,
      );
    }
  }

  /**
   * Find a single bid by product, user, and status (database-layer query)
   * Used instead of findBy() + Array.find() for efficiency
   */
  async findOneByProductAndUser(
    productId: string,
    userId: string,
    status: BidStatus = "active",
  ): Promise<BidDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BID_FIELDS.PRODUCT_ID, "==", productId)
        .where(BID_FIELDS.USER_ID, "==", userId)
        .where(BID_FIELDS.STATUS, "==", status)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapDoc<BidDocument>(snapshot.docs[0]);
    } catch (error) {
      throw new DatabaseError(
        `Failed to find bid for productId=${productId}, userId=${userId}`,
        error,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Sieve-powered list query
  // ---------------------------------------------------------------------------

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    userEmail: { canFilter: true, canSort: true },
    bidAmount: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    isWinning: { canFilter: true, canSort: false },
    bidDate: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  /**
   * Paginated, Firestore-native bid list (admin use).
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<BidDocument>> {
    return this.sieveQuery<BidDocument>(model, BidRepository.SIEVE_FIELDS, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
  }
}

export const bidRepository = new BidRepository();
