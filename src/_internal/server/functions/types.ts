/**
 * Firebase Functions registry types.
 *
 * Every appkit-owned function is declared as a `FunctionDefinition` value via
 * `defineFunction({...})` in `appkit/src/_internal/server/functions/<category>/<name>.ts`.
 * Definitions are collected into `APPKIT_FUNCTIONS` (manifest.ts) and bound to
 * Firebase via `bindAllFromRegistry(...)` (bind-all.ts).
 *
 * Consumer extension contract: a consumer may declare its own `FunctionDefinition[]`
 * and pass it as a second registry to `mergeFunctionRegistries(...)`. Name
 * collisions are an error unless the later definition declares
 * `options.overrides` referencing the shadowed name.
 *
 * Handler signatures are inherited from the existing job runtime types
 * (ScheduleHandler / FirestoreTriggerHandler / CallableHandler).
 */

import type {
  CallableHandler,
  FirestoreTriggerHandler,
  ScheduleHandler,
} from "../jobs/runtime/types";

export type FunctionMemory =
  | "128MiB"
  | "256MiB"
  | "512MiB"
  | "1GiB"
  | "2GiB";

export interface FunctionOptions {
  readonly region?: string;
  readonly timeoutSeconds?: number;
  readonly memory?: FunctionMemory;
  readonly maxInstances?: number;
  readonly minInstances?: number;
  /**
   * CORS configuration for HTTPS functions only. `false` (the default for
   * server-to-server calls) rejects browser preflights.
   */
  readonly cors?: boolean | string | readonly string[];
  /**
   * Names of Secret Manager secrets bound to the runtime. Required by audit
   * for every HTTPS definition; ignored by Firebase for other trigger kinds.
   */
  readonly secrets?: readonly string[];
  /**
   * Env var name whose value the request's `x-internal-secret` header must
   * equal. Required by audit for every HTTPS definition.
   */
  readonly secretEnvVar?: string;
  /**
   * If the consumer registry intentionally shadows an appkit definition, this
   * field MUST hold the name being overridden. Any other collision is an
   * error in `mergeFunctionRegistries`.
   */
  readonly overrides?: string;
}

export interface ScheduleTrigger {
  readonly kind: "schedule";
  readonly cron: string;
  readonly timeZone?: string;
}

export interface DocumentCreatedTrigger {
  readonly kind: "documentCreated";
  readonly pathPattern: string;
}

export interface DocumentUpdatedTrigger {
  readonly kind: "documentUpdated";
  readonly pathPattern: string;
}

export interface DocumentWrittenTrigger {
  readonly kind: "documentWritten";
  readonly pathPattern: string;
}

export interface HttpsTrigger {
  readonly kind: "https";
  readonly methods?: readonly string[];
}

export type FunctionTrigger =
  | ScheduleTrigger
  | DocumentCreatedTrigger
  | DocumentUpdatedTrigger
  | DocumentWrittenTrigger
  | HttpsTrigger;

interface FunctionDefinitionBase {
  readonly name: string;
  readonly description: string;
  readonly options?: FunctionOptions;
}

export interface ScheduledFunctionDefinition extends FunctionDefinitionBase {
  readonly trigger: ScheduleTrigger;
  readonly handler: ScheduleHandler;
}

export interface DocumentTriggerFunctionDefinition<
  TBefore = unknown,
  TAfter = unknown,
> extends FunctionDefinitionBase {
  readonly trigger:
    | DocumentCreatedTrigger
    | DocumentUpdatedTrigger
    | DocumentWrittenTrigger;
  readonly handler: FirestoreTriggerHandler<TBefore, TAfter>;
}

/**
 * HTTPS definitions are typed to require both `secretEnvVar` and `secrets`
 * on `options`. The audit duplicates the rule for runtime confirmation;
 * the type makes accidental omission a compile error.
 */
export interface HttpsFunctionDefinition<
  TInput = unknown,
  TOutput = unknown,
> extends FunctionDefinitionBase {
  readonly trigger: HttpsTrigger;
  readonly handler: CallableHandler<TInput, TOutput>;
  readonly options: FunctionOptions & {
    readonly secretEnvVar: string;
    readonly secrets?: readonly string[];
  };
}

export type FunctionDefinition =
  | ScheduledFunctionDefinition
  | DocumentTriggerFunctionDefinition
  | HttpsFunctionDefinition;
