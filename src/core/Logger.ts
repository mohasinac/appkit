/**
 * Logger Class — @mohasinac/core
 *
 * Singleton class for application logging.
 * Pure utility — no framework or app-specific imports.
 *
 * The `logFileUrl` constructor option replaces the previous app-specific
 * `import("@/constants")` call, making this usable in any context.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableStorage?: boolean;
  /**
   * URL to POST error log entries. Set to your `/api/logs/write` route.
   */
  logFileUrl?: string;
  /**
   * @deprecated Prefer `logFileUrl`. When `true` and `logFileUrl` is not set,
   * defaults to `/api/logs/write` for backward compatibility with the
   * previous app-coupled Logger implementation.
   */
  enableFileLogging?: boolean;
  maxEntries?: number;
  /** Optional function to sanitize data before logging (e.g., PII redaction). */
  sanitizer?: (data: unknown) => unknown;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private options: Required<
    Omit<LoggerOptions, "logFileUrl" | "enableFileLogging" | "sanitizer">
  > & {
    logFileUrl?: string;
    sanitizer?: (data: unknown) => unknown;
  };
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private constructor(options?: LoggerOptions) {
    // `enableFileLogging: true` is a backward-compat alias for logFileUrl.
    const fileUrl =
      options?.logFileUrl ??
      (options?.enableFileLogging ? "/api/logs/write" : undefined);
    this.options = {
      minLevel: options?.minLevel ?? "debug",
      enableConsole: options?.enableConsole ?? true,
      enableStorage: options?.enableStorage ?? false,
      logFileUrl: fileUrl,
      maxEntries: options?.maxEntries ?? 1000,
      sanitizer: options?.sanitizer,
    };
  }

  /** Get singleton instance */
  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /** Set or update the data sanitizer (e.g., for PII redaction). */
  public static setSanitizer(fn: (data: unknown) => unknown): void {
    Logger.getInstance().options.sanitizer = fn;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      this.levelPriority[level] >= this.levelPriority[this.options.minLevel]
    );
  }

  private addLog(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const sanitized =
      data && this.options.sanitizer ? this.options.sanitizer(data) : data;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data: sanitized,
    };

    this.logs.push(entry);
    if (this.logs.length > this.options.maxEntries) {
      this.logs.shift();
    }

    if (this.options.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.options.enableStorage && typeof window !== "undefined") {
      this.saveToStorage();
    }

    if (this.options.logFileUrl && level === "error") {
      this.writeToFile(entry).catch(() => {
        // Silently fail to prevent recursive logging
      });
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp.toISOString()}`;
    const message = `${prefix} ${entry.message}`;
    switch (entry.level) {
      case "debug":
        console.debug(message, entry.data);
        break;
      case "info":
        console.info(message, entry.data);
        break;
      case "warn":
        console.warn(message, entry.data);
        break;
      case "error":
        console.error(message, entry.data);
        break;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("app_logs", JSON.stringify(this.logs));
    } catch {
      // Silently fail
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (typeof window === "undefined" || !this.options.logFileUrl) return;
    try {
      await fetch(this.options.logFileUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          data: entry.data,
        }),
      });
    } catch {
      // Silently fail
    }
  }

  public debug(message: string, data?: unknown): void {
    this.addLog("debug", message, data);
  }

  public info(message: string, data?: unknown): void {
    this.addLog("info", message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.addLog("warn", message, data);
  }

  public error(message: string, data?: unknown): void {
    this.addLog("error", message, data);
  }

  public getLogs(level?: LogLevel): LogEntry[] {
    if (level) return this.logs.filter((log) => log.level === level);
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
    if (this.options.enableStorage && typeof window !== "undefined") {
      localStorage.removeItem("app_logs");
    }
  }

  public export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public getStats(): Record<LogLevel, number> {
    return {
      debug: this.logs.filter((l) => l.level === "debug").length,
      info: this.logs.filter((l) => l.level === "info").length,
      warn: this.logs.filter((l) => l.level === "warn").length,
      error: this.logs.filter((l) => l.level === "error").length,
    };
  }
}

/** Shared singleton instance */
export const logger = Logger.getInstance();
