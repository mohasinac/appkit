import React from "react";
import { Div } from "../../../ui";

export interface BuyBarProps {
  children: React.ReactNode;
  /** Extra classes on the bar wrapper */
  className?: string;
}

/**
 * BuyBar — sticky mobile purchase action bar.
 *
 * Fixed above the bottom navigation (`bottom-16`) on mobile screens.
 * Hidden on `lg:` and above — desktop uses inline CTAs on the PDP.
 *
 * @example
 * ```tsx
 * <BuyBar>
 *   <WishlistButton productId={product.id} />
 *   <AddToCartButton productId={product.id} className="flex-1" />
 * </BuyBar>
 * ```
 */
export function BuyBar({ children, className }: BuyBarProps) {
  return (
    <Div
      className={`fixed bottom-16 inset-x-0 z-40 flex items-center gap-2 px-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-100 dark:border-zinc-800 lg:hidden pb-[env(safe-area-inset-bottom)]${className ? ` ${className}` : ""}`}
      role="region"
      aria-label="Purchase actions"
    >
      {children}
    </Div>
  );
}
