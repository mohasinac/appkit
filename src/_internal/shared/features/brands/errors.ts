import { NotFoundError, ConflictError } from "../../errors/index";

export class BrandNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Brand", id);
    this.name = "BrandNotFoundError";
  }
}

export class BrandSlugConflictError extends ConflictError {
  constructor(slug: string) {
    super(`A brand with slug "${slug}" already exists`);
    this.name = "BrandSlugConflictError";
  }
}
