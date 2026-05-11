import { NotFoundError, ValidationError, UnauthorizedError, ConflictError } from "../../errors/index";

export class ProductNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Product", id);
    this.name = "ProductNotFoundError";
  }
}

export class ProductValidationError extends ValidationError {
  constructor(message: string, field?: string) {
    super(message, field);
    this.name = "ProductValidationError";
  }
}

export class ProductOwnershipError extends UnauthorizedError {
  constructor(productId: string) {
    super(`modify product ${productId}`);
    this.name = "ProductOwnershipError";
  }
}

export class ProductStatusError extends ConflictError {
  constructor(from: string, to: string) {
    super(`Cannot transition product from "${from}" to "${to}"`);
    this.name = "ProductStatusError";
  }
}

export class ProductStockError extends ConflictError {
  constructor(message: string) {
    super(message);
    this.name = "ProductStockError";
  }
}
