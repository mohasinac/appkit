import { NotFoundError, ConflictError, ValidationError } from "../../errors/index";

export class PreOrderNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Pre-order", id);
    this.name = "PreOrderNotFoundError";
  }
}

export class PreOrderSoldOutError extends ConflictError {
  constructor(id: string) {
    super(`Pre-order ${id} has reached maximum quantity`);
    this.name = "PreOrderSoldOutError";
  }
}

export class PreOrderNotOpenError extends ConflictError {
  constructor(status: string) {
    super(`Pre-order reservations are not open (status: ${status})`);
    this.name = "PreOrderNotOpenError";
  }
}

export class PreOrderDepositError extends ValidationError {
  constructor(message: string) {
    super(message, "deposit");
    this.name = "PreOrderDepositError";
  }
}
