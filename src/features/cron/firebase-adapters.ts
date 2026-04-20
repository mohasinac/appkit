/**
 * Firebase onSchedule wrapper helpers for @mohasinac/appkit/cron.
 *
 * These are THIN adapter factories — they bridge between Firebase's
 * `onSchedule()` / Pub/Sub `onMessagePublished()` APIs and the
 * typed `CronJobDefinition.handler` function.
 *
 * Consumer projects (letitrip.in/functions/src/) import these helpers
 * and pass in the concrete Firebase scheduler from `firebase-functions/v2/scheduler`
 * so that appkit itself does NOT take a hard dependency on firebase-functions.
 *
 * @example
 * ```ts
 * // functions/src/index.ts
 * import { scheduler } from "firebase-functions/v2/scheduler";
 * import { pubsub }    from "firebase-functions/v2/pubsub";
 * import { wrapScheduled, wrapPubSub } from "@mohasinac/appkit/cron";
 * import { auctionExpiryJob } from "@mohasinac/appkit/cron/jobs/auction-expiry.job";
 *
 * export const auctionsExpiry = wrapScheduled(scheduler, auctionExpiryJob);
 * export const auctionExpiryPubSub = wrapPubSub(pubsub, "auctions_expire", auctionExpiryJob.handler);
 * ```
 */

import type { CronJobDefinition, PubSubJobFn } from "./types";

// --- Minimal Firebase adapter interfaces -------------------------------------
// We only describe what we USE, not the full Firebase API surface.

interface SchedulerOptions {
  schedule: string;
  timeZone?: string;
  memory?: string;
  timeoutSeconds?: number;
}

type SchedulerFn = (
  options: SchedulerOptions,
  handler: (event: { scheduleTime: string }) => Promise<void>,
) => unknown;

interface PubSubOptions {
  topic: string;
  memory?: string;
  timeoutSeconds?: number;
}

type PubSubFn = (
  options: PubSubOptions,
  handler: (event: {
    data: { message: { json?: unknown; data?: string } };
  }) => Promise<void>,
) => unknown;

// --- wrapScheduled ------------------------------------------------------------

/**
 * Wraps a `CronJobDefinition` as a Firebase `onSchedule` Cloud Function.
 *
 * @param schedulerApi  The `scheduler` export from `firebase-functions/v2/scheduler`.
 * @param job           A `CronJobDefinition` created with `createCronJob()`.
 */
export function wrapScheduled(
  schedulerApi: { onSchedule: SchedulerFn },
  job: CronJobDefinition,
): unknown {
  return schedulerApi.onSchedule(
    {
      schedule: job.schedule,
      timeZone: job.timezone ?? "UTC",
      memory: job.memory ?? "256MB",
      timeoutSeconds: job.timeoutSeconds ?? 60,
    },
    async (event) => {
      await job.handler({
        scheduleTime: event.scheduleTime,
        jobName: job.name,
      });
    },
  );
}

// --- wrapPubSub ---------------------------------------------------------------

/**
 * Wraps a `PubSubJobFn` as a Firebase Pub/Sub `onMessagePublished` function.
 *
 * @param pubsubApi  The `pubsub` export from `firebase-functions/v2/pubsub`.
 * @param topic      The Pub/Sub topic name.
 * @param handler    The job handler to invoke.
 * @param memory     Optional memory allocation.
 */
export function wrapPubSub(
  pubsubApi: { onMessagePublished: PubSubFn },
  topic: string,
  handler: PubSubJobFn,
  options?: { memory?: string; timeoutSeconds?: number },
): unknown {
  return pubsubApi.onMessagePublished(
    {
      topic,
      memory: options?.memory ?? "256MB",
      timeoutSeconds: options?.timeoutSeconds ?? 60,
    },
    async (event) => {
      const raw = event.data.message.data;
      const decoded = raw
        ? Buffer.from(raw, "base64").toString("utf-8")
        : null;

      await handler(decoded, {
        scheduleTime: new Date().toISOString(),
        jobName: topic,
      });
    },
  );
}
