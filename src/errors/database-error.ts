import { AppError } from "./base-error";

export class DatabaseError extends AppError {
  // audit-unknown-ok: DatabaseError data
  constructor(message: string, data?: unknown) {
    super(500, message, "DATABASE_ERROR", data);
  }
}
