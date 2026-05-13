import type { CallableHandler } from "../runtime/types";
import {
  runStoreAnalytics,
  type StoreAnalyticsInput,
  type StoreAnalyticsResult,
} from "../core/storeAnalytics";

export type { StoreAnalyticsInput, StoreAnalyticsResult };

export const storeAnalyticsHandler: CallableHandler<StoreAnalyticsInput, StoreAnalyticsResult> =
  runStoreAnalytics;
