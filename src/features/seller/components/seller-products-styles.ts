// S-STORE — shared style constants for SellerProductsView and its sub-components.
// Token-based — no raw hex / breakpoint literals.

export const INPUT_CLS =
  "w-full rounded border border-[var(--appkit-color-border)] bg-transparent px-2 py-1.5 text-sm";

export const FILTER_LABEL_CLS =
  "text-xs font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-wide";

export const CARD_BORDER = "border-[var(--appkit-color-border)]";
export const CARD_BORDER_ACTIVE = "border-[var(--appkit-color-primary)]";

export const CARD_GRID_CLS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";
export const CARD_LIST_CLS = "flex flex-col gap-2";

export const KIND_BADGE_VARIANT: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  auction: "warning",
  "pre-order": "secondary",
  "prize-draw": "primary",
  standard: "default",
};
