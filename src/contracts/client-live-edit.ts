/**
 * Client-side live-edit contract (Phase 3, overhaul brief).
 *
 * `<LiveEditableRegion>` is a client component — its save has to happen from
 * the browser, so this is a SEPARATE registry from `contracts/registry.ts`'s
 * `ProviderRegistry`, matching `IClientAuthProvider`/`IClientSessionAdapter`/
 * `IClientRealtimeProvider`: those are registered via
 * `src/lib/client-providers-init.ts` in the consumer, a "use client" module
 * that runs in the browser bundle, never in `providers.config.ts` (which is
 * server-only — it imports firebase-admin). Putting this on the server
 * registry would mean `getProviders().liveEdit` in a browser bundle always
 * reads a DIFFERENT module instance's `_registry`, which is never the one
 * `providers.config.ts` populated — the same dual-instance trap Root Cause
 * #14/#19 describes for the Firebase SDK itself.
 */

export interface LiveEditSaveRequest {
  /** What kind of document this is — e.g. `"faq"`. The provider's own vocabulary. */
  contentType: string;
  id: string;
  /** Which field on the document, e.g. `"answer"`. */
  field: string;
  value: string;
}

export interface IClientLiveEditProvider {
  save(request: LiveEditSaveRequest): Promise<void>;
}

let _provider: IClientLiveEditProvider | null = null;

export function registerClientLiveEditProvider(provider: IClientLiveEditProvider): void {
  _provider = provider;
}

/** `null` means no provider registered — `<LiveEditableRegion>` renders a disabled affordance rather than a dead one. */
export function getClientLiveEditProvider(): IClientLiveEditProvider | null {
  return _provider;
}
