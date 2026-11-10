import { getProviders } from "../contracts/registry";
import type { IRepository, PagedResult } from "../contracts/repository";
import { decryptPiiFields, piiBlindIndex } from "../security/pii-encrypt";
import { normalizeEmail } from "../validation/email.validator";

export const NEWSLETTER_SUBSCRIBER_FIELDS = {
  EMAIL: "email",
  EMAIL_INDEX: "emailIndex",
  STATUS: "status",
  SOURCE: "source",
  STATUS_VALUES: {
    ACTIVE: "active",
    UNSUBSCRIBED: "unsubscribed",
  },
  SOURCE_VALUES: {
    FOOTER: "footer",
    HOMEPAGE: "homepage",
    CHECKOUT: "checkout",
    POPUP: "popup",
  },
} as const;

export interface NewsletterSubscriberDocument {
  id: string;
  email: string;
  emailIndex?: string;
  status: (typeof NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES)[keyof typeof NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES];
  source?: (typeof NEWSLETTER_SUBSCRIBER_FIELDS.SOURCE_VALUES)[keyof typeof NEWSLETTER_SUBSCRIBER_FIELDS.SOURCE_VALUES];
  ipAddress?: string;
  subscribedAt?: Date;
  unsubscribedAt?: Date | null;
  resubscribedAt?: Date;
  adminNote?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type NewsletterSubscriberCreateInput = Pick<
  NewsletterSubscriberDocument,
  "email" | "source" | "ipAddress"
>;

export type NewsletterSubscriberUpdateInput = Partial<
  Pick<NewsletterSubscriberDocument, "status" | "source" | "adminNote">
>;

export interface NewsletterListModel {
  filters?: string;
  sorts?: string;
  page?: string;
  pageSize?: string;
}

/**
 * Subscriber email, encrypted at rest.
 *
 * Was an empty array, so the encrypt/decrypt calls wrapped around it were both
 * no-ops and every subscriber address sat in cleartext — with a perfectly good
 * `emailIndex` beside it.
 *
 * 🛑 THIS LIST IS NOW READ-SIDE ONLY. The WRITE side is the registry: this
 * repository does not extend `BaseRepository`, it reaches Firestore through
 * `IDbProvider.getRepository("newsletterSubscribers")`, and that generic
 * `FirebaseRepository` resolves `piiFields` from
 * `security/pii-registry.ts` by collection name. So encryption and the blind
 * index are applied by the provider's write hook on EVERY write path — not by
 * a call this file remembers to make. `scripts/audit-pii-registry.mjs`
 * verifies this copy still matches the registry entry.
 */
const NEWSLETTER_PII_FIELDS: string[] = ["email"];

function resolveRepository(): IRepository<NewsletterSubscriberDocument> {
  const provider = getProviders().db;
  if (!provider) {
    throw new Error(
      "DB provider is not registered. Configure providers before using NewsletterRepository.",
    );
  }
  return provider.getRepository<NewsletterSubscriberDocument>(
    "newsletterSubscribers",
  );
}

function decryptNewsletterDoc(
  doc: NewsletterSubscriberDocument,
): NewsletterSubscriberDocument {
  return decryptPiiFields(
    doc as unknown as Record<string, unknown>,
    NEWSLETTER_PII_FIELDS,
  ) as unknown as NewsletterSubscriberDocument;
}

export class NewsletterRepository {
  private _repo: IRepository<NewsletterSubscriberDocument> | null;

  constructor(repo: IRepository<NewsletterSubscriberDocument> | null = null) {
    this._repo = repo;
  }

  private get repo(): IRepository<NewsletterSubscriberDocument> {
    if (!this._repo) {
      this._repo = resolveRepository();
    }
    return this._repo;
  }

  async list(
    model: NewsletterListModel,
  ): Promise<PagedResult<NewsletterSubscriberDocument>> {
    const page = Number(model.page || "1");
    const pageSize = Number(model.pageSize || "50");

    const result = await this.repo.findAll({
      filters: model.filters,
      sort: model.sorts || "-createdAt",
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    });

    return {
      ...result,
      data: result.data.map(decryptNewsletterDoc),
    };
  }

  async findById(id: string): Promise<NewsletterSubscriberDocument | null> {
    const doc = await this.repo.findById(id);
    return doc ? decryptNewsletterDoc(doc) : null;
  }

