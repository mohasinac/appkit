import React from "react";
import { ChevronRight } from "lucide-react";
import { Nav, Ol, Li } from "./Semantic";
import { Span } from "./Typography";

/**
 * Breadcrumb — accessible navigation trail with ChevronRight separators.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 * Last item is displayed with `font-medium` (non-link, current page).
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <Nav aria-label="Breadcrumb" className={className}>
      <Ol className="flex items-center gap-1 flex-wrap text-sm text-zinc-500 dark:text-zinc-400">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400 dark:text-zinc-600"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <Span
                  className={
                    isLast
                      ? "font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </Span>
              ) : (
                <a
                  href={item.href}
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {item.label}
                </a>
              )}
            </Li>
          );
        })}
      </Ol>
    </Nav>
  );
}
