import { DatabaseError } from "../../../errors";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import {
  decryptPiiFields,
  encryptPiiFields,
  ORDER_PII_FIELDS,
} from "../../../security";
import {
  createOrderId,
  ORDER_COLLECTION,
  type OrderCreateInput,
  type OrderDocument,
} from "../schemas";
import type { OrderStatus, PaymentStatus } from "../types";

const ORDER_FIELDS = {
  USER_ID: "userId",
  PRODUCT_ID: "productId",
  STATUS: "status",
  STATUS_VALUES: {
    CONFIRMED: "confirmed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
  },
} as const;

class OrderRepository extends BaseRepository<OrderDocument> {
  constructor() {
    super(ORDER_COLLECTION);
  }

  private decryptOrder(doc: OrderDocument): OrderDocument {
    return decryptPiiFields(doc as unknown as Record<string, unknown>, [
      ...ORDER_PII_FIELDS,
    ]) as unknown as OrderDocument;
  }

  private encryptOrderData<T extends Record<string, unknown>>(data: T): T {
    return encryptPiiFields(data, [...ORDER_PII_FIELDS]);
  }

  protected override mapDoc<D = OrderDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<OrderDocument>(snap);
    return this.decryptOrder(raw) as unknown as D;
  }

  async create(input: OrderCreateInput): Promise<OrderDocument> {
    const orderDate = new Date();
    const id = createOrderId(input.quantity, orderDate);

    const orderData: Omit<OrderDocument, "id"> = {
      ...input,
      orderDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.encryptOrderData(
      orderData as unknown as Record<string, unknown>,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...orderData };
  }

  async findByUser(userId: string): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.USER_ID, userId);
  }

  async findByProduct(productId: string): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.PRODUCT_ID, productId);
  }

  async findByStatus(status: OrderStatus): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, status);
  }

  async findConfirmed(): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, "confirmed");
  }

  async findPending(): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, "pending");
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<OrderDocument>,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      status,
      ...additionalData,
      updatedAt: new Date(),
    });
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentId?: string,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      paymentStatus,
      ...(paymentId ? { paymentId } : {}),
      updatedAt: new Date(),
    });
  }

  async cancelOrder(
    orderId: string,
    reason: string,
    refundAmount?: number,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      status: "cancelled",
      cancellationDate: new Date(),
      cancellationReason: reason,
      ...(refundAmount ? { refundAmount, refundStatus: "pending" } : {}),
      updatedAt: new Date(),
    });
  }

  async findRecentByUser(userId: string): Promise<OrderDocument[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where("userId", "==", userId)
      .where(
        "orderDate",
        ">=",
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      )
      .orderBy("orderDate", "desc")
      .get();

    return snapshot.docs.map((doc) =>
      this.decryptOrder({
        id: doc.id,
        ...doc.data(),
      } as OrderDocument),
    );
  }

  async hasUserPurchased(userId: string, productId: string): Promise<boolean> {
    const purchasedStatuses = new Set<string>([
      ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
      ORDER_FIELDS.STATUS_VALUES.SHIPPED,
      ORDER_FIELDS.STATUS_VALUES.DELIVERED,
    ]);

    const snapshot = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.USER_ID, "==", userId)
      .where(ORDER_FIELDS.PRODUCT_ID, "==", productId)
      .get();

    return snapshot.docs.some((doc) =>
      purchasedStatuses.has(doc.data()[ORDER_FIELDS.STATUS] as string),
    );
  }

  async deleteByUser(userId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where("userId", "==", userId)
        .get();

      if (snapshot.empty) return 0;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete orders for user: ${userId}`,
        error,
      );
    }
  }

  static readonly SELLER_SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    paymentStatus: { canFilter: true, canSort: true },
    paymentMethod: { canFilter: true, canSort: true },
    totalPrice: { canFilter: true, canSort: true },
    orderDate: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  async listForSeller(
    productIds: string[],
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    if (productIds.length === 0) {
      const page = Math.max(1, Number(model.page ?? 1));
      const pageSize = Math.max(1, Number(model.pageSize ?? 20));
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
      };
    }

    const baseQuery = this.getCollection().where(
      ORDER_FIELDS.PRODUCT_ID,
      "in",
      productIds,
    );
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.SELLER_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: 100,
      },
    );
  }

  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    const baseQuery = this.getCollection().where(
      ORDER_FIELDS.USER_ID,
      "==",
      userId,
    );
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.ADMIN_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: 200,
      },
    );
  }

  static readonly ADMIN_SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    userEmail: { canFilter: true, canSort: true },
    sellerId: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    paymentStatus: { canFilter: true, canSort: true },
    paymentMethod: { canFilter: true, canSort: true },
    shippingMethod: { canFilter: true, canSort: true },
    payoutStatus: { canFilter: true, canSort: false },
    totalPrice: { canFilter: true, canSort: true },
    orderDate: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  async listAll(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.ADMIN_SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }
}

const orderRepository = new OrderRepository();

export { OrderRepository, orderRepository };
export { OrderRepository as OrdersRepository };
