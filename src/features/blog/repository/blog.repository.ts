import type { JsonValue } from "../../../schemas/types";
import { DatabaseError } from "../../../errors";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import {
  BLOG_POST_FIELDS,
  BLOG_POSTS_COLLECTION,
  type BlogPostCreateInput,
  type BlogPostDocument,
  type BlogPostUpdateInput,
} from "../schemas";
import type { BlogPostCategory, BlogPostStatus } from "../types";
import { createBlogPostId } from "../schemas";
import { increment } from "../../../contracts/field-ops";
import { buildBlogSearchTxt } from "../../../utils/search-txt-builders";
import {
  planSearchTxt,
  refineSearchTxt,
  emptySearchResult,
} from "../../../utils/search-txt-query";

class BlogRepository extends BaseRepository<BlogPostDocument> {
  constructor() {
    super(BLOG_POSTS_COLLECTION);
  }

  async findBySlug(slug: string): Promise<BlogPostDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BLOG_POST_FIELDS.SLUG, "==", slug)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return this.mapDoc<BlogPostDocument>(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find blog post by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  override async create(input: BlogPostCreateInput): Promise<BlogPostDocument> {
    try {
      const now = new Date();
      const id = createBlogPostId(input.title, input.category);
      const data = prepareForFirestore({
        ...input,
        views: input.views ?? 0,
        createdAt: now,
        updatedAt: now,
      });

      await this.db.collection(this.collection).doc(id).set(data);

      return { id, ...data } as BlogPostDocument;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to create blog post: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  override async update(
    id: string,
    input: BlogPostUpdateInput,
  ): Promise<BlogPostDocument> {
    try {
      const data = prepareForFirestore({ ...input, updatedAt: new Date() });
      await this.db.collection(this.collection).doc(id).update(data);

      const doc = await this.findByIdOrFail(id);
      return doc;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to update blog post: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  override async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collection).doc(id).delete();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to delete blog post: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async incrementViews(id: string): Promise<void> {
    try {
      await this.db
        .collection(this.collection)
        .doc(id)
        .update({ [BLOG_POST_FIELDS.VIEWS]: increment(1) });
    } catch (_err) {
      void normalizeError(_err);
      // Fire-and-forget by design.
    }
  }

  async findRelated(
    category: BlogPostCategory,
    excludeId: string,
    limit = 3,
  ): Promise<BlogPostDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BLOG_POST_FIELDS.STATUS, "==", "published" as BlogPostStatus)
        .where(BLOG_POST_FIELDS.CATEGORY, "==", category)
        .orderBy(BLOG_POST_FIELDS.PUBLISHED_AT, "desc")
        .limit(limit + 1)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<BlogPostDocument>(doc))
        .filter((post) => post.id !== excludeId)
        .slice(0, limit);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find related posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Published posts sharing at least one tag with the given list.
   * `array-contains-any` caps at 10 values, so only the first 10 tags are used.
   */
  async findByTagsOverlap(
    tags: string[],
    excludeId: string,
    limit = 3,
  ): Promise<BlogPostDocument[]> {
    if (tags.length === 0) return [];
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BLOG_POST_FIELDS.STATUS, "==", "published" as BlogPostStatus)
        .where(BLOG_POST_FIELDS.TAGS, "array-contains-any", tags.slice(0, 10))
        .limit(limit + 1)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<BlogPostDocument>(doc))
        .filter((post) => post.id !== excludeId)
        .slice(0, limit);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find posts by tag overlap: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /** Other published posts by the same author. */
  async findByAuthor(
    authorId: string,
    excludeId: string,
    limit = 3,
  ): Promise<BlogPostDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(BLOG_POST_FIELDS.STATUS, "==", "published" as BlogPostStatus)
        .where(BLOG_POST_FIELDS.AUTHOR_ID, "==", authorId)
        .orderBy(BLOG_POST_FIELDS.PUBLISHED_AT, "desc")
        .limit(limit + 1)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<BlogPostDocument>(doc))
        .filter((post) => post.id !== excludeId)
        .slice(0, limit);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to find posts by author: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static readonly SIEVE_FIELDS = {
    searchTxt: { canFilter: true, canSort: false },
    id: { canFilter: true, canSort: false },
    title: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    category: { canFilter: true, canSort: true },
    authorName: { canFilter: true, canSort: true },
    authorId: { canFilter: true, canSort: false },
    isFeatured: { canFilter: true, canSort: false },
    readTimeMinutes: { canFilter: true, canSort: true },
    views: { canFilter: true, canSort: true },
    publishedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    tags: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  async listPublished(
    opts: { category?: BlogPostCategory; featuredOnly?: boolean },
    model: SieveModel,
  ): Promise<FirebaseSieveResult<BlogPostDocument>> {
    let baseQuery = this.getCollection().where(
      BLOG_POST_FIELDS.STATUS,
      "==",
      "published" as BlogPostStatus,
    );

    if (opts?.category) {
      baseQuery = baseQuery.where(
        BLOG_POST_FIELDS.CATEGORY,
        "==",
        opts.category,
      ) as typeof baseQuery;
    }

    if (opts?.featuredOnly) {
      baseQuery = baseQuery.where(
        BLOG_POST_FIELDS.IS_FEATURED,
        "==",
        true,
      ) as typeof baseQuery;
    }

    return this.sieveQuery<BlogPostDocument>(
      model,
      BlogRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 12,
        maxPageSize: 50,
      },
    );
  }

  /** Derived on every write path via `applyWriteHooks`. */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildBlogSearchTxt(data as Partial<BlogPostDocument>);
  }

  async listAll(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<BlogPostDocument>> {
    const plan = planSearchTxt(opts?.search);
    if (plan.empty) return emptySearchResult<BlogPostDocument>();

    let baseQuery = this.getCollection();
    if (plan.head) {
      baseQuery = baseQuery.where(
        BLOG_POST_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    const result = await this.sieveQuery<BlogPostDocument>(
      model,
      BlogRepository.SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
    return refineSearchTxt(result, plan.rest);
  }
}

const blogRepository = new BlogRepository();

export { BlogRepository, blogRepository };
