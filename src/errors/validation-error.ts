import { AppError } from "./base-error";

export class ValidationError extends AppError {
  // audit-unknown-ok: ValidationError issues from Zod
  constructor(message: string, fields?: unknown) {
    super(400, message, "VALIDATION_ERROR", fields);
  }
}
