/**
 * gateway-events — server surface.
 *
 * 🛑 A barrel for ONE feature's public surface, not a convenience re-export
 * hub (Root Cause #18). Three symbols, all consumed by the webhook route; the
 * repository is imported directly by anything that queries, because a
 * reconciler has no business pulling the redactor into its graph.
 */

export {
  ingestGatewayEvent,
  settleGatewayEvent,
  statusForDispatch,
  resolveDuplicateDelivery,
  type IngestGatewayEventInput,
  type SettleGatewayEventInput,
  type DuplicateAction,
  type DuplicateResolution,
} from "./ingest";
export { redactGatewayPayload, type RedactResult } from "./redact";
