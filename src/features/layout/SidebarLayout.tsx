import React, { forwardRef } from "react";
import { Aside, Div } from "../../ui";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface SidebarLayoutProps {
  isOpen: boolean;
  ariaLabel: string;
  onClose: () => void;
  /** Content pinned inside a fixed (non-scrolling) header strip */
  header: React.ReactNode;
  /** Scrollable body content */
  children: React.ReactNode;
  id?: string;
}

/**
 * SidebarLayout — generic slide-out sidebar shell.
 *
 * Renders:
 *  - Backdrop overlay when open (closes on click)
 *  - Aside container with transform animation (right-side slide)
 *  - Fixed header slot (no-scroll, pinned at top)
 *  - Scrollable body slot (fills remaining height)
 *
 * Uses `forwardRef` so the parent can attach a swipe-detection ref
 * to the rendered `aside` element.
 */
export const SidebarLayout = forwardRef<HTMLElement, SidebarLayoutProps>(
  function SidebarLayout(
    { isOpen, ariaLabel, onClose, header, children, id = "secondary-sidebar" },
    ref,
  ) {
    return (
      <>
        {/* Backdrop overlay */}
        {isOpen && (
          <Div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[var(--appkit-z-overlay)] transition-opacity duration-300"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <Aside
          ref={ref as React.RefObject<HTMLElement>}
          id={id}
          aria-label={ariaLabel}
          className={`
            fixed inset-y-0 right-0
            w-80
            bg-white dark:bg-slate-900 border-l border-zinc-200 dark:border-slate-800
            shadow-2xl
            transform duration-300 ease-in-out
            z-50
            ${isOpen ? "translate-x-0" : "translate-x-full"}
            flex flex-col
          `}
        >
          {/* Fixed (non-scrolling) header strip */}
          <Div className="flex-shrink-0 px-6 py-5 border-b border-zinc-200 dark:border-slate-800 dark:bg-slate-900/80" surface="muted">
            {header}
          </Div>

          {/* Scrollable body */}
          <Div className={`flex-1 ${__O.yAuto} scrollbar-thin px-6`} padding="y-md">
            {children}
          </Div>
        </Aside>
      </>
    );
  },
);

SidebarLayout.displayName = "SidebarLayout";
