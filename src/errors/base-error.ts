export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): {
    success: false;
    error: string;
    code: string;
    statusCode: number;
    data?: unknown;
  } {
    return {
      success: false,
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.data !== undefined && { data: this.data }),
    };
  }
}
