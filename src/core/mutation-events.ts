/**
 * Mutation event bus — @mohasinac/appkit/core
 *
 * Typed event names for feature-level CRUD mutations.
 * Feature actions do NOT need to be modified — `createServerAction()` emits
 * the appropriate event automatically via its `afterAction` hook when the
 * action name matches a known mutation pattern.
 *
 * Consumers can also emit and subscribe to events manually:
 *
 * @example
 * ```ts
 * // Subscribe — in a React component or provider:
 * import { onMutation, MUTATION_EVENTS } from "@mohasinac/appkit/core";
 *
 * onMutation(MUTATION_EVENTS.PRODUCT.CREATED, (payload) => {
 *   queryClient.invalidateQueries({ queryKey: ["products"] });
 * });
 *
 * // Emit — in a custom action:
 * import { emitMutation, MUTATION_EVENTS } from "@mohasinac/appkit/core";
 *
 * emitMutation(MUTATION_EVENTS.ORDER.UPDATED, { id: orderId, ...updatedOrder });
 * ```
 */

import { eventBus } from "./EventBus";
import type { EventSubscription } from "./EventBus";

// --- Typed event name registry ------------------------------------------------

/**
 * Canonical event name constants for all appkit feature mutations.
 * Use these when subscribing or emitting to ensure consistent naming.
 *
 * Pattern: `appkit/<feature>/<operation>`
 */
export const MUTATION_EVENTS = {
  PRODUCT: {
    CREATED: "appkit/product/created",
    UPDATED: "appkit/product/updated",
    DELETED: "appkit/product/deleted",
  },
  ORDER: {
    CREATED: "appkit/order/created",
    UPDATED: "appkit/order/updated",
    DELETED: "appkit/order/deleted",
  },
  REVIEW: {
    CREATED: "appkit/review/created",
    UPDATED: "appkit/review/updated",
    DELETED: "appkit/review/deleted",
  },
  BLOG: {
    CREATED: "appkit/blog/created",
    UPDATED: "appkit/blog/updated",
    DELETED: "appkit/blog/deleted",
  },
  EVENT: {
    CREATED: "appkit/event/created",
    UPDATED: "appkit/event/updated",
    DELETED: "appkit/event/deleted",
  },
  CATEGORY: {
    CREATED: "appkit/category/created",
    UPDATED: "appkit/category/updated",
    DELETED: "appkit/category/deleted",
  },
  SELLER: {
    CREATED: "appkit/seller/created",
    UPDATED: "appkit/seller/updated",
    DELETED: "appkit/seller/deleted",
  },
  STORE: {
    CREATED: "appkit/store/created",
    UPDATED: "appkit/store/updated",
    DELETED: "appkit/store/deleted",
  },
  USER: {
    CREATED: "appkit/user/created",
    UPDATED: "appkit/user/updated",
    DELETED: "appkit/user/deleted",
  },
  PAYOUT: {
    CREATED: "appkit/payout/created",
    UPDATED: "appkit/payout/updated",
    DELETED: "appkit/payout/deleted",
  },
  CART: {
    UPDATED: "appkit/cart/updated",
    CLEARED: "appkit/cart/cleared",
  },
  WISHLIST: {
    UPDATED: "appkit/wishlist/updated",
  },
  FAQ: {
    CREATED: "appkit/faq/created",
    UPDATED: "appkit/faq/updated",
    DELETED: "appkit/faq/deleted",
  },
  COLLECTION: {
    CREATED: "appkit/collection/created",
    UPDATED: "appkit/collection/updated",
    DELETED: "appkit/collection/deleted",
  },
  PROMOTION: {
    CREATED: "appkit/promotion/created",
    UPDATED: "appkit/promotion/updated",
    DELETED: "appkit/promotion/deleted",
  },
  AUCTION: {
    BID_PLACED: "appkit/auction/bid-placed",
    SETTLED: "appkit/auction/settled",
  },
} as const;

/**
 * Payload shape for a mutation event.
 * `data` is the mutated document (or `{ id }` for deletions).
 */
export interface MutationEventPayload<T = unknown> {
  /** The action name that triggered the mutation (from `createServerAction`). */
  actionName: string;
  /** The mutated document. For deletions, this is `{ id: string }`. */
  data: T;
}

// --- Helpers ------------------------------------------------------------------

/**
 * Emit a typed mutation event on the shared `eventBus`.
 *
 * @param eventName   One of the `MUTATION_EVENTS.*` constants (or any string).
 * @param payload     The mutation payload.
 */
export function emitMutation<T = unknown>(
  eventName: string,
  payload: MutationEventPayload<T>,
): void {
  eventBus.emit(eventName, payload);
}

/**
 * Subscribe to a typed mutation event.
 * Returns an `EventSubscription` with an `unsubscribe()` method.
 *
 * @param eventName   One of the `MUTATION_EVENTS.*` constants (or any string).
 * @param handler     Called with the `MutationEventPayload` whenever the event fires.
 */
export function onMutation<T = unknown>(
  eventName: string,
  handler: (payload: MutationEventPayload<T>) => void | Promise<void>,
): EventSubscription {
  return eventBus.on(eventName, handler as (payload: unknown) => void);
}

/**
 * Infer the mutation event name from a server action name using naming conventions.
 * Returns `undefined` if the action name doesn't match a known mutation pattern.
 *
 * Convention: `(create|update|delete|admin*Create|admin*Update|admin*Delete)<Feature>`
 *
 * @example
 * inferMutationEvent("createProduct")    → "appkit/product/created"
 * inferMutationEvent("adminUpdateOrder") → "appkit/order/updated"
 * inferMutationEvent("listProducts")     → undefined (read, not mutation)
 */
export function inferMutationEvent(actionName: string): string | undefined {
  const name = actionName.toLowerCase();

  // Determine operation
  let operation: "created" | "updated" | "deleted" | undefined;
  if (
    /^(create|add|register|submit|place)/.test(name) ||
    name.includes("create") ||
    name.includes("add")
  ) {
    operation = "created";
  } else if (
    /^(update|edit|modify|patch|approve|reject|revoke|toggle|set|mark)/.test(
      name,
    ) ||
    name.includes("update") ||
    name.includes("edit")
  ) {
    operation = "updated";
  } else if (
    /^(delete|remove|revoke|cancel|purge)/.test(name) ||
    name.includes("delete") ||
    name.includes("remove")
  ) {
    operation = "deleted";
  }

  if (!operation) return undefined;

  // Determine feature
  const features: Array<[string, keyof typeof MUTATION_EVENTS]> = [
    ["product", "PRODUCT"],
    ["order", "ORDER"],
    ["review", "REVIEW"],
    ["blog", "BLOG"],
    ["event", "EVENT"],
    ["category", "CATEGORY"],
    ["seller", "SELLER"],
    ["store", "STORE"],
    ["user", "USER"],
    ["payout", "PAYOUT"],
    ["cart", "CART"],
    ["wishlist", "WISHLIST"],
    ["faq", "FAQ"],
    ["collection", "COLLECTION"],
    ["promotion", "PROMOTION"],
    ["coupon", "PROMOTION"],
    ["auction", "AUCTION"],
    ["bid", "AUCTION"],
  ];

  for (const [keyword, featureKey] of features) {
    if (name.includes(keyword)) {
      const featureEvents = MUTATION_EVENTS[featureKey] as Record<
        string,
        string
      >;
      const eventKey = operation.toUpperCase() as keyof typeof featureEvents;
      return featureEvents[eventKey] ?? featureEvents["UPDATED"];
    }
  }

  return undefined;
}
