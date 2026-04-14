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
    <Nav aria-label="Breadcrumb" className={`appkit-breadcrumb ${className}`}>
      <Ol className="appkit-breadcrumb__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Li key={i} className="appkit-breadcrumb__item">
              {i > 0 && (
                <ChevronRight
                  className="appkit-breadcrumb__separator"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <Span
                  className={
                    isLast
                      ? "appkit-breadcrumb__current"
                      : "appkit-breadcrumb__text"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </Span>
              ) : (
                <a href={item.href} className="appkit-breadcrumb__link">
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
