import { NotFoundError, ConflictError, ValidationError, ExpiredError } from "../../errors/index";

export class CouponNotFoundError extends NotFoundError {
  constructor(code: string) {
    super("Coupon", code);
    this.name = "CouponNotFoundError";
  }
}

export class CouponExpiredError extends ExpiredError {
  constructor(code: string) {
    super(`Coupon ${code}`);
    this.name = "CouponExpiredError";
  }
}

export class CouponUsageLimitError extends ConflictError {
  constructor(code: string) {
    super(`Coupon "${code}" has reached its usage limit`);
    this.name = "CouponUsageLimitError";
  }
}

export class CouponPerUserLimitError extends ConflictError {
  constructor(code: string) {
    super(`You have already used coupon "${code}" the maximum number of times`);
    this.name = "CouponPerUserLimitError";
  }
}

export class CouponMinPurchaseError extends ValidationError {
  constructor(minAmount: number) {
    super(`Minimum purchase of ₹${(minAmount / 100).toLocaleString("en-IN")} required for this coupon`, "total");
    this.name = "CouponMinPurchaseError";
  }
}

export class CouponScopeError extends ValidationError {
  constructor() {
    super("This coupon is not valid for your cart");
    this.name = "CouponScopeError";
  }
}
