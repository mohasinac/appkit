import type { CallableHandler } from "../runtime/types";
import {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "../core/triggerEventRaffle";

export const triggerEventRaffleHandler: CallableHandler<
  TriggerEventRaffleInput,
  TriggerEventRaffleResult
> = runTriggerEventRaffle;
