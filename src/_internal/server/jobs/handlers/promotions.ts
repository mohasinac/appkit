import type { CallableHandler } from "../runtime/types";
import { runPromotions, type PromotionsCallableResult } from "../core/promotions";

export type { PromotionsCallableResult };

export const promotionsHandler: CallableHandler<void, PromotionsCallableResult> = runPromotions;
