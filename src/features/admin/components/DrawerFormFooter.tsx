"use client";

import { Button } from "@mohasinac/appkit/ui";

/**
 * DrawerFormFooter Component
 *
 * Cancel + Save/Delete button pair used in drawer/modal forms.
 * Provides consistent spacing and button styling for form actions.
 *
 * Text labels are injected via the `labels` prop; variant and styling
 * are configured through `themeConfig`.
 *
 * @example
 * ```tsx
 * <DrawerFormFooter
 *   onCancel={() => setShowDrawer(false)}
 *   onSubmit={handleSave}
 *   labels={{ submit: "Save User", cancel: "Cancel" }}
 * />
 *
 * // With delete option
 * <DrawerFormFooter
 *   onCancel={() => setShowDrawer(false)}
 *   onSubmit={handleSave}
 *   onDelete={handleDelete}
 *   labels={{ submit: "Update", delete: "Delete", cancel: "Cancel" }}
 * />
 * ```
 */

interface DrawerFormFooterLabels {
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

export function DrawerFormFooter({
  onCancel,
  onSubmit,
  onDelete,
  isLoading = false,
  isSubmitDisabled = false,
  className = "",
  labels = { submit: "Save", delete: "Delete", cancel: "Cancel", saving: "Saving..." },
  variant = "footer",
  themeConfig = { borderClass: "border-t border-zinc-200 dark:border-zinc-700" },
}: DrawerFormFooterProps) {
  return (
    <div
      className={`flex items-center gap-3${
        variant === "inline" ? ` pt-4 ${themeConfig.borderClass}` : ""
      } ${className}`}
    >
      {onDelete && (
        <Button
          variant="danger"
          onClick={onDelete}
          disabled={isLoading}
          size="md"
        >
          {labels.delete}
        </Button>
      )}

      <div className={`flex items-center gap-3${!onDelete ? " ml-auto" : ""}`}>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          size="md"
        >
          {labels.cancel}
        </Button>

        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={isLoading || isSubmitDisabled}
          size="md"
        >
          {isLoading ? labels.saving : labels.submit}
        </Button>
      </div>
    </div>
  );
}
