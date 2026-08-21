/**
 * Manual trigger for the daily status digest.
 *
 * The digest normally runs from the `dailyStatusDigest` scheduled Firebase
 * Function (10:00 IST). Firebase has no "run on first deploy" trigger, so
 * this exists to fire the exact same core function on demand — e.g. right
 * after a fresh deploy, to confirm the whole chain works without waiting
 * for the next morning. Both paths share one implementation; there is no
 * second copy of the digest logic.
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { serverLogger } from "../../../../monitoring";
import {
  runDailyStatusDigest,
  runDeploymentDigest,
  type DailyStatusDigestResult,
} from "../../jobs/core/dailyStatusDigest";
import type { JobContext } from "../../jobs/runtime/types";

function buildManualJobContext(job: string): JobContext {
  return {
    job,
    db: getAdminDb(),
    logger: {
      info: (message, meta) => serverLogger.info(message, meta),
      warn: (message, meta) => serverLogger.warn(message, meta),
      error: (message, err, meta) => serverLogger.error(message, { err, ...(meta ?? {}) }),
    },
    env: (key: string) => process.env[key],
    now: new Date(),
  };
}

export async function triggerDailyStatusDigest(): Promise<DailyStatusDigestResult> {
  return runDailyStatusDigest(buildManualJobContext("dailyStatusDigest:manual"));
}

/**
 * Fires the digest once per deployment version, from server startup.
 * Safe to call on every cold start — `runDeploymentDigest` claims the
 * version in a Firestore transaction and no-ops if it's already been sent.
 */
export async function triggerDeploymentDigest(version: string): Promise<DailyStatusDigestResult> {
  return runDeploymentDigest(buildManualJobContext("dailyStatusDigest:deploy"), version);
}
