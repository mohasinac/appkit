/**
 * S-STORE Extension Repositories
 *
 * 11 lightweight BaseRepository subclasses.
 *
 * This header used to claim "none of these collections store PII directly" —
 * that was wrong: `PayoutMethodsRepository` holds `upiVpa`, `accountNumber` and
 * `ifscCode`, which sat in cleartext because of it. It now declares `piiFields`
 * and BaseRepository's write hooks encrypt them on every write path, so no
 * per-method override is needed (which is the point of the hooks — Pattern #9
 * described overrides that never existed).
 *
 * The other ten hold no PII and use the BaseRepository public API only.
 */

import { BaseRepository } from "../../../providers/db-firebase";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { decryptPiiFields } from "../../../security/pii-encrypt";
import {
  ANALYTICS_ALERTS_COLLECTION,
  ANALYTICS_CARDS_COLLECTION,
  ITEM_REQUESTS_COLLECTION,
  LISTING_TEMPLATES_COLLECTION,
  MODERATION_QUEUE_COLLECTION,
  PAYOUT_METHODS_COLLECTION,
  REPORTS_COLLECTION,
  SHIPPING_CONFIGS_COLLECTION,
  STORE_CATEGORIES_COLLECTION,
  STORE_GOOGLE_CONFIG_COLLECTION,
  STORE_WHATSAPP_CONFIG_COLLECTION,
  type AnalyticsAlertDocument,
  type AnalyticsCardDocument,
  type ItemRequestDocument,
  type ListingTemplateDocument,
  type ModerationQueueDocument,
  type PayoutMethodDocument,
  type ReportDocument,
  type ShippingConfigDocument,
  type StoreCategoryDocument,
  type StoreGoogleConfigDocument,
  type StoreWhatsAppConfigDocument,
} from "../schemas/firestore";

export class PayoutMethodsRepository extends BaseRepository<PayoutMethodDocument> {
  /**
   * Bank/UPI details, encrypted at rest by BaseRepository's write hooks.
   *
   * This repository had no encryption at all. Nothing queries these by equality
   * (`listByStore` filters on `storeId`), so no read path depended on their
   * plaintext.
   */
  protected override piiFields = ["upiVpa", "accountNumber", "ifscCode"] as const;

  constructor() {
    super(PAYOUT_METHODS_COLLECTION);
  }

  /** Decrypt on read so callers see the shape they wrote. */
  protected override mapDoc<D = PayoutMethodDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<PayoutMethodDocument>(snap);
    return decryptPiiFields(raw, [...this.piiFields]) as unknown as D;
  }
  async listByStore(storeId: string): Promise<{ items: PayoutMethodDocument[] }> {
    const items = await this.findBy("storeId", storeId);
    return { items };
  }
}

export class ShippingConfigsRepository extends BaseRepository<ShippingConfigDocument> {
  constructor() {
    super(SHIPPING_CONFIGS_COLLECTION);
  }
  async listByStore(storeId: string): Promise<{ items: ShippingConfigDocument[] }> {
    const items = await this.findBy("storeId", storeId);
    return { items };
  }
}

export class AnalyticsCardsRepository extends BaseRepository<AnalyticsCardDocument> {
  constructor() {
    super(ANALYTICS_CARDS_COLLECTION);
  }
  async listForOwner(
    scope: "seller" | "admin",
    ownerId: string,
  ): Promise<{ items: AnalyticsCardDocument[] }> {
    const all = await this.findBy("ownerId", ownerId);
    return { items: all.filter((d) => d.scope === scope && d.isVisible !== false) };
  }
}

export class AnalyticsAlertsRepository extends BaseRepository<AnalyticsAlertDocument> {
  constructor() {
    super(ANALYTICS_ALERTS_COLLECTION);
  }
  async listForOwner(
    scope: "seller" | "admin",
    ownerId: string,
  ): Promise<{ items: AnalyticsAlertDocument[] }> {
    const all = await this.findBy("ownerId", ownerId);
    return { items: all.filter((d) => d.scope === scope) };
  }
}

export class StoreCategoriesRepository extends BaseRepository<StoreCategoryDocument> {
  constructor() {
    super(STORE_CATEGORIES_COLLECTION);
  }
  async listByStore(storeId: string): Promise<{ items: StoreCategoryDocument[] }> {
    const items = await this.findBy("storeId", storeId);
    return { items };
  }
}

export class ListingTemplatesRepository extends BaseRepository<ListingTemplateDocument> {
  constructor() {
    super(LISTING_TEMPLATES_COLLECTION);
  }
  async listByStore(storeId: string): Promise<{ items: ListingTemplateDocument[] }> {
    const all = await this.findBy("storeId", storeId);
    return { items: all.filter((d) => d.isActive !== false) };
  }
}

export class ModerationQueueRepository extends BaseRepository<ModerationQueueDocument> {
  constructor() {
    super(MODERATION_QUEUE_COLLECTION);
  }
  async listPending(): Promise<{ items: ModerationQueueDocument[] }> {
    const items = await this.findBy("status", "pending");
    return { items };
  }
}

export class ReportsRepository extends BaseRepository<ReportDocument> {
  constructor() {
    super(REPORTS_COLLECTION);
  }
  async listForEntity(
    entityType: string,
    entityId: string,
  ): Promise<{ items: ReportDocument[] }> {
    const all = await this.findBy("entityId", entityId);
    return { items: all.filter((d) => d.entityType === entityType) };
  }
  async listPending(): Promise<{ items: ReportDocument[] }> {
    const items = await this.findBy("status", "pending");
    return { items };
  }
}

export class ItemRequestsRepository extends BaseRepository<ItemRequestDocument> {
  constructor() {
    super(ITEM_REQUESTS_COLLECTION);
  }
  async listOpen(opts?: { limit?: number }): Promise<{ items: ItemRequestDocument[] }> {
    const all = await this.findBy("status", "open");
    const limit = opts?.limit ?? 50;
    return { items: all.slice(0, limit) };
  }
  async listByOwner(opUserId: string): Promise<{ items: ItemRequestDocument[] }> {
    const items = await this.findBy("opUserId", opUserId);
    return { items };
  }
}

export class StoreWhatsAppConfigRepository extends BaseRepository<StoreWhatsAppConfigDocument> {
  constructor() {
    super(STORE_WHATSAPP_CONFIG_COLLECTION);
  }
  async getByStore(storeId: string): Promise<StoreWhatsAppConfigDocument | null> {
    return this.findOneBy("storeId", storeId);
  }
}

export class StoreGoogleConfigRepository extends BaseRepository<StoreGoogleConfigDocument> {
  constructor() {
    super(STORE_GOOGLE_CONFIG_COLLECTION);
  }
  async getByStore(storeId: string): Promise<StoreGoogleConfigDocument | null> {
    return this.findOneBy("storeId", storeId);
  }
}

export const payoutMethodsRepository = new PayoutMethodsRepository();
export const shippingConfigsRepository = new ShippingConfigsRepository();
export const analyticsCardsRepository = new AnalyticsCardsRepository();
export const analyticsAlertsRepository = new AnalyticsAlertsRepository();
export const storeCategoriesRepository = new StoreCategoriesRepository();
export const listingTemplatesRepository = new ListingTemplatesRepository();
export const moderationQueueRepository = new ModerationQueueRepository();
export const reportsRepository = new ReportsRepository();
export const itemRequestsRepository = new ItemRequestsRepository();
export const storeWhatsAppConfigRepository = new StoreWhatsAppConfigRepository();
export const storeGoogleConfigRepository = new StoreGoogleConfigRepository();
