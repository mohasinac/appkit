import type { CallableHandler } from "../runtime/types";
import { runAdminAnalytics, type AdminAnalyticsResult } from "../core/adminAnalytics";

export type { AdminAnalyticsResult };

export const adminAnalyticsHandler: CallableHandler<void, AdminAnalyticsResult> =
  runAdminAnalytics;
