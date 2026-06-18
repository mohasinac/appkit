import { AppError } from "./base-error";

export class AuthenticationError extends AppError {
  constructor(message: string, data?: unknown) {
    super(401, message, "AUTHENTICATION_ERROR", data);
  }
}
