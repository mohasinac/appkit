/**
 * Giveaway feature shared types
 *
 * Used by both event-type giveaway and prize-draw-mode giveaway.
 * Weight + price fields are server-only — never sent to client consumers.
 */

export interface GiveawaySlot {
  slotNumber: number; // 1..totalSlots
  name: string; // prize item name shown to users
  /** Prize photo. Public — rendered in the prize collage on the giveaway detail page. */
  image?: string;
  // FUTURE_FINANCIAL_DB: external_tx_id → giveaway_transactions.external_tx_id
  price: number; // NEVER sent to client — determines weight (decimal rupees)
  weight: number; // computed server-side; NEVER sent to client
  isBooked: boolean;
  bookedByUserGiveawayNumber?: number;
  bookedByUserId?: string;
  bookedByDisplayName?: string;
}

/** Slot shape safe to expose to clients — price and weight stripped by adapter. */
export interface ClientGiveawaySlot {
  slotNumber: number;
  name: string;
  image?: string;
  isBooked: boolean;
  bookedByUserGiveawayNumber?: number;
  bookedByDisplayName?: string;
}

export type GiveawayPricingMode = "uniform" | "variable";
// uniform: all slots cost the same (uniformPrice); all slots equal weight (no weighting)
// variable: each slot has its own price; weight computed per slot (lower price = higher chance)

export interface GiveawayConfig {
  slots: GiveawaySlot[];
  totalSlots: number; // 1..200
  pricingMode: GiveawayPricingMode;
  uniformPrice?: number; // set when pricingMode === "uniform"; all slots cost this (decimal rupees)
  drawWindowDurationMinutes: number;
  maxPullsPerTransaction: number; // max pulls one TX ID is valid for (default 1)
  maxPullsPerUser: number; // max total pulls one user may make in this giveaway (default 1)
}

/** Client-safe config shape — slots have price/weight stripped. */
export interface ClientGiveawayConfig {
  slots: ClientGiveawaySlot[];
  totalSlots: number;
  pricingMode: GiveawayPricingMode;
  drawWindowDurationMinutes: number;
  maxPullsPerTransaction: number;
  maxPullsPerUser: number;
}

export type GiveawayEntryStatus =
  | "pending"
  | "drawn"
  | "won"
  | "flagged"
  | "cancelled";

/** Error codes thrown by giveaway actions */
export type GiveawayErrorCode =
  | "GIVEAWAY_FULL"
  | "GIVEAWAY_WINDOW_CLOSED"
  | "USER_LIMIT_REACHED"
  | "TX_ALREADY_USED"
  | "SLOT_NOT_FOUND"
  | "ENTRY_NOT_FLAGGED";

export class GiveawayError extends Error {
  constructor(
    public readonly code: GiveawayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GiveawayError";
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
 * @throws {GiveawayError} GIVEAWAY_FULL when unclaimed is empty.
 */
export function pickWeightedSlot(unclaimed: GiveawaySlot[]): GiveawaySlot {
  if (unclaimed.length === 0) {
    throw new GiveawayError("GIVEAWAY_FULL", "No unclaimed slots remain.");
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
export function assignSlotWeights(config: GiveawayConfig): GiveawaySlot[] {
  if (config.pricingMode === "uniform") {
    return config.slots.map((sl) => ({ ...sl, weight: 50 }));
  }
  const maxPrice = Math.max(...config.slots.map((sl) => sl.price), 0);
  return config.slots.map((sl) => ({
    ...sl,
    weight: computeWeight(sl.price, maxPrice),
  }));
}
