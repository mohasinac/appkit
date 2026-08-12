import { AppError } from "./base-error";

export class ConflictError extends AppError {
  constructor(message: string, code: string = "CONFLICT", data?: unknown) {
    super(409, message, code, data);
  }
}
