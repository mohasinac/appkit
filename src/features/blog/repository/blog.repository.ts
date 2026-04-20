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
  BLOG_POST_FIELDS,
  BLOG_POSTS_COLLECTION,
  type BlogPostCreateInput,
  type BlogPostDocument,
  type BlogPostUpdateInput,
} from "../schemas";
import type { BlogPostCategory, BlogPostStatus } from "../types";
import { createBlogPostId } from "../schemas";
import { increment } from "../../../contracts/field-ops";

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
      throw new DatabaseError(
        `Failed to find blog post by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async create(input: BlogPostCreateInput): Promise<BlogPostDocument> {
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
      throw new DatabaseError(
        `Failed to create blog post: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async update(
    id: string,
    input: BlogPostUpdateInput,
  ): Promise<BlogPostDocument> {
    try {
      const data = prepareForFirestore({ ...input, updatedAt: new Date() });
      await this.db.collection(this.collection).doc(id).update(data);

      const doc = await this.findByIdOrFail(id);
      return doc;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update blog post: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collection).doc(id).delete();
    } catch (error) {
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
    } catch {
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
      throw new DatabaseError(
        `Failed to find related posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static readonly SIEVE_FIELDS = {
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
    publishedAt: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
    tags: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
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

  async listAll(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<BlogPostDocument>> {
    return this.sieveQuery<BlogPostDocument>(
      model,
      BlogRepository.SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }
}

const blogRepository = new BlogRepository();

export { BlogRepository, blogRepository };
