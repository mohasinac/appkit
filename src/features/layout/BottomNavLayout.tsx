import React from "react";
import { Nav, Ul } from "../../ui";

export interface BottomNavLayoutProps {
  ariaLabel: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * BottomNavLayout — generic fixed-bottom navigation shell.
 *
 * Provides the `nav + ul` container with correct z-index, background, height,
 * and safe-area inset. Pass `li`-wrapped items as children.
 */
export function BottomNavLayout({
  ariaLabel,
  children,
  id = "bottom-navbar",
  className,
}: BottomNavLayoutProps) {
  return (
    <Nav
      id={id}
      aria-label={ariaLabel}
      className={`fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-slate-800/80 shadow-2xl pb-safe${className ? ` ${className}` : ""}`}
    >
      <Ul className="flex items-stretch h-14">{children}</Ul>
    </Nav>
  );
}
