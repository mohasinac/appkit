export { AppError } from "./base-error";
export { ERROR_CODES } from "./error-codes";
export type { ErrorCode } from "./error-codes";
export { ERROR_MESSAGES } from "./messages";
// Note: appkit/src/errors has two ERROR_MESSAGE patterns:
// - ERROR_CODES.AUTH_001 → "Invalid email or password" (code-based)
// - ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS → "..." (category-based, consumer-friendly)
// Consumers typically use ERROR_MESSAGES for user-facing messages.
export { ApiError } from "./api-error";
export { ValidationError } from "./validation-error";
export { AuthenticationError } from "./authentication-error";
export { AuthorizationError } from "./authorization-error";
export { NotFoundError } from "./not-found-error";
export { DatabaseError } from "./database-error";
// error-handler uses `next/server` — only import in server/API-route contexts
export { handleApiError, logError, isAppError } from "./error-handler";
