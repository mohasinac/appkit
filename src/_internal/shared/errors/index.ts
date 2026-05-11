/** Base domain error — all appkit errors extend this. */
export class AppkitError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AppkitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppkitError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : resource, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppkitError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppkitError {
  constructor(action?: string) {
    super(action ? `Unauthorized: ${action}` : "Unauthorized", "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends AppkitError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class CapacityError extends AppkitError {
  constructor(message: string) {
    super(message, "CAPACITY_EXCEEDED");
    this.name = "CapacityError";
  }
}

export class ExpiredError extends AppkitError {
  constructor(resource: string) {
    super(`${resource} has expired`, "EXPIRED");
    this.name = "ExpiredError";
  }
}
