import React from "react";

export interface AccordionProps {
  /** The visible trigger / summary line */
  title: React.ReactNode;
  children: React.ReactNode;
  /** Start in open state */
  open?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

/**
 * Native `<details>` / `<summary>` accordion wrapper.
 *
 * @example
 * ```tsx
 * <Accordion title="What is the return policy?">
 *   <Text>Items can be returned within 30 days of delivery.</Text>
 * </Accordion>
 * ```
 */
export function Accordion({
  title,
  children,
  open,
  className = "",
  titleClassName = "",
  contentClassName = "",
}: AccordionProps) {
  return (
    <details
      open={open}
      className={`group border-b border-zinc-200 dark:border-zinc-700 ${className}`}
    >
      <summary
        className={`flex cursor-pointer select-none list-none items-center justify-between py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 ${titleClassName}`}
      >
        {title}
        <span
          className="ml-2 flex-shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          ▾
        </span>
      </summary>
      <div
        className={`pb-4 text-sm text-zinc-600 dark:text-zinc-400 ${contentClassName}`}
      >
        {children}
      </div>
    </details>
  );
}
