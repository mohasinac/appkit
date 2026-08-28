import { AppError } from "./base-error";
import { ERROR_CODES } from "./error-codes";

export class DatabaseError extends AppError {
  constructor(message: string, data?: unknown) {
    // `ERROR_CODES.DB_OPERATION_FAILED` ("DB_001"), NOT the literal
    // "DATABASE_ERROR" this used to emit.
    //
    // That literal had exactly one reference in the entire repo — this line.
    // It was absent from ERROR_CODES, HTTP_ERROR_CODES, ERROR_DISPLAY_MAP and
    // messages/en.json, so all ~193 DatabaseError throw sites produced a code
    // no lookup could resolve and every one of them fell through to the raw
    // internal message. "DB_001" already has both a display-map entry and the
    // translation "A database error occurred. Please try again".
    super(500, message, ERROR_CODES.DB_OPERATION_FAILED, data);
  }
}
