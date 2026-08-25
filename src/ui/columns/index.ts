/**
 * Barrel for shared column utilities.
 */
export { buildColumns, createColumnBuilder, resolveColumnPriority } from "./build-columns";
export {
  renderBoolean,
  renderCurrency,
  renderCurrencyCompact,
  renderCount,
  renderNullable,
  renderRating,
  getStatusTone,
  getResourceIcon,
} from "./column-renderers";
export type {
  BooleanRenderOpts,
  RatingMode,
  RatingRenderOpts,
  StatusTone,
} from "./column-renderers";

// JSX renderers. Deliberately a separate module from `column-renderers.ts`:
// that one is React-free so it can run in a server context, and mixing the two
// would drag React into every consumer of a plain string formatter.
export {
  STATUS_TONE_CLASSES,
  renderStatusBadge,
  renderThumbnail,
  renderAvatar,
  renderMoney,
  renderRelativeDate,
  renderBooleanIcon,
  renderCountPill,
  renderTypeChip,
} from "./cell-renderers";
