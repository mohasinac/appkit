import { AppError } from "./base-error";

export class RazorpayUnreachableError extends AppError {
  // audit-unknown-ok: RazorpayUnreachable data
  constructor(message = "Payment provider unreachable", data?: unknown) {
    super(503, message, "UPSTREAM_UNAVAILABLE", data);
  }
}
