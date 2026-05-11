import { NotFoundError, UnauthorizedError, ConflictError } from "../../errors/index";

export class BlogPostNotFoundError extends NotFoundError {
  constructor(slug: string) {
    super("Blog post", slug);
    this.name = "BlogPostNotFoundError";
  }
}

export class BlogPostNotPublishedError extends UnauthorizedError {
  constructor(slug: string) {
    super(`view unpublished blog post ${slug}`);
    this.name = "BlogPostNotPublishedError";
  }
}

export class BlogSlugConflictError extends ConflictError {
  constructor(slug: string) {
    super(`A blog post with slug "${slug}" already exists`);
    this.name = "BlogSlugConflictError";
  }
}
