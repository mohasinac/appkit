import { AppError } from "./base-error";

export class ApiError extends AppError {
  constructor(statusCode: number, message: string, data?: unknown) {
    super(statusCode, message, "API_ERROR", data);
  }
}
