import { getProviders } from "../contracts/registry";
import type { IRepository, PagedResult } from "../contracts/repository";
import {
  decryptPiiFields,
  encryptPiiFields,
  hmacBlindIndex,
} from "../security/pii-encrypt";

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

const NEWSLETTER_PII_FIELDS = ["email", "ipAddress"];

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
    const perPage = Number(model.pageSize || "50");

    const result = await this.repo.findAll({
      filters: model.filters,
      sort: model.sorts || "-createdAt",
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 50,
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

  async findByEmail(
    email: string,
  ): Promise<NewsletterSubscriberDocument | null> {
    const normalized = email.toLowerCase();

    const byIndex = await this.repo.findWhere(
      "emailIndex",
      "==",
      hmacBlindIndex(normalized),
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
    const plaintext: Omit<
      NewsletterSubscriberDocument,
      "id" | "createdAt" | "updatedAt"
    > = {
      email: input.email.toLowerCase(),
      status: NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES.ACTIVE,
      source: input.source,
      ipAddress: input.ipAddress,
      subscribedAt: now,
      unsubscribedAt: null,
      resubscribedAt: undefined,
      adminNote: undefined,
      emailIndex: hmacBlindIndex(input.email.toLowerCase()),
    };

    const encrypted = encryptPiiFields(
      plaintext as Record<string, unknown>,
      NEWSLETTER_PII_FIELDS,
    ) as Omit<NewsletterSubscriberDocument, "id" | "createdAt" | "updatedAt">;

    const created = await this.repo.create(encrypted);
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
