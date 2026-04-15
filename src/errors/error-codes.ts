export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: "AUTH_001",
  AUTH_TOKEN_EXPIRED: "AUTH_002",
  AUTH_TOKEN_INVALID: "AUTH_003",
  AUTH_SESSION_EXPIRED: "AUTH_004",
  AUTH_EMAIL_NOT_VERIFIED: "AUTH_005",

  // Validation
  VALIDATION_REQUIRED_FIELD: "VAL_001",
  VALIDATION_INVALID_INPUT: "VAL_002",
  VALIDATION_INVALID_EMAIL: "VAL_003",
  VALIDATION_INVALID_PASSWORD: "VAL_004",
  VALIDATION_INVALID_PHONE: "VAL_005",

  // User
  USER_NOT_FOUND: "USER_001",
  USER_ALREADY_EXISTS: "USER_002",
  USER_NOT_AUTHENTICATED: "USER_003",
  USER_ACCOUNT_DISABLED: "USER_004",

  // Database
  DB_OPERATION_FAILED: "DB_001",
  DB_NOT_FOUND: "DB_002",
  DB_DUPLICATE_ENTRY: "DB_003",

  // Email
  EMAIL_SEND_FAILED: "EMAIL_001",
  EMAIL_INVALID_TEMPLATE: "EMAIL_002",
  EMAIL_RATE_LIMITED: "EMAIL_003",
  EMAIL_DELIVERY_FAILED: "EMAIL_004",

  // Password
  PWD_RESET_TOKEN_EXPIRED: "PWD_001",
  PWD_RESET_TOKEN_INVALID: "PWD_002",
  PWD_TOO_WEAK: "PWD_003",
  PWD_HISTORY_REUSE: "PWD_004",
  PWD_SAME_AS_CURRENT: "PWD_005",

  // Authorization
  AUTHZ_FORBIDDEN: "AUTHZ_001",
  AUTHZ_INSUFFICIENT_ROLE: "AUTHZ_002",

  // General
  GEN_BAD_REQUEST: "GEN_001",
  GEN_NOT_FOUND: "GEN_002",
  GEN_INTERNAL_ERROR: "GEN_003",
  GEN_SERVICE_UNAVAILABLE: "GEN_004",
  GEN_RATE_LIMITED: "GEN_005",
  GEN_UNKNOWN: "GEN_999",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * ERROR_MESSAGES_BY_CODE - Flat mapping from error codes to locale-neutral technical messages.
 * For user-facing error messages with category/context, use ERROR_MESSAGES from @mohasinac/appkit/errors which exports from messages.ts.
 * @deprecated Prefer the categorized ERROR_MESSAGES from messages.ts instead.
 */
export const ERROR_MESSAGES_BY_CODE: Record<ErrorCode, string> = {
  // Authentication
  AUTH_001: "Invalid email or password",
  AUTH_002: "Your session has expired. Please log in again",
  AUTH_003: "Invalid authentication token",
  AUTH_004: "Your session has expired. Please log in again",
  AUTH_005: "Please verify your email address before logging in",

  // Validation
  VAL_001: "This field is required",
  VAL_002: "Invalid input provided",
  VAL_003: "Please enter a valid email address",
  VAL_004:
    "Password must be at least 12 characters with uppercase, lowercase, number and special character",
  VAL_005: "Please enter a valid phone number",

  // User
  USER_001: "User not found",
  USER_002: "An account with this email already exists",
  USER_003: "Please log in to continue",
  USER_004: "Your account has been disabled. Please contact support",

  // Database
  DB_001: "A database error occurred. Please try again",
  DB_002: "The requested resource was not found",
  DB_003: "This record already exists",

  // Email
  EMAIL_001: "Failed to send email. Please try again",
  EMAIL_002: "Invalid email template",
  EMAIL_003: "Too many emails sent. Please wait before trying again",
  EMAIL_004: "Email delivery failed. Please check the address and try again",

  // Password
  PWD_001: "Password reset link has expired. Please request a new one",
  PWD_002: "Invalid password reset link",
  PWD_003: "Password does not meet security requirements",
  PWD_004: "Cannot reuse a recent password",
  PWD_005: "New password must be different from your current password",

  // Authorization
  AUTHZ_001: "You do not have permission to perform this action",
  AUTHZ_002: "Insufficient role to perform this action",

  // General
  GEN_001: "Bad request",
  GEN_002: "The requested resource was not found",
  GEN_003: "An internal server error occurred",
  GEN_004: "Service temporarily unavailable",
  GEN_005: "Too many requests. Please slow down",
  GEN_999: "An unknown error occurred",
};
