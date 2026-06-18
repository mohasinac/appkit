import { AppError } from "./base-error";

export class NotFoundError extends AppError {
  constructor(message: string, data?: unknown) {
    super(404, message, "NOT_FOUND", data);
  }
}
