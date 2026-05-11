import { NotFoundError, ConflictError, UnauthorizedError } from "../../errors/index";

export class ReviewNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Review", id);
    this.name = "ReviewNotFoundError";
  }
}

export class DuplicateReviewError extends ConflictError {
  constructor(productId: string) {
    super(`You have already reviewed product ${productId}`);
    this.name = "DuplicateReviewError";
  }
}

export class ReviewOwnershipError extends UnauthorizedError {
  constructor() {
    super("modify this review");
    this.name = "ReviewOwnershipError";
  }
}

export class ReviewNotVerifiedError extends ConflictError {
  constructor() {
    super("You must purchase this product before reviewing it");
    this.name = "ReviewNotVerifiedError";
  }
}
