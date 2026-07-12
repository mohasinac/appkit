/*
 * WHY: Seeds 5 lottery entries for the active Pokémon Number Draw event.
 * WHAT: 5 entries with userLotteryNumber 1-5, all status "drawn" (slot already assigned).
 *
 * EXPORTS:
 *   lotteryEntriesSeedData — Array of LotteryEntryDocument for seed runner
 *
 * @tag domain:lottery
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { LotteryEntryDocument } from "../features/lottery/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const lotteryEntriesSeedData: LotteryEntryDocument[] = [
  {
    id: "lottery-entry-pokemon-draw-1",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-ravi-k",
    userDisplayName: "Ravi K",
    userEmail: "ravi.k@example.com",
    userPhone: "9876543210",
    transactionId: "TXN-SEED-001",
    paymentTime: daysAgo(2),
    purchasedItemNumber: 1,
    userLotteryNumber: 1,
    assignedPrizeSlotNumber: 1,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(2),
    drawnAt: daysAgo(2),
  } as LotteryEntryDocument,
  {
    id: "lottery-entry-pokemon-draw-2",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-priya-s",
    userDisplayName: "Priya S",
    userEmail: "priya.s@example.com",
    userPhone: "9876543211",
    transactionId: "TXN-SEED-002",
    paymentTime: daysAgo(2),
    purchasedItemNumber: 2,
    userLotteryNumber: 2,
    assignedPrizeSlotNumber: 2,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(2),
    drawnAt: daysAgo(2),
  } as LotteryEntryDocument,
  {
    id: "lottery-entry-pokemon-draw-3",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-arjun-m",
    userDisplayName: "Arjun M",
    userEmail: "arjun.m@example.com",
    userPhone: "9876543212",
    transactionId: "TXN-SEED-003",
    paymentTime: daysAgo(1),
    purchasedItemNumber: 3,
    userLotteryNumber: 3,
    assignedPrizeSlotNumber: 3,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(1),
    drawnAt: daysAgo(1),
  } as LotteryEntryDocument,
  {
    id: "lottery-entry-pokemon-draw-4",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-sneha-p",
    userDisplayName: "Sneha P",
    userEmail: "sneha.p@example.com",
    userPhone: "9876543213",
    transactionId: "TXN-SEED-004",
    paymentTime: daysAgo(1),
    purchasedItemNumber: 4,
    userLotteryNumber: 4,
    assignedPrizeSlotNumber: 4,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(1),
    drawnAt: daysAgo(1),
  } as LotteryEntryDocument,
  {
    id: "lottery-entry-pokemon-draw-5",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-vikram-r",
    userDisplayName: "Vikram R",
    userEmail: "vikram.r@example.com",
    userPhone: "9876543214",
    transactionId: "TXN-SEED-005",
    paymentTime: daysAgo(0),
    purchasedItemNumber: 5,
    userLotteryNumber: 5,
    assignedPrizeSlotNumber: 5,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(0),
    drawnAt: daysAgo(0),
  } as LotteryEntryDocument,
];
