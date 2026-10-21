/*
 * The inventory feature's surface.
 *
 * 🛑 NOT re-exported from `appkit/src/index.ts`. Every one of these reaches
 * `firebase-admin` through `BaseRepository`, and the main barrel is reachable
 * from the CLIENT bundle — Turbopack resolves a module's full static import
 * graph before any tree-shaking, so one reachable repository drags
 * `node:child_process` into a browser chunk and the production build fails on
 * every page (Root Cause #6 / #24). Server code imports the defining module
 * or `appkit/src/server.ts`.
 *
 * @tag domain:inventory
 * @tag layer:feature
 * @tag access:server
 */

export {
  STORAGE_BOXES_COLLECTION,
  INVENTORY_PLACEMENTS_COLLECTION,
  INVENTORY_MOVEMENTS_COLLECTION,
  BoxTypeValues,
  BoxStatusValues,
  MovementKindValues,
  placementId,
  STORAGE_BOX_FIELDS,
  INVENTORY_PLACEMENT_FIELDS,
  INVENTORY_MOVEMENT_FIELDS,
} from "./schemas/firestore";
export type {
  BoxType,
  BoxStatus,
  MovementKind,
  StorageBoxDocument,
  InventoryPlacementDocument,
  InventoryMovementDocument,
} from "./schemas/firestore";

export {
  StorageBoxesRepository,
  storageBoxesRepository,
} from "./repository/storage-boxes.repository";
export type { StorageBoxCreateInput } from "./repository/storage-boxes.repository";

export {
  InventoryPlacementsRepository,
  inventoryPlacementsRepository,
} from "./repository/inventory-placements.repository";
export type {
  PlaceInput,
  MoveInput,
  PickInput,
} from "./repository/inventory-placements.repository";

export {
  InventoryMovementsRepository,
  inventoryMovementsRepository,
} from "./repository/inventory-movements.repository";
export type { InventoryMovementCreateInput } from "./repository/inventory-movements.repository";
