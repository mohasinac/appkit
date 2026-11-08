/*
 * WHY: Seeds 5 giveaway entries for the active Pokémon Number Draw event.
 * WHAT: 5 entries with userGiveawayNumber 1-5, all status "drawn" (slot already assigned).
 *
 * EXPORTS:
 *   giveawayEntriesSeedData — Array of GiveawayEntryDocument for seed runner
 *
 * @tag domain:giveaway
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

/*
 * 🛑 `GiveawayEntryPlain`, not `GiveawayEntryDocument`.
 *
 * These fixtures hold REAL plaintext; `seed-cli` encrypts the PII fields on
 * write through the same `GIVEAWAY_ENTRY_PII_FIELDS` map the repository uses.
 * The document type now declares those fields `Encrypted<string>`, so typing
 * this array as the document would be a claim that these literals are
 * ciphertext — false, and previously hidden by an `as GiveawayEntryDocument`
 * cast on every record. The casts are gone with it.
 */
import type { GiveawayEntryPlain } from "../features/giveaway/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const giveawayEntriesSeedData: GiveawayEntryPlain[] = [
  {
    id: "giveaway-entry-pokemon-draw-1",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-ravi-k",
    userDisplayName: "Ravi K",
    userEmail: "ravi.k@example.com",
    userPhone: "9876543210",
    transactionId: "TXN-SEED-001",
    paymentTime: daysAgo(2),
    purchasedItemNumber: 1,
    userGiveawayNumber: 1,
    assignedPrizeSlotNumber: 1,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(2),
    drawnAt: daysAgo(2),
  },
  {
    id: "giveaway-entry-pokemon-draw-2",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-priya-s",
    userDisplayName: "Priya S",
    userEmail: "priya.s@example.com",
    userPhone: "9876543211",
    transactionId: "TXN-SEED-002",
    paymentTime: daysAgo(2),
    purchasedItemNumber: 2,
    userGiveawayNumber: 2,
    assignedPrizeSlotNumber: 2,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(2),
    drawnAt: daysAgo(2),
  },
  {
    id: "giveaway-entry-pokemon-draw-3",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-arjun-m",
    userDisplayName: "Arjun M",
    userEmail: "arjun.m@example.com",
    userPhone: "9876543212",
    transactionId: "TXN-SEED-003",
    paymentTime: daysAgo(1),
    purchasedItemNumber: 3,
    userGiveawayNumber: 3,
    assignedPrizeSlotNumber: 3,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(1),
    drawnAt: daysAgo(1),
  },
  {
    id: "giveaway-entry-pokemon-draw-4",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-sneha-p",
    userDisplayName: "Sneha P",
    userEmail: "sneha.p@example.com",
    userPhone: "9876543213",
    transactionId: "TXN-SEED-004",
    paymentTime: daysAgo(1),
    purchasedItemNumber: 4,
    userGiveawayNumber: 4,
    assignedPrizeSlotNumber: 4,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(1),
    drawnAt: daysAgo(1),
  },
  {
    id: "giveaway-entry-pokemon-draw-5",
    sourceType: "event",
    eventId: "event-pokemon-number-draw-july-2026",
    userId: "user-vikram-r",
    userDisplayName: "Vikram R",
    userEmail: "vikram.r@example.com",
    userPhone: "9876543214",
    transactionId: "TXN-SEED-005",
    paymentTime: daysAgo(0),
    purchasedItemNumber: 5,
    userGiveawayNumber: 5,
    assignedPrizeSlotNumber: 5,
    status: "drawn",
    isFlagged: false,
    submittedAt: daysAgo(0),
    drawnAt: daysAgo(0),
  },
];
