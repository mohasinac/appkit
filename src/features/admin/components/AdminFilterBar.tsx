import { Button } from "@mohasinac/appkit/ui";

/**
 * AdminFilterBar Component
 *
 * Generic card-wrapped grid of filter inputs (search, select, status tabs).
 * When `deferred={true}`, renders Apply and Reset buttons so filter changes
 * are only committed until the user explicitly applies them.
 *
 * Styling (padding, theme colors) is injected via the `themeConfig` prop.
 *
 * @example
 * ```tsx
 * <AdminFilterBar 
 *   deferred 
 *   onApply={filters.apply} 
 *   onReset={filters.reset} 
 *   pendingCount={filters.pendingCount}
 *   labels={{ apply: "Apply", reset: "Reset", applyCount: "Apply" }}
 *   themeConfig={{ cardPadding: "p-4", flexEnd: "flex justify-end" }}
 * >
 *   <Input placeholder="Search users..." />
 *   <Select>...</Select>
 * </AdminFilterBar>
 * ```
 */

interface FilterBarLabels {
  apply?: string;
  reset?: string;
  applyCount?: string; // "Apply (N)" when pendingCount > 0
}

interface FilterBarThemeConfig {
  cardPadding?: string;
  flexEnd?: string;
  Card?: React.ComponentType<{ children: React.ReactNode; className?: string }>;
}

export interface AdminFilterBarProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  /** Wrap filter content in a Card. Defaults to true. */
  withCard?: boolean;
  /**
   * When true, renders Apply + Reset action buttons.
   * Filter changes are NOT written to the URL until `onApply` is called.
   */
  deferred?: boolean;
  /** Called when the Apply button is clicked (only used when `deferred=true`). */
  onApply?: () => void;
  /** Called when the Reset button is clicked (only used when `deferred=true`). */
  onReset?: () => void;
  /**
   * Number of pending (uncommitted) filter changes.
   * Shown in the Apply button label when > 0.
   * The Reset button is hidden when this is 0.
   */
  pendingCount?: number;
  /** Injected labels for button text. */
  labels?: FilterBarLabels;
  /** Injected theme config (padding, flex, Card component). */
  themeConfig?: FilterBarThemeConfig;
}

export function AdminFilterBar({
  children,
  columns = 3,
  className = "",
  withCard = true,
  deferred = false,
  onApply,
  onReset,
  pendingCount = 0,
  labels = { apply: "Apply", reset: "Reset" },
  themeConfig = { cardPadding: "p-4", flexEnd: "flex justify-end" },
}: AdminFilterBarProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4",
  };

  const innerContent = (
    <>
      <div className={`grid ${gridCols[columns]} gap-4`} data-section="adminfilterbar-div-249">{children}</div>
      {deferred && (
        <div className={`${themeConfig.flexEnd} gap-2 mt-3`} data-section="adminfilterbar-div-250">
          {pendingCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              {labels.reset}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onApply}>
            {pendingCount > 0
              ? `${labels.applyCount || labels.apply} (${pendingCount})`
              : labels.apply}
          </Button>
        </div>
      )}
    </>
  );

  // If Card component is provided in config, use it; otherwise wrap in plain div
  if (withCard && themeConfig.Card) {
    return (
      <themeConfig.Card
        className={`${themeConfig.cardPadding} ${className}`}
      >
        {innerContent}
      </themeConfig.Card>
    );
  }

  if (!withCard) return <div className={className} data-section="adminfilterbar-div-251">{innerContent}</div>;

  // Fallback: render as plain div if no Card provided but withCard=true
  return (
    <div className={`${themeConfig.cardPadding} ${className}`} data-section="adminfilterbar-div-252">
      {innerContent}
    </div>
  );
}
