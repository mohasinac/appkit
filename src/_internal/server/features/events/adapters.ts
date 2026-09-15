/**
 * Events adapters — the public projection for an event document.
 *
 * 🛑 An event is published by two separate routes (appkit's own `eventIdGET`
 * and the consumer's `/api/events` list), and both previously built their
 * payload by SPREADING the stored document and deleting `createdBy`. A
 * deny-list keyed on a handful of remembered field names publishes everything
 * nobody thought to delete — see § Public Data Projections and Root Cause #70.
 *
 * Two nested structures on `EventDocument` carry fields that decide outcomes
 * and must never leave the server:
 *
 *   - `lotteryConfig.slots[]` — per-slot `price` and `weight` (the weighting IS
 *     the odds), plus the internal `bookedByUserId`.
 *   - `spinPrizes[]`         — per-prize `weight` (again, the odds) and
 *     `couponId` (an internal coupon document id).
 *
 * `SpinWheelView` reads `id`, `label` and `isActive` and nothing else, so
 * dropping the other two costs the client nothing. The prize a spin actually
 * wins is resolved server-side in `assignSpinPrize` and returned as a coupon
 * CODE on the entry, never as the coupon's document id.
 *
 * Both routes call `toPublicEvent` so the two can no longer disagree
 * (Root Cause #75 — a rule reachable by copy-paste gets copied, and the copy
 * never learns about the branch added later).
 */
import { toClientLotteryConfig } from "../lottery/adapters";
import type { LotteryConfig, ClientLotteryConfig } from "../../../../features/lottery/types";

/** A spin prize as a public visitor may see it: what it is, not what it is worth. */
export interface ClientSpinPrize {
  id: string;
  label: string;
  isActive: boolean;
}

/** Allow-list, not a spread: `weight` and `couponId` are deliberately absent. */
export function toClientSpinPrize(prize: {
  id: string;
  label: string;
  isActive?: boolean;
}): ClientSpinPrize {
  return {
    id: prize.id,
    label: prize.label,
    isActive: prize.isActive !== false,
  };
}

/**
 * The three fields this projection touches; every other field passes through.
 *
 * 🛑 `lotteryConfig` accepts EITHER shape, and that is not laxness — it is the
 * reason this leak survived review. `EventItem.lotteryConfig` is declared as
 * `ClientLotteryConfig`, i.e. the already-projected type, while the repository
 * hands back the STORED document with `price`, `weight` and `bookedByUserId`
 * still on every slot. The type asserted the projection had happened; nothing
 * had performed it. Accepting both means the adapter can be applied to a value
 * whose type is lying, which is precisely where it is needed.
 */
export interface PublicEventInput {
  createdBy?: string;
  lotteryConfig?: LotteryConfig | ClientLotteryConfig;
  spinPrizes?: { id: string; label: string; isActive?: boolean }[];
}

/** What a caller gets back: `createdBy` gone, the two nested shapes narrowed. */
export type PublicEvent<T extends PublicEventInput> = Omit<
  T,
  "createdBy" | "lotteryConfig" | "spinPrizes"
> & {
  lotteryConfig?: ClientLotteryConfig;
  spinPrizes?: ClientSpinPrize[];
};

/**
 * Project one stored event into its public shape.
 *
 * The return TYPE is narrowed too, not just the runtime value — so a caller
 * that goes looking for `slot.weight` on the result gets a compile error rather
 * than `undefined` at runtime, and the next projection bug is caught by tsc.
 */
export function toPublicEvent<T extends PublicEventInput>(event: T): PublicEvent<T> {
  const {
    createdBy: _createdBy,
    lotteryConfig,
    spinPrizes,
    ...rest
  } = event;

  const out = rest as PublicEvent<T>;
  if (lotteryConfig) out.lotteryConfig = toClientLotteryConfig(lotteryConfig);
  if (Array.isArray(spinPrizes)) out.spinPrizes = spinPrizes.map(toClientSpinPrize);
  return out;
}
