// appkit/src/seed/factories/blog-post.factory.ts
let _seq = 1;

export interface SeedBlogPostDocument {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  authorId: string;
  status: "published" | "draft" | "archived";
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function makeBlogPost(
  overrides: Partial<SeedBlogPostDocument> = {},
): SeedBlogPostDocument {
  const n = _seq++;
  const now = new Date();
  const slug = overrides.slug ?? `blog-post-${n}`;
  return {
    id: overrides.id ?? `blog-${n}`,
    title: overrides.title ?? `Blog Post ${n}`,
    slug,
    content: overrides.content ?? "<p>Blog post content goes here.</p>",
    excerpt: overrides.excerpt ?? "A brief excerpt of the blog post.",
    coverImage: overrides.coverImage ?? "",
    authorId: overrides.authorId ?? "user-1",
    status: overrides.status ?? "published",
    tags: overrides.tags ?? [],
    publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : now,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}
