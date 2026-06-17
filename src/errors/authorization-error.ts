import { AppError } from "./base-error";

export class AuthorizationError extends AppError {
  // audit-unknown-ok: AuthorizationError data
  constructor(message: string, data?: unknown) {
    super(403, message, "AUTHORIZATION_ERROR", data);
  }
}
