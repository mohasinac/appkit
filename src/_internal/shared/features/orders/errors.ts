import { NotFoundError, ConflictError, UnauthorizedError } from "../../errors/index";

export class OrderNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Order", id);
    this.name = "OrderNotFoundError";
  }
}

export class OrderCancelError extends ConflictError {
  constructor(status: string) {
    super(`Cannot cancel order in status "${status}"`);
    this.name = "OrderCancelError";
  }
}

export class OrderOwnershipError extends UnauthorizedError {
  constructor(orderId: string) {
    super(`access order ${orderId}`);
    this.name = "OrderOwnershipError";
  }
}

export class OrderReturnWindowError extends ConflictError {
  constructor() {
    super("Return window has expired");
    this.name = "OrderReturnWindowError";
  }
}
