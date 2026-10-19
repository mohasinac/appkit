import { ChevronRight } from "lucide-react";
import { Nav, Ol, Li } from "./Semantic";
import { Span } from "./Typography";
import { TextLink } from "./TextLink";

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

export type BreadcrumbTone = "default" | "on-media";

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  /**
   * `"on-media"` for a trail drawn over a cover photo — fixed white ink on the
   * scrim, in both themes. See the tone block in `Breadcrumb.style.css` for why
   * it is not a theme token.
   */
  tone?: BreadcrumbTone;
}

export function Breadcrumb({ items, className = "", tone = "default" }: BreadcrumbProps) {
  return (
    <Nav
      aria-label="Breadcrumb"
      className={`${tone === "on-media" ? "appkit-breadcrumb--on-media" : ""} ${className}`}
    >
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
                <TextLink href={item.href} variant="none" className="appkit-breadcrumb__link">
                  {item.label}
                </TextLink>
              )}
            </Li>
          );
        })}
      </Ol>
    </Nav>
  );
}
