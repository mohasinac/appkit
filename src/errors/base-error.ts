export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code: string,
    public data?: unknown,
  ) {
    // Forward `data` as the standard `cause` when it is itself an Error.
    //
    // Every AppError in this codebase is a WRAP — `new DatabaseError("Batch
    // write failed: …", originalError)` — and until 2026-08-28 the original was
    // bound only to `data`, never to `cause`. Nothing that walks the cause chain
    // (util.inspect, the Next error overlay, any APM, our own serverErrors
    // recorder) could reach it, so the underlying fault was retained in memory
    // and dropped by every consumer.
    //
    // `captureStackTrace` below additionally rebases `.stack` onto this
    // constructor, so the wrapper's own stack starts at the catch block that
    // wrapped it — the frames that named the real fault live ONLY on the cause.
    // That is why preserving it is load-bearing rather than cosmetic.
    super(message, data instanceof Error ? { cause: data } : undefined);
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
