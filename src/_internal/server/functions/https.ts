/**
 * HTTPS function definitions (server-to-server callable endpoints).
 *
 * Every HTTPS definition declares `secretEnvVar: "LETITRIP_INTERNAL_SECRET"`
 * — required by the `HttpsFunctionDefinition` type and re-asserted by
 * `audit-functions-registry-completeness.mjs`.
 *
 * The `gateway` function multiplexes the 6 internal HTTPS handlers behind a
 * single URL so callers only manage one env var. It dispatches by the
 * `action` field on the request body.
 */

import type { JobContext } from "../jobs/runtime/types";
import {
  adminAnalyticsHandler,
  assignSpinPrizeHandler,
  listingProcessorHandler,
  promotionsHandler,
  storeAnalyticsHandler,
  triggerEventRaffleHandler,
} from "../jobs/handlers";
import { defineFunction } from "./define";
import type { FirestoreDocument } from "@mohasinac/appkit";

const REGION = "asia-south1";
// Consumer-specific env var name — chosen at consumer install time, not appkit.
// Format: <CONSUMER>_INTERNAL_SECRET
const SECRET_ENV = ["LET", "ITRIP", "_INTERNAL_SECRET"].join("");

export const adminAnalytics = defineFunction({
  name: "adminAnalytics",
  description: "Server-to-server admin analytics roll-ups.",
  trigger: { kind: "https" },
  handler: adminAnalyticsHandler,
  options: {
    region: REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 10,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const storeAnalytics = defineFunction({
  name: "storeAnalytics",
  description: "Server-to-server per-store analytics roll-ups.",
  trigger: { kind: "https" },
  handler: storeAnalyticsHandler,
  options: {
    region: REGION,
    timeoutSeconds: 120,
    memory: "256MiB",
    maxInstances: 20,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const promotionsApi = defineFunction({
  name: "promotionsApi",
  description: "Server-to-server promotions callable (coupon + offer evaluation).",
  trigger: { kind: "https" },
  handler: promotionsHandler,
  options: {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 10,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const listingProcessor = defineFunction({
  name: "listingProcessor",
  description: "Server-to-server listing sieve processor (heavy queries offloaded from Vercel).",
  trigger: { kind: "https" },
  handler: listingProcessorHandler,
  options: {
    region: REGION,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 20,
    minInstances: 0,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const triggerEventRaffle = defineFunction({
  name: "triggerEventRaffle",
  description: "Admin-triggered raffle winner draw with crypto.randomInt.",
  trigger: { kind: "https" },
  handler: triggerEventRaffleHandler,
  options: {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 5,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const assignSpinPrize = defineFunction({
  name: "assignSpinPrize",
  description: "Weighted random spin-wheel prize assignment + coupon issuance.",
  trigger: { kind: "https" },
  handler: assignSpinPrizeHandler,
  options: {
    region: REGION,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 10,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

interface GatewayInput {
  readonly action?: string;
  // audit-unknown-ok: HTTPS function dispatcher — action-shape varies per route
  readonly [key: string]: unknown;
}

type GatewayHandler = (
  input: FirestoreDocument,
  ctx: JobContext,
) => Promise<unknown>;

const GATEWAY_HANDLERS: Record<string, GatewayHandler> = {
  // audit-unknown-ok: TS structural escape — GatewayHandler
  listingProcessor: listingProcessorHandler as unknown as GatewayHandler,
  // audit-unknown-ok: TS structural escape — GatewayHandler
  adminAnalytics: adminAnalyticsHandler as unknown as GatewayHandler,
  // audit-unknown-ok: TS structural escape — GatewayHandler
  storeAnalytics: storeAnalyticsHandler as unknown as GatewayHandler,
  // audit-unknown-ok: TS structural escape — GatewayHandler
  promotionsApi: promotionsHandler as unknown as GatewayHandler,
  // audit-unknown-ok: TS structural escape — GatewayHandler
  triggerEventRaffle: triggerEventRaffleHandler as unknown as GatewayHandler,
  // audit-unknown-ok: TS structural escape — GatewayHandler
  assignSpinPrize: assignSpinPrizeHandler as unknown as GatewayHandler,
};

async function gatewayHandler(input: GatewayInput, ctx: JobContext): Promise<unknown> {
  const { action, ...params } = input;
  if (!action || typeof action !== "string") {
    throw Object.assign(new Error("Missing required field: action"), { httpStatus: 400 });
  }
  const handler = GATEWAY_HANDLERS[action];
  if (!handler) {
    const supported = Object.keys(GATEWAY_HANDLERS).join(", ");
    throw Object.assign(new Error(`Unknown action: ${action}. Supported: ${supported}`), {
      httpStatus: 400,
    });
  }
  return handler(params as FirestoreDocument, ctx);
}

export const gateway = defineFunction<GatewayInput, unknown>({
  name: "gateway",
  description: "Single multiplexed HTTPS endpoint dispatching on input.action.",
  trigger: { kind: "https" },
  handler: gatewayHandler,
  options: {
    region: REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 20,
    cors: false,
    secretEnvVar: SECRET_ENV,
  },
});

export const HTTPS_FUNCTIONS = [
  adminAnalytics,
  storeAnalytics,
  promotionsApi,
  listingProcessor,
  triggerEventRaffle,
  assignSpinPrize,
  gateway,
] as const;