  /**
   * 🛑 ONE NORMALISATION, APPLIED TO THE VALUE — never a second one applied to
   * the hash input.
   *
   * This method used to hash `email.toLowerCase()` while
   * `piiIndicesFor`/`encryptPiiFields` hash the value EXACTLY AS STORED. Two
   * normalisations for one blind-index scheme, so the same address resolved to
   * two different digests depending on which code path wrote it, and a lookup
   * through the other one found nothing — reported to a human as "not
   * subscribed".
   *
   * The platform rule, now the only rule: **a blind index is the HMAC of the
   * stored value, byte for byte.** Canonicalising an email is a property of
   * the VALUE, so `normalizeEmail` is applied before it is stored
   * (`subscribe`) and to the argument of every lookup (here) — the same shared
   * function in both places, never a private `.toLowerCase()` next to a hash
   * call. `hmacBlindIndex`'s own docstring already demanded this: *"both sides
   * must run the same normaliser BEFORE hashing"*.
   *
   * ⚠ No backfill is owed. `subscribe` lowercased the stored value as well as
   * the hash input, so every existing row holds a lowercased email and
   * `piiBlindIndex(storedEmail)` equals the digest already on it. Proven by
   * hashing one address through both paths and comparing.
   */
  async findByEmail(
    email: string,
  ): Promise<NewsletterSubscriberDocument | null> {
    const normalized = normalizeEmail(email);

    const byIndex = await this.repo.findWhere(
      "emailIndex",
      "==",
      piiBlindIndex(normalized),
    );
    if (byIndex[0]) return decryptNewsletterDoc(byIndex[0]);

    const byPlain = await this.repo.findWhere("email", "==", normalized);
    if (byPlain[0]) return decryptNewsletterDoc(byPlain[0]);

    return null;
  }

  async subscribe(
    input: NewsletterSubscriberCreateInput,
  ): Promise<NewsletterSubscriberDocument> {
    const now = new Date();
    /*
     * 🛑 PLAINTEXT in, and no `emailIndex` written here.
     *
     * Both used to be this method's job: it called `encryptPiiFields` by hand
     * and set `emailIndex: hmacBlindIndex(email.toLowerCase())` itself. That
     * made `subscribe` the ONLY encrypted write path on this collection — a
     * new method, or any caller reaching the generic
     * `getRepository("newsletterSubscribers")`, stored the address in
     * cleartext and nothing failed.
     *
     * The provider's registry-driven write hook now encrypts and derives
     * `emailIndex` from the stored value on every path. Deleting the
     * hand-written index is also what makes the single-normalisation rule in
     * `findByEmail` true: there is no longer a second place that could compute
     * a digest differently.
     *
     * `normalizeEmail` stays, because canonicalising the VALUE is this
     * method's job — the hook hashes whatever is stored.
     */
    const plaintext: Omit<
      NewsletterSubscriberDocument,
      "id" | "createdAt" | "updatedAt"
    > = {
      email: normalizeEmail(input.email),
      status: NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES.ACTIVE,
      source: input.source,
      ipAddress: input.ipAddress,
      subscribedAt: now,
      unsubscribedAt: null,
      resubscribedAt: undefined,
      adminNote: undefined,
    };

    const created = await this.repo.create(plaintext);
    return decryptNewsletterDoc(created);
  }

  async unsubscribe(id: string): Promise<void> {
    await this.repo.update(id, {
      status: NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
    });
  }

  async resubscribe(id: string): Promise<NewsletterSubscriberDocument> {
    const updated = await this.repo.update(id, {
      status: NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES.ACTIVE,
      resubscribedAt: new Date(),
      unsubscribedAt: null,
    });
    return decryptNewsletterDoc(updated);
  }

  async updateSubscriber(
    id: string,
    input: NewsletterSubscriberUpdateInput,
  ): Promise<NewsletterSubscriberDocument> {
    const updated = await this.repo.update(id, input);
    return decryptNewsletterDoc(updated);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

export const newsletterRepository = new NewsletterRepository();

export const NEWSLETTER_SUBSCRIBERS_COLLECTION = "newsletterSubscribers" as const;
export const NEWSLETTER_SUBSCRIBER_INDEXED_FIELDS = ["status", "email", "emailIndex", "createdAt", "subscribedAt"] as const;
