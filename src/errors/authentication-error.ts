import { AppError } from "./base-error";

export class AuthenticationError extends AppError {
  // audit-unknown-ok: AuthError data — caller-defined
  constructor(message: string, data?: unknown) {
    super(401, message, "AUTHENTICATION_ERROR", data);
  }
}
