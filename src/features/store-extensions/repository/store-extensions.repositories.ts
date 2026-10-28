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
 * 🛑 Reads are CIPHERTEXT-BY-DEFAULT since 2026-10-28. Those three fields are
 * `Encrypted<string>` and `mapDoc` does not decrypt; use
 * `maskedPayoutMethod(s)` (the default) or `revealPayoutMethod(s)` (opt-in and
 * named). The interim state — encrypted at rest but decrypted on every read —
 * was invisible to `audit-pii-coverage` purely because this file is named
 * `.repositories.ts` and its filter read `.repository.ts`.
 *
 * The other ten hold no PII and use the BaseRepository public API only.
 */

import { BaseRepository } from "../../../providers/db-firebase";
import { arrayUnion, increment } from "../../../contracts/field-ops";
import { revealPii } from "../../../security/pii-accessors";
import {
  ANALYTICS_ALERTS_COLLECTION,
  ANALYTICS_CARDS_COLLECTION,
  ITEM_REQUESTS_COLLECTION,
  LISTING_TEMPLATES_COLLECTION,
  MODERATION_QUEUE_COLLECTION,
  PAYOUT_METHOD_PII_FIELDS,
  PAYOUT_METHODS_COLLECTION,
  REPORTS_COLLECTION,
  SHIPPING_CONFIGS_COLLECTION,
  STORE_CATEGORIES_COLLECTION,
  STORE_GOOGLE_CONFIG_COLLECTION,
  STORE_WHATSAPP_CONFIG_COLLECTION,
  type AnalyticsAlertDocument,
  type AnalyticsCardDocument,
  type ItemRequestDocument,
  type ItemRequestReply,
  type ListingTemplateDocument,
  type ModerationQueueDocument,
  type PayoutMethodDocument,
  type PayoutMethodPlain,
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
  protected override piiFields = PAYOUT_METHOD_PII_FIELDS;

  constructor() {
    super(PAYOUT_METHODS_COLLECTION);
  }

  /*
   * 🛑 `mapDoc` no longer decrypts — reads return what Firestore holds.
   *
   * It used to override `mapDoc` and call `decryptPiiFields` on every read, so
   * a plain `listByStore()` handed its caller a decrypted bank account number
   * and IFSC code, and `GET /api/store/payout-methods` returned all three in
   * full. That survived because `audit-pii-coverage` filtered
   * `.endsWith(".repository.ts")` and this file is `.repositories.ts`, so the
   * audit whose entire purpose is to find this reported `0 findings` — see the
   * note on `isRepositoryModule` in that script.
   */

  /**
   * Plaintext PII. **Opt-in and named** — the four `/api/store/payout-methods`
   * response sites call it explicitly, which is the whole gain here: the
   * decrypt is now four greppable call sites instead of implicit for every
   * reader of this repository.
   *
   * 🛑 There is deliberately NO masked variant yet, and that is not an
   * oversight. Masking payout methods properly means following
   * `SellerPayoutSettingsView`'s convention — a separate `accountNumberMasked`
   * key with the real field ABSENT, the form input starting empty, and "blank
   * keeps existing" enforced server-side — because masking the real key
   * in-place would be double-masked by
   * `SellerPayoutMethodsView.getMaskedIdentifier` and, worse, saved over the
   * real value by `.../[id]/edit`, which PATCHes its whole prefilled form
   * back. When that change lands it is
   * `maskPii(doc, PAYOUT_METHOD_PII_FIELDS)`, one import away; an unused
   * accessor shipped ahead of it is the speculative surface `AK3-yagni-prune`
   * exists to delete.
   */
  revealPayoutMethod(doc: PayoutMethodDocument): PayoutMethodPlain {
    return revealPii<PayoutMethodPlain>(doc, PAYOUT_METHOD_PII_FIELDS);
  }

  /** As `revealPayoutMethod`, for a list read. */
  revealPayoutMethods(docs: readonly PayoutMethodDocument[]): PayoutMethodPlain[] {
    return docs.map((d) => this.revealPayoutMethod(d));
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

  /**
   * Append one reply atomically.
   *
   * 🛑 F1 #9 — the route did `replies: [...doc.replies, entry]` plus
   * `replyCount: doc.replyCount + 1`. That is a read-modify-write on both
   * fields: two people replying within the same second each read N replies and
   * each wrote N+1, so the second write silently DISCARDED the first reply and
   * the count agreed with it. Nothing errored, and the losing reply simply
   * never existed.
   *
   * `arrayUnion` + `increment` are server-side operations, so the two writes
   * compose instead of racing. `arrayUnion` de-duplicates by deep equality,
   * which is harmless here and faintly useful: the entry carries a unique
   * `id`, so a retried request appends once rather than twice.
   */
  async appendReply(id: string, reply: ItemRequestReply): Promise<void> {
    /*
     * Written through the collection directly rather than `update()`, because
     * `prepareForFirestore` would walk the sentinels as if they were plain
     * values. Same shape `categories.repository` uses for its own
     * `arrayUnion` writes.
     */
    await this.getCollection()
      .doc(id)
      .update({
        replies: arrayUnion(reply),
        replyCount: increment(1),
        updatedAt: new Date(),
      });
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
