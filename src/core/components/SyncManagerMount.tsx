"use client";
/**
 * SyncManagerMount — mounts useSyncManager() once, globally.
 *
 * Root-caused 2026-08-20: useSyncManager (the hook that replays the
 * local-first cart/wishlist op queue against the server — see
 * ../hooks/useSyncManager.ts) was never actually called anywhere in the
 * app. Every listing-grid "Add to Cart"/"Add to Wishlist" button writes to
 * a localStorage op queue and shows an immediately-optimistic toast +
 * badge-count update (via the pending-ops delta), but with no mounted
 * useSyncManager the queued op had no code path that would ever POST it
 * to the server — the badge looked right, but the actual /cart or
 * /user/wishlist page (reading the real server state) stayed empty
 * forever, not just briefly. Mount this once, high in the tree, wherever
 * the current session's uid is known.
 */
import { useSyncManager } from "../hooks/useSyncManager";
import { useSession } from "../../react/contexts/SessionContext";

export function SyncManagerMount() {
  const { user } = useSession();
  useSyncManager(user?.uid);
  return null;
}
