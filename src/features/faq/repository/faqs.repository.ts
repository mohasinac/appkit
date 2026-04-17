import "server-only";
import type { IRepository, PagedResult, SieveQuery } from "../../../contracts";
import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { increment } from "../../../contracts/field-ops";
import type { FAQ, FAQCategory } from "../types";
import {
  FAQS_COLLECTION,
  FAQDocument,
  FAQCreateInput,
  FAQWithInterpolatedAnswer,
  createFAQId,
  slugifyQuestion,
} from "../schemas";

export class FAQsRepository {
  constructor(private readonly repo: IRepository<FAQ>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<FAQ>> {
    const base: SieveQuery = { filters: "isActive==true", ...query };
    if (query?.filters) {
      base.filters = `isActive==true,${query.filters}`;
    }
    return this.repo.findAll(base);
  }

  async findByCategory(category: FAQCategory): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: `isActive==true,category==${category}`,
      sort: "order",
      perPage: 100,
    });
    return result.data;
  }

  async findForHomepage(): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: "isActive==true,showOnHomepage==true",
      sort: "priority",
      perPage: 10,
    });
    return result.data;
  }

  async findForFooter(): Promise<FAQ[]> {
    const result = await this.repo.findAll({
      filters: "isActive==true,showInFooter==true",
      sort: "order",
      perPage: 20,
    });
    return result.data;
  }

  async findById(id: string): Promise<FAQ | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<FAQ, "id">): Promise<FAQ> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<FAQ>): Promise<FAQ> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export class FirebaseFAQsRepository extends BaseRepository<FAQDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    question: { canFilter: true, canSort: true },
    category: { canFilter: true, canSort: true },
    isActive: { canFilter: true, canSort: false },
    showOnHomepage: { canFilter: true, canSort: false },
    showInFooter: { canFilter: true, canSort: false },
    isPinned: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    priority: { canFilter: true, canSort: true },
    tags: { canFilter: true, canSort: false },
    searchTokens: { canFilter: true, canSort: false },
    "stats.helpful": { canFilter: false, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(FAQS_COLLECTION);
  }

  private buildSearchTokens(
    input: Pick<FAQDocument, "question" | "answer" | "tags" | "category">,
  ): string[] {
    const rawText = [
      input.question,
      typeof input.answer === "string" ? input.answer : input.answer?.text,
      input.category,
      ...(input.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return Array.from(
      new Set(
        rawText
          .split(/[^a-z0-9]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 2),
      ),
    ).slice(0, 50);
  }

  override async create(data: Partial<FAQDocument>): Promise<FAQDocument> {
    const searchTokens = this.buildSearchTokens({
      question: data.question ?? "",
      answer: (data.answer as FAQDocument["answer"]) ?? {
        text: "",
        format: "plain",
      },
      tags: data.tags ?? [],
      category: (data.category ?? "general") as FAQCategory,
    });

    return super.create({
      ...data,
      searchTokens,
    });
  }

  override async update(
    id: string,
    data: Partial<FAQDocument>,
  ): Promise<FAQDocument> {
    const current = await this.findById(id);
    if (!current) {
      throw new DatabaseError(`Failed to update FAQ: missing document ${id}`);
    }

    const merged = {
      ...current,
      ...data,
    } as FAQDocument;

    return super.update(id, {
      ...data,
      searchTokens: this.buildSearchTokens({
        question: merged.question,
        answer: merged.answer,
        tags: merged.tags ?? [],
        category: merged.category,
      }),
    });
  }

  async list(
    model: SieveModel,
    opts?: { tags?: string[]; search?: string },
  ): Promise<FirebaseSieveResult<FAQDocument>> {
    let baseQuery = this.getCollection();
    const tags = opts?.tags?.filter(Boolean) ?? [];
    const searchTokens = (opts?.search ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .slice(0, 10);

    if (tags.length > 0 && searchTokens.length > 0) {
      throw new DatabaseError(
        "Combining FAQ tag filters and token search requires a dedicated search index",
      );
    }

    if (tags.length === 1) {
      baseQuery = baseQuery.where("tags", "array-contains", tags[0]) as any;
    } else if (tags.length > 1) {
      baseQuery = baseQuery.where(
        "tags",
        "array-contains-any",
        tags.slice(0, 10),
      ) as any;
    }

    if (searchTokens.length === 1) {
      baseQuery = baseQuery.where(
        "searchTokens",
        "array-contains",
        searchTokens[0],
      ) as any;
    } else if (searchTokens.length > 1) {
      baseQuery = baseQuery.where(
        "searchTokens",
        "array-contains-any",
        searchTokens,
      ) as any;
    }

    return this.sieveQuery<FAQDocument>(
      model,
      FirebaseFAQsRepository.SIEVE_FIELDS,
      { baseQuery },
    );
  }

  async getFAQBySlug(slug: string): Promise<FAQDocument | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("seo.slug", "==", slug)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDoc<FAQDocument>(snapshot.docs[0]);
  }

  async getFAQsByCategory(category: FAQCategory): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("category", "==", category)
      .where("isActive", "==", true)
      .orderBy("order", "asc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getHomepageFAQs(): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("showOnHomepage", "==", true)
      .where("isActive", "==", true)
      .orderBy("priority", "desc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getFooterFAQs(): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("showInFooter", "==", true)
      .where("isActive", "==", true)
      .orderBy("order", "asc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getPinnedFAQs(category?: FAQCategory): Promise<FAQDocument[]> {
    let query = this.db
      .collection(this.collection)
      .where("isPinned", "==", true)
      .where("isActive", "==", true);

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.orderBy("order", "asc").get();
    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async searchByTag(tag: string): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("tags", "array-contains", tag)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getMostHelpful(limit: number = 10): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where("isActive", "==", true)
      .orderBy("stats.helpful", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async interpolateVariables(
    faq: FAQDocument,
    variables?: Record<string, string | number>,
  ): Promise<FAQWithInterpolatedAnswer> {
    const allVariables = variables ?? {};
    let interpolatedText = faq.answer.text;
    const regex = /\{\{(\w+)\}\}/g;
    const placeholders = Array.from(
      interpolatedText.matchAll(regex),
      (m) => m[1],
    );

    for (const variableName of placeholders) {
      const value = allVariables[variableName] ?? faq.variables?.[variableName];
      if (value !== undefined) {
        interpolatedText = interpolatedText.replace(
          new RegExp(`\\{\\{${variableName}\\}\\}`, "g"),
          String(value),
        );
      }
    }

    return {
      ...faq,
      answer: {
        ...faq.answer,
        interpolated: interpolatedText,
      },
    };
  }

  async incrementViews(faqId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(faqId)
      .update({
        "stats.views": increment(1),
        "stats.lastViewed": new Date(),
      });
  }

  async markHelpful(faqId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(faqId)
      .update({
        "stats.helpful": increment(1),
      });
  }

  async markNotHelpful(faqId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(faqId)
      .update({
        "stats.notHelpful": increment(1),
      });
  }

  async createWithSlug(input: FAQCreateInput): Promise<FAQDocument> {
    const slug = input.seo?.slug?.trim() || slugifyQuestion(input.question);
    const id = createFAQId(input.category, input.question);

    const faqData: Omit<FAQDocument, "id"> = {
      ...input,
      seo: {
        ...input.seo,
        slug,
      },
      searchTokens: this.buildSearchTokens({
        question: input.question,
        answer: input.answer,
        tags: input.tags ?? [],
        category: input.category,
      }),
      stats: {
        views: 0,
        helpful: 0,
        notHelpful: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(faqData));

    return { id, ...faqData };
  }

  async getRelatedFAQs(faqId: string): Promise<FAQDocument[]> {
    const faq = await this.findById(faqId);
    if (!faq || !faq.relatedFAQs || faq.relatedFAQs.length === 0) {
      return [];
    }

    const relatedFAQs: FAQDocument[] = [];
    for (const relatedId of faq.relatedFAQs) {
      const relatedFAQ = await this.findById(relatedId);
      if (relatedFAQ && relatedFAQ.isActive) {
        relatedFAQs.push(relatedFAQ);
      }
    }

    return relatedFAQs;
  }
}

export const faqsRepository = new FirebaseFAQsRepository();
