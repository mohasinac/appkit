/**
 * Public re-export of the ActionResult envelope utilities.
 *
 * `ActionResult`, `isOk`, and `unwrap` are pure types + zero-dep helpers
 * with no server-side bindings. They live under `_internal/shared/types/`
 * because they are consumed by both the route handler factory and server
 * actions inside appkit; this file is the canonical public surface so
 * consumers (and the `appkit/src/client.ts` barrel) import from here.
 */

export type { ActionResult } from "../_internal/shared/types/action-result";
export { isOk, unwrap } from "../_internal/shared/types/action-result";
