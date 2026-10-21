/**
 * payment-cases — server surface.
 *
 * A narrow barrel for one feature's public entry points (Root Cause #18), not a
 * convenience hub. The repository is imported directly by anything that
 * queries; only the ingest/reconcile helpers go through here, because those are
 * what a route or a job calls.
 */

export {
  ingestDispute,
  reconcileDisputes,
  DISPUTE_EVENT_PREFIX,
  type DisputeWebhookEntity,
} from "./disputes";
