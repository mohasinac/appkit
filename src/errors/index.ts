export { AppError } from "./base-error";
export { ERROR_CODES, ERROR_MESSAGES } from "./error-codes";
export type { ErrorCode } from "./error-codes";
export { ApiError } from "./api-error";
export { ValidationError } from "./validation-error";
export { AuthenticationError } from "./authentication-error";
export { AuthorizationError } from "./authorization-error";
export { NotFoundError } from "./not-found-error";
export { DatabaseError } from "./database-error";
// error-handler uses `next/server` — only import in server/API-route contexts
export { handleApiError, logError, isAppError } from "./error-handler";
