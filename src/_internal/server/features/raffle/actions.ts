/**
 * SB9-H — server actions for triggering an event raffle / assigning a spin
 * prize from a Next.js API route. Builds an ad-hoc JobContext around
 * `getAdminDb()` so the same pure runners used by the Firebase Functions
 * handlers also work in a Vercel lambda (10s cap honoured by raffle pool
 * size).
 */

"use server";

import { getAdminDb } from "../../../../providers/db-firebase/admin";
import {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "../../jobs/core/triggerEventRaffle";
import {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "../../jobs/core/assignSpinPrize";
import type { JobContext, JobLogger } from "../../jobs/runtime/types";

function buildContext(job: string): JobContext {
  const logger: JobLogger = {
    info: (msg, meta) => console.info(`[${job}] ${msg}`, meta ?? {}),
    warn: (msg, meta) => console.warn(`[${job}] ${msg}`, meta ?? {}),
    error: (msg, err, meta) =>
      console.error(`[${job}] ${msg}`, err, meta ?? {}),
  };
  return {
    job,
    db: getAdminDb(),
    logger,
    env: (key) => process.env[key],
    now: new Date(),
  };
}

export async function triggerEventRaffleAction(
  input: TriggerEventRaffleInput,
): Promise<TriggerEventRaffleResult> {
  return runTriggerEventRaffle(input, buildContext("admin.triggerEventRaffle"));
}

export async function assignSpinPrizeAction(
  input: AssignSpinPrizeInput,
): Promise<AssignSpinPrizeResult> {
  return runAssignSpinPrize(input, buildContext("user.assignSpinPrize"));
}
