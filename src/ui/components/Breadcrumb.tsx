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
    /*
     * 🛑 `appkit-page-breadcrumb` IS A SIGNAL TO CSS, not a style hook — and
     * it belongs on THIS primitive rather than on `BreadcrumbTrail`, because
     * this is the one thing every page-level breadcrumb has in common.
     * `BreadcrumbTrail` wraps it; the scam registry's three surfaces render it
     * directly; and `AutoBreadcrumbs` — the automatic, pathname-derived trail
     * the shell renders on every route — does NOT use it at all, building its
     * own `<Nav><Ol>`. So this class means exactly "a page supplied its own
     * breadcrumb", with one owner and nothing to keep in sync.
     *
     * `AutoBreadcrumbs.style.css` hides the automatic trail when this appears
     * anywhere in the body. See that file for why the resolution is `:has()`
     * and not React state: the shell renders before `{children}`, so a flag a
     * page sets arrives a frame late, and hiding a full-width strip after
     * paint is the top-of-page layout shift just fixed on the announcement
     * bar.
     */
    <Nav
      aria-label="Breadcrumb"
      className={`appkit-page-breadcrumb ${tone === "on-media" ? "appkit-breadcrumb--on-media" : ""} ${className}`}
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
