import type { ActionDef } from "./action-registry";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";

const KIND_TO_VARIANT: Record<string, BulkActionItem["variant"]> = {
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
  ghost: "ghost",
  link: "ghost",
  chip: "ghost",
};

export function buildBulkAction(
  actionDef: ActionDef,
  onClick: () => void | Promise<void>,
  overrides?: Partial<Pick<BulkActionItem, "id" | "variant" | "icon" | "disabled" | "loading">>,
): BulkActionItem {
  return {
    id: overrides?.id ?? `bulk-${actionDef.id}`,
    label: actionDef.label,
    variant: overrides?.variant ?? KIND_TO_VARIANT[actionDef.kind] ?? "secondary",
    onClick,
    ...(overrides?.icon !== undefined && { icon: overrides.icon }),
    ...(overrides?.disabled !== undefined && { disabled: overrides.disabled }),
    ...(overrides?.loading !== undefined && { loading: overrides.loading }),
  };
}
