import { ConflictError, NotFoundError, ValidationError } from "../../errors/index";

export class CartFullError extends ConflictError {
  constructor(max: number) {
    super(`Cart cannot exceed ${max} items`);
    this.name = "CartFullError";
  }
}

export class CartItemNotFoundError extends NotFoundError {
  constructor(productId: string) {
    super("Cart item", productId);
    this.name = "CartItemNotFoundError";
  }
}

export class CartQuantityError extends ValidationError {
  constructor(message: string) {
    super(message, "quantity");
    this.name = "CartQuantityError";
  }
}
