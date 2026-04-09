import type { IRepository } from "@mohasinac/contracts";
import { createCronJob } from "../registry";

/**
 * Built-in job: Close live auctions whose `endTime` has passed.
 *
 * Run interval: every 5 minutes (recommended).
 * Requires an `IRepository<AuctionDocument>` injected at registration time.
 *
 * @example
 * ```ts
 * import { getProviders } from "@mohasinac/contracts";
 * import { createAuctionExpiryJob } from "@mohasinac/appkit/cron";
 *
 * const { db } = getProviders();
 * export const auctionExpiry = createAuctionExpiryJob(
 *   db!.getRepository("auctions")
 * );
 * ```
 */

interface AuctionDocument {
  id: string;
  status: string;
  endTime: string | number;
  highestBidAmount?: number;
  closedAt?: string;
}

export function createAuctionExpiryJob(
  auctionRepo: IRepository<AuctionDocument>,
) {
  return createCronJob(
    {
      name: "auctions_expire",
      description: "Close live auctions whose endTime has passed.",
      schedule: "every 5 minutes",
      timezone: "UTC",
      memory: "256MB",
      timeoutSeconds: 60,
    },
    async (ctx) => {
      const result = await auctionRepo.findAll({
        filters: `status==live,endTime<=${ctx.scheduleTime}`,
        perPage: 500,
      });

      let processed = 0;
      let errors = 0;

      for (const auction of result.data) {
        try {
          const status =
            (auction.highestBidAmount ?? 0) > 0
              ? "ended_with_winner"
              : "ended_no_winner";

          await auctionRepo.update(auction.id, {
            status,
            closedAt: new Date().toISOString(),
          } as Partial<AuctionDocument>);

          processed++;
        } catch {
          errors++;
        }
      }

      return {
        summary: `Closed ${processed} auctions (${errors} errors)`,
        processed,
        errors,
      };
    },
  );
}
