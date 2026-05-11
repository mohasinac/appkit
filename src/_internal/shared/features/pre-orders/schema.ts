import { z } from "zod";

export const reservePreOrderSchema = z.object({
  preOrderId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  payDepositNow: z.boolean().default(true),
});

export const cancelPreOrderReservationSchema = z.object({
  reservationId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type ReservePreOrderInput = z.infer<typeof reservePreOrderSchema>;
