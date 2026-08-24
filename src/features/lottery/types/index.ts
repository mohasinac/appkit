/**
 * Lottery feature shared types
 *
 * Used by both event-type lottery and prize-draw-mode lottery.
 * Weight + price fields are server-only — never sent to client consumers.
 */

export interface LotterySlot {
  slotNumber: number; // 1..totalSlots
  name: string; // prize item name shown to users
  /** Prize photo. Public — rendered in the prize collage on the lottery detail page. */
  image?: string;
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  price: number; // NEVER sent to client — determines weight (decimal rupees)
  weight: number; // computed server-side; NEVER sent to client
  isBooked: boolean;
  bookedByUserLotteryNumber?: number;
  bookedByUserId?: string;
  bookedByDisplayName?: string;
}

/** Slot shape safe to expose to clients — price and weight stripped by adapter. */
export interface ClientLotterySlot {
  slotNumber: number;
  name: string;
  image?: string;
  isBooked: boolean;
  bookedByUserLotteryNumber?: number;
  bookedByDisplayName?: string;
}

export type LotteryPricingMode = "uniform" | "variable";
// uniform: all slots cost the same (uniformPrice); all slots equal weight (no weighting)
// variable: each slot has its own price; weight computed per slot (lower price = higher chance)

export interface LotteryConfig {
  slots: LotterySlot[];
  totalSlots: number; // 1..200
  pricingMode: LotteryPricingMode;
  uniformPrice?: number; // set when pricingMode === "uniform"; all slots cost this (decimal rupees)
  drawWindowDurationMinutes: number;
  maxPullsPerTransaction: number; // max pulls one TX ID is valid for (default 1)
  maxPullsPerUser: number; // max total pulls one user may make in this lottery (default 1)
}

/** Client-safe config shape — slots have price/weight stripped. */
export interface ClientLotteryConfig {
  slots: ClientLotterySlot[];
  totalSlots: number;
  pricingMode: LotteryPricingMode;
  drawWindowDurationMinutes: number;
  maxPullsPerTransaction: number;
  maxPullsPerUser: number;
}

export type LotteryEntryStatus =
  | "pending"
  | "drawn"
  | "won"
  | "flagged"
  | "cancelled";

/** Error codes thrown by lottery actions */
export type LotteryErrorCode =
  | "LOTTERY_FULL"
  | "LOTTERY_WINDOW_CLOSED"
  | "USER_LIMIT_REACHED"
  | "TX_ALREADY_USED"
  | "SLOT_NOT_FOUND"
  | "ENTRY_NOT_FLAGGED";

export class LotteryError extends Error {
  constructor(
    public readonly code: LotteryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LotteryError";
  }
}

/**
 * Compute the weight for a slot given its price.
 * Lower price → higher weight → more likely to be selected.
 * Weight is always at least 1 (never 0).
 * For uniform pricing: all slots get weight 50.
 */
export function computeWeight(
  price: number,
  maxPrice: number,
): number {
  if (maxPrice === 0) return 50;
  return Math.max(1, Math.round((1 - price / maxPrice) * 99) + 1);
}

/**
 * Cryptographically-random integer in [0, maxExclusive) via the Web Crypto
 * API — available in both Node (globalThis.crypto, Node 19+) and browsers,
 * unlike `node:crypto`'s `randomInt` which would leak a Node-only import
 * into any client bundle that pulls in this shared types module.
 */
function secureRandomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

/**
 * Pick a slot using weighted random selection. Uses the Web Crypto API, not
 * `Math.random()`, so the fairness claim shown to users (PrizeRevealModal's
 * "provably fair" copy) is actually true for this path too.
 * @throws {LotteryError} LOTTERY_FULL when unclaimed is empty.
 */
export function pickWeightedSlot(unclaimed: LotterySlot[]): LotterySlot {
  if (unclaimed.length === 0) {
    throw new LotteryError("LOTTERY_FULL", "No unclaimed slots remain.");
  }
  const total = unclaimed.reduce((s, sl) => s + sl.weight, 0);
  let r = secureRandomInt(total);
  for (const sl of unclaimed) {
    r -= sl.weight;
    if (r < 0) return sl;
  }
  return unclaimed[unclaimed.length - 1];
}

/**
 * Assign weights to slots based on pricing mode.
 * Returns a new array with weight populated on every slot.
 */
export function assignSlotWeights(config: LotteryConfig): LotterySlot[] {
  if (config.pricingMode === "uniform") {
    return config.slots.map((sl) => ({ ...sl, weight: 50 }));
  }
  const maxPrice = Math.max(...config.slots.map((sl) => sl.price), 0);
  return config.slots.map((sl) => ({
    ...sl,
    weight: computeWeight(sl.price, maxPrice),
  }));
}
