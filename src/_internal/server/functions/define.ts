/**
 * `defineFunction(...)` — identity helper for declaring a `FunctionDefinition`
 * at a call site. The function is the literal value; this helper exists only
 * to drive type inference (TypeScript narrows the union member based on
 * `trigger.kind` and the matching handler shape).
 *
 * Usage:
 *   export const auctionSettlement = defineFunction({
 *     name: "auctionSettlement",
 *     description: "Settle expired auctions and notify winners.",
 *     trigger: { kind: "schedule", cron: "every 15 minutes" },
 *     handler: auctionSettlementHandler,
 *     options: { timeoutSeconds: 300, memory: "256MiB" },
 *   });
 */

import type {
  DocumentTriggerFunctionDefinition,
  FunctionDefinition,
  HttpsFunctionDefinition,
  ScheduledFunctionDefinition,
} from "./types";

export function defineFunction(
  def: ScheduledFunctionDefinition,
): ScheduledFunctionDefinition;
export function defineFunction<TBefore, TAfter>(
  def: DocumentTriggerFunctionDefinition<TBefore, TAfter>,
): DocumentTriggerFunctionDefinition<TBefore, TAfter>;
export function defineFunction<TInput, TOutput>(
  def: HttpsFunctionDefinition<TInput, TOutput>,
): HttpsFunctionDefinition<TInput, TOutput>;
export function defineFunction(def: FunctionDefinition): FunctionDefinition {
  return def;
}
