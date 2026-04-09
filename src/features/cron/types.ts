/**
 * Cron job types for @mohasinac/appkit/cron.
 *
 * Provides a strongly-typed system for defining, registering, and dispatching
 * scheduled Firebase Function jobs (onSchedule + Pub/Sub).
 *
 * No Firebase SDK imported here — types only.
 */

// ─── Job context ──────────────────────────────────────────────────────────────

/** Context passed into every scheduled job at runtime. */
export interface JobContext {
  /** ISO 8601 string of the time this job was scheduled to run. */
  scheduleTime: string;
  /** Logical name registered in the CronRegistry. */
  jobName: string;
  /** Optional pub/sub message data (base64 decoded string). */
  messageData?: string;
}

/** Result returned from every job handler. */
export interface JobResult {
  /** Human-readable summary of what happened. */
  summary: string;
  /** Number of records/items processed. */
  processed: number;
  /** Number of errors encountered (0 = clean run). */
  errors: number;
  /** Any extra key/value metadata the job wants to surface. */
  meta?: Record<string, unknown>;
}

// ─── Job definition ───────────────────────────────────────────────────────────

/** The async function that runs when the job is triggered. */
export type ScheduledJobFn = (ctx: JobContext) => Promise<JobResult>;

/** A pub/sub triggered job function. */
export type PubSubJobFn = (
  data: string | null,
  ctx: Omit<JobContext, "messageData">,
) => Promise<JobResult>;

/** Full job definition stored in the registry. */
export interface CronJobDefinition {
  /** Unique name for this job (used in logs and pub/sub topic). */
  name: string;
  /** Human-readable description. */
  description: string;
  /**
   * Cron schedule string (Firebase/Cloud Scheduler format).
   * Example: "every 5 minutes" | "0 * * * *"
   */
  schedule: string;
  /** Timezone for the schedule. Default: "UTC". */
  timezone?: string;
  /** Memory allocation for the Function. Default: "256MB". */
  memory?: "128MB" | "256MB" | "512MB" | "1GB" | "2GB";
  /** Timeout in seconds. Default: 60. */
  timeoutSeconds?: number;
  /** The async handler that runs on each invocation. */
  handler: ScheduledJobFn;
}

/** Options for createCronJob() factory. */
export type CreateCronJobOptions = Omit<CronJobDefinition, "handler">;

// ─── Registry types ───────────────────────────────────────────────────────────

/** Map of job name → definition. */
export type CronRegistry = Map<string, CronJobDefinition>;

/** Summary of all registered jobs (for logging / health-check routes). */
export interface CronRegistrySummary {
  count: number;
  jobs: Array<{
    name: string;
    description: string;
    schedule: string;
    timezone: string;
  }>;
}
