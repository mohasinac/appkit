import type {
  CronJobDefinition,
  CronRegistry,
  CronRegistrySummary,
  JobContext,
  JobResult,
  ScheduledJobFn,
} from "./types";

// --- Global Registry ----------------------------------------------------------

const registry: CronRegistry = new Map();

// --- createCronJob ------------------------------------------------------------

/**
 * Factory that creates a fully-typed cron job definition and registers it
 * in the global CronRegistry.
 *
 * @example
 * ```ts
 * export const auctionExpiryJob = createCronJob(
 *   {
 *     name: "auctions_expire",
 *     description: "Close live auctions whose endTime has passed.",
 *     schedule: "every 5 minutes",
 *     timezone: "Asia/Kolkata",
 *   },
 *   async (ctx) => {
 *     // ... implementation
 *     return { summary: "Done", processed: 12, errors: 0 };
 *   },
 * );
 * ```
 */
export function createCronJob(
  options: Omit<CronJobDefinition, "handler">,
  handler: ScheduledJobFn,
): CronJobDefinition {
  const definition: CronJobDefinition = {
    timezone: "UTC",
    memory: "256MB",
    timeoutSeconds: 60,
    ...options,
    handler,
  };

  if (registry.has(definition.name)) {
    throw new Error(
      `[CronRegistry] Duplicate job name: "${definition.name}". Each job must have a unique name.`,
    );
  }

  registry.set(definition.name, definition);
  return definition;
}

// --- Registry Accessors -------------------------------------------------------

/** Returns the global registry map (read-only view). */
export function getCronRegistry(): ReadonlyMap<string, CronJobDefinition> {
  return registry;
}

/** Returns a serialisable summary of all registered jobs. */
export function getCronRegistrySummary(): CronRegistrySummary {
  const jobs = Array.from(registry.values()).map((j) => ({
    name: j.name,
    description: j.description,
    schedule: j.schedule,
    timezone: j.timezone ?? "UTC",
  }));
  return { count: jobs.length, jobs };
}

/** Finds a registered job by name, or returns undefined. */
export function findCronJob(name: string): CronJobDefinition | undefined {
  return registry.get(name);
}

/**
 * Reset — only for use in unit tests.
 * @internal
 */
export function _resetCronRegistry(): void {
  registry.clear();
}

// --- runJob (test / CI helper) ------------------------------------------------

/**
 * Manually invoke any registered job by name.
 * Useful in integration tests and one-off admin scripts.
 *
 * @example
 * ```ts
 * const result = await runJob("auctions_expire", {
 *   scheduleTime: new Date().toISOString(),
 * });
 * ```
 */
export async function runJob(
  name: string,
  ctx?: Partial<Omit<JobContext, "jobName">>,
): Promise<JobResult> {
  const job = registry.get(name);
  if (!job) {
    throw new Error(`[CronRegistry] No job registered with name: "${name}"`);
  }
  return job.handler({
    scheduleTime: ctx?.scheduleTime ?? new Date().toISOString(),
    jobName: name,
    messageData: ctx?.messageData,
  });
}
