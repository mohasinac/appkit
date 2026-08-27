import type { IRepository, PagedResult, SieveQuery } from "../../../contracts";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { increment } from "../../../contracts/field-ops";
import { FAQ_FIELDS } from "../../../constants/field-names";
import {
  buildSearchTxt,
  matchesAllSearchTerms,
  parseSearchTxtQuery,
} from "../../../utils/search-txt";
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


/**
 * FAQ `searchTxt`. Exported so the seed derives byte-identical tokens — the
 * seed writes documents raw via batch.set() and never goes through this
 * repository, which is exactly why all 63 seeded FAQs had no tokens at all.
 *
 * EVERY field is prefix-expanded, including the answer body. An earlier version
 * whole-worded the body to protect the token budget, and a seed test caught what
 * that costs: searching "ship" returned FEWER FAQs than "shipping", because an
 * answer mentioning shipping had only the whole word indexed. Partial match that
 * silently excludes the body is not partial match.
 *
 * Measured over the real seed corpus: max 449 tokens, average 200, nothing near
 * the 600 cap — so nothing is truncated. Re-measure before reusing this shape on
 * a long-form collection (blog posts), where bodies are far larger.
 */
export function buildFaqSearchTxt(input: Partial<FAQDocument>): string[] {
  const answer =
    typeof input.answer === "string" ? input.answer : (input.answer?.text ?? "");
  return buildSearchTxt([
    input.question,
    input.category,
    ...(input.tags ?? []),
    answer.replace(/<[^>]+>/g, " "),
  ]);
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
    searchTxt: { canFilter: true, canSort: false },
    "stats.helpful": { canFilter: false, canSort: true },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(FAQS_COLLECTION);
  }

  override async create(data: Partial<FAQDocument>): Promise<FAQDocument> {
    const searchTxt = buildFaqSearchTxt(data as Partial<FAQDocument>);

    return super.create({
      ...data,
      searchTxt,
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
      searchTxt: buildFaqSearchTxt(merged),
    });
  }

  async list(
    model: SieveModel,
    opts?: { tags?: string[]; search?: string },
  ): Promise<FirebaseSieveResult<FAQDocument>> {
    let baseQuery = this.getCollection();
    const tags = opts?.tags?.filter(Boolean) ?? [];

    // Longest term first — only ONE may become the array-contains clause
    // (Firestore permits a single array operator per query), and the longest is
    // the cheapest proxy for "narrows the most" without cardinality stats.
    const terms = parseSearchTxtQuery(opts?.search ?? "");
    const rawSearch = (opts?.search ?? "").trim();

    // A query that produced no usable term must return NOTHING, not everything.
    // The old guard dropped tokens under 2 characters, so a 1-character search
    // silently fell through to the entire unfiltered list.
    if (rawSearch && terms.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0, hasMore: false };
    }

    // Firestore allows one array operator per query, so tags and search cannot
    // both be pushed down. Search takes the clause and tags refine in memory —
    // this used to throw a DatabaseError and fail the request outright.
    const pushTags = terms.length === 0;
    if (pushTags && tags.length === 1) {
      baseQuery = baseQuery.where(FAQ_FIELDS.TAGS, "array-contains", tags[0]) as any;
    } else if (pushTags && tags.length > 1) {
      baseQuery = baseQuery.where(FAQ_FIELDS.TAGS,
        "array-contains-any",
        tags.slice(0, 10),
      ) as any;
    }

    if (terms.length > 0) {
      baseQuery = baseQuery.where(
        FAQ_FIELDS.SEARCH_TXT,
        "array-contains",
        terms[0],
      ) as any;
    }

    const result = await this.sieveQuery<FAQDocument>(
      model,
      FirebaseFAQsRepository.SIEVE_FIELDS,
      { baseQuery },
    );

    // Refine the remaining terms (AND) and any tags that could not be pushed
    // down. `array-contains-any` would have been OR — "shipping cost" returning
    // everything matching either word is why search felt like it did nothing.
    const extraTerms = terms.slice(1);
    if (extraTerms.length === 0 && (pushTags || tags.length === 0)) return result;

    const items = result.items.filter(
      (faq) =>
        matchesAllSearchTerms(faq.searchTxt, extraTerms) &&
        (pushTags || tags.length === 0 || tags.some((t) => faq.tags?.includes(t))),
    );

    return {
      ...result,
      items,
      total: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      hasMore: false,
    };
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
      .where(FAQ_FIELDS.CATEGORY, "==", category)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(FAQ_FIELDS.ORDER, "asc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getHomepageFAQs(): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(FAQ_FIELDS.SHOW_ON_HOMEPAGE, "==", true)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(FAQ_FIELDS.PRIORITY, "desc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getFooterFAQs(): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(FAQ_FIELDS.SHOW_IN_FOOTER, "==", true)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(FAQ_FIELDS.ORDER, "asc")
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getPinnedFAQs(category?: FAQCategory): Promise<FAQDocument[]> {
    let query = this.db
      .collection(this.collection)
      .where(FAQ_FIELDS.IS_PINNED, "==", true)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true);

    if (category) {
      query = query.where(FAQ_FIELDS.CATEGORY, "==", category);
    }

    const snapshot = await query.orderBy(FAQ_FIELDS.ORDER, "asc").get();
    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async searchByTag(tag: string): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(FAQ_FIELDS.TAGS, "array-contains", tag)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true)
      .get();

    return snapshot.docs.map((doc) => this.mapDoc<FAQDocument>(doc));
  }

  async getMostHelpful(limit: number = 10): Promise<FAQDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(FAQ_FIELDS.IS_ACTIVE, "==", true)
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
      searchTxt: buildFaqSearchTxt(input as Partial<FAQDocument>),
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
