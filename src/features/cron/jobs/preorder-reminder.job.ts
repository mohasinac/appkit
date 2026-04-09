import type { IRepository } from "@mohasinac/contracts";
import { createCronJob } from "../registry";

/**
 * Built-in job: Mark pre-orders as "shipping_soon" when their
 * `expectedShippingDate` falls within the next 7 days.
 *
 * Run interval: "every 24 hours" or via daily cron.
 */

interface PreOrderDocument {
  id: string;
  status: string;
  expectedShippingDate?: string;
}

export function createPreOrderReminderJob(
  preOrderRepo: IRepository<PreOrderDocument>,
) {
  const sevenDaysFromNow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  };

  return createCronJob(
    {
      name: "pre_orders_reminder",
      description:
        "Flag pre-orders whose expectedShippingDate is within 7 days.",
      schedule: "every 24 hours",
      timezone: "UTC",
      memory: "256MB",
      timeoutSeconds: 60,
    },
    async () => {
      const cutoff = sevenDaysFromNow();
      const result = await preOrderRepo.findAll({
        filters: `status==confirmed,expectedShippingDate<=${cutoff}`,
        perPage: 500,
      });

      let processed = 0;
      let errors = 0;

      for (const order of result.data) {
        try {
          await preOrderRepo.update(order.id, {
            status: "shipping_soon",
          } as Partial<PreOrderDocument>);
          processed++;
        } catch {
          errors++;
        }
      }

      return {
        summary: `Flagged ${processed} pre-orders as shipping_soon (${errors} errors)`,
        processed,
        errors,
      };
    },
  );
}
