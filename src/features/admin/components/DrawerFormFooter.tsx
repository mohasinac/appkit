import { Button, Div, Row } from "@mohasinac/appkit/ui";
import { FORM_ACTION_META, FORM_ACTION_ID } from "../../products/constants/action-defs";

/**
 * DrawerFormFooter
 *
 * Cancel + Save (+ optional Delete) button row for drawer/modal forms.
 * Default labels come from FORM_ACTION_META so they stay in sync with the
 * platform-wide action-defs constants. Override via the `labels` prop.
 *
 * @example
 * <DrawerFormFooter onCancel={close} onSubmit={save} />
 *
 * // With delete:
 * <DrawerFormFooter onCancel={close} onSubmit={save} onDelete={remove}
 *   labels={{ submit: "Update", delete: "Remove", cancel: "Cancel" }} />
 */

export interface DrawerFormFooterLabels {
  submit?: string;
  delete?: string;
  cancel?: string;
  saving?: string;
}

interface DrawerFormFooterThemeConfig {
  borderClass?: string;
}

export interface DrawerFormFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  isSubmitDisabled?: boolean;
  className?: string;
  labels?: DrawerFormFooterLabels;
  /**
   * "footer" (default) — placed in SideDrawer footer prop; the drawer wrapper
   * supplies the border and background.
   * "inline" — placed inside the scrollable content area; adds its own
   * top border separator.
   */
  variant?: "footer" | "inline";
  themeConfig?: DrawerFormFooterThemeConfig;
}

const DEFAULT_LABELS: Required<DrawerFormFooterLabels> = {
  submit:  FORM_ACTION_META[FORM_ACTION_ID.SUBMIT].label,
  delete:  FORM_ACTION_META[FORM_ACTION_ID.DELETE].label,
  cancel:  FORM_ACTION_META[FORM_ACTION_ID.CANCEL].label,
  saving:  "Saving…",
};

export function DrawerFormFooter({
  onCancel,
  onSubmit,
  onDelete,
  isLoading = false,
  isSubmitDisabled = false,
  className = "",
  labels,
  variant = "footer",
  themeConfig = { borderClass: "border-t border-zinc-200 dark:border-zinc-700" },
}: DrawerFormFooterProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      className={`flex items-center gap-3${
        variant === "inline" ? ` pt-4 ${themeConfig.borderClass}` : ""
      } ${className}`}
    >
      {onDelete && (
        <Button
          variant={FORM_ACTION_META[FORM_ACTION_ID.DELETE].variant}
          onClick={onDelete}
          disabled={isLoading}
          size="md"
        >
          {l.delete}
        </Button>
      )}

      <Row className={`${!onDelete ? " ml-auto" : ""}`} align="center" gap="3">
        <Button
          variant={FORM_ACTION_META[FORM_ACTION_ID.CANCEL].variant}
          onClick={onCancel}
          disabled={isLoading}
          size="md"
        >
          {l.cancel}
        </Button>

        <Button
          variant={FORM_ACTION_META[FORM_ACTION_ID.SUBMIT].variant}
          onClick={onSubmit}
          disabled={isLoading || isSubmitDisabled}
          size="md"
        >
          {isLoading ? l.saving : l.submit}
        </Button>
      </Row>
    </div>
  );
}
