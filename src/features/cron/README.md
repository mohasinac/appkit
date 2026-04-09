# `@mohasinac/appkit/features/cron`

Typed cron job registry for Firebase Functions (`onSchedule` + Pub/Sub).

## Overview

Provides a framework-agnostic job registry that:
- Validates job definitions at registration time
- Wraps `onSchedule` / `onMessagePublished` Firebase handlers for type safety
- Provides two built-in jobs: **auction expiry** and **pre-order reminder**

## Creating a job

```ts
import { createCronJob } from "@mohasinac/appkit/features/cron";

const dailyCleanupJob = createCronJob({
  name: "daily-cleanup",
  description: "Remove expired sessions and temp files",
  schedule: "0 2 * * *",   // 2 AM UTC daily
  timezone: "Asia/Kolkata",
  memory: "256MB",
  timeout: 120,
  fn: async (ctx) => {
    // ... cleanup logic
    return { summary: "Cleaned 42 records", processed: 42, errors: 0 };
  },
});
```

## Wrapping for Firebase

```ts
// functions/src/index.ts
import * as functions from "firebase-functions/v2";
import { wrapScheduled, wrapPubSub } from "@mohasinac/appkit/features/cron";
import { createAuctionExpiryJob } from "@mohasinac/appkit/features/cron";

const auctionJob = createAuctionExpiryJob({ db: adminDb });

export const auctionExpiry = functions.scheduler.onSchedule(
  { schedule: "every 5 minutes", timeZone: "Asia/Kolkata" },
  wrapScheduled(auctionJob),
);
```

## Built-in jobs

| Job factory | Schedule | Purpose |
|---|---|---|
| `createAuctionExpiryJob(opts)` | every 5 min | Closes auctions past end-time |
| `createPreOrderReminderJob(opts)` | daily 9 AM | Sends ship-date approach emails |

## API

| Export | Description |
|---|---|
| `createCronJob(def)` | Register a typed job definition |
| `getCronRegistry()` | Returns all registered jobs |
| `getCronRegistrySummary()` | Returns name/description/schedule pairs |
| `findCronJob(name)` | Look up a job by name |
| `runJob(name, ctx)` | Run a job programmatically (testing) |
| `wrapScheduled(job)` | Adapts a scheduled job for `onSchedule` |
| `wrapPubSub(job)` | Adapts a job for `onMessagePublished` |
