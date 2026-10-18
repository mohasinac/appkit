"use client";
/*
 * WHY: A pill/tab row that is wider than its container has, until now, been
 *      solved three different ways in this codebase and badly in all of them:
 *      seven rows were a bare `overflow-x-auto` with NO affordance (the
 *      Subcategories row shipped 12 pills on a 1440px viewport with the last
 *      four simply unreachable), six went through `TabBarShell`'s scroll
 *      arrows, and `Tabs` collapsed to a native `<select>` on a hard-coded
 *      count of 5 — a threshold that is wrong in both directions, since four
 *      long labels overflow a phone and eight short ones fit a desktop.
 *
 *      Width is the only honest input. This measures it.
 *
 * WHAT: A row of items that renders as pills while they fit and becomes a
 *       single searchable, keyboard-navigable dropdown when they do not.
 *       Every item may carry a leading visual (cover image, lucide glyph,
 *       status dot) which is shown in BOTH states.
 *
 * EXPORTS: OverflowRow, OverflowRowProps, OverflowRowItem
 *
 * @tag domain:ui
 * @tag layer:ui
 * @tag pattern:none
 * @tag access:client
 * @tag sideEffects:dom-measurement
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { Check, ChevronDown, Search } from "lucide-react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import type { IconKey } from "../icons/icon-registry";
import { Input } from "./Input";
import { useRowCollapse } from "./row-collapse";

const UI_OVERFLOW_ROW = {
  shell: "appkit-overflow-row",
  row: "appkit-overflow-row__row",
  pill: "appkit-overflow-row__pill",
  pillActive: "appkit-overflow-row__pill--active",
  count: "appkit-overflow-row__count",
  visual: "appkit-overflow-row__visual",
  dot: "appkit-overflow-row__dot",
  emoji: "appkit-overflow-row__emoji",
  trigger: "appkit-overflow-row__trigger",
  triggerLabel: "appkit-overflow-row__trigger-label",
  popover: "appkit-overflow-row__popover",
  search: "appkit-overflow-row__search",
  list: "appkit-overflow-row__list",
  option: "appkit-overflow-row__option",
  optionActive: "appkit-overflow-row__option--active",
  optionSelected: "appkit-overflow-row__option--selected",
  optionLabel: "appkit-overflow-row__option-label",
  optionCount: "appkit-overflow-row__option-count",
  empty: "appkit-overflow-row__empty",
  check: "appkit-overflow-row__check",
} as const;

/** Status tones for a leading dot. Mirrors the status colour pairs in tokens.css. */
export type OverflowRowDotTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted";

/**
 * Navigation props forwarded to every `href` item's link.
 *
 * Deliberately an explicit list rather than `Record<string, unknown>`: a bag
 * of unknowns at a component boundary type-checks against anything, so a
 * misspelled `scrollTo` would compile and silently do nothing — the defect
 * being passed through here is precisely the kind that has no visible symptom.
 */
export interface OverflowRowLinkProps {
  /**
   * `false` opts the link out of the global `<ScrollToTop>`, which is keyed on
   * pathname. A tab bar that swaps a panel must pass this or every click
   * yanks the page to the top.
   */
  scroll?: boolean;
  prefetch?: boolean;
  replace?: boolean;
}

export interface OverflowRowItem {
  id: string;
  /**
   * Plain text. Required even when a visual is present: it is the search
   * corpus, the collapsed trigger's text, and the accessible name.
   */
  label: string;
  /** Trailing count. `undefined` means "not counted", NOT zero — it is omitted rather than rendered as 0. */
  count?: number;
  /**
   * Leading visual, in precedence order: `imageUrl` → `iconName` → `emoji` →
   * `dotTone`. Only one renders. All are optional; an item with none renders
   * label-only and the row stays aligned because the visual box is not
   * reserved when NO item in the set has one.
   */
  imageUrl?: string;
  iconName?: IconKey;
  emoji?: string;
  dotTone?: OverflowRowDotTone;
  /** Renders the pill as a link. Mutually exclusive with `onSelect`. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface OverflowRowProps {
  items: readonly OverflowRowItem[];
  /** Accessible name for the row and its collapsed dropdown. Required — an unnamed tablist is unusable. */
  ariaLabel: string;
  /** Selected item id. Drives `aria-selected`, the active pill, and the collapsed trigger's label. */
  activeId?: string;
  /**
   * `"tabs"` renders `role="tablist"` / `role="tab"`; `"nav"` renders a plain
   * list of links. Pick by what the items DO: a tab swaps a panel in place, a
   * nav item navigates away. The collapsed dropdown is a `listbox` either way,
   * because a `<select>`-shaped control is what a collapsed row reads as.
   */
  variant?: "tabs" | "nav";
  /** Collapsed trigger text when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  /**
   * Skip measurement and always render collapsed. For sets known to be large
   * at author time; the measured path is the default and is preferred.
   */
  alwaysCollapsed?: boolean;
  /**
   * Component used to render `href` items. Defaults to `next/link`.
   *
   * 🛑 Not a raw `<a>`, and the default is load-bearing: a plain anchor does a
   * FULL PAGE LOAD, so a row of category links silently drops client-side
   * navigation and every click re-downloads the document. Override it only to
   * supply a locale-aware link (the consumer's `@/i18n/navigation` `Link`),
   * never to go back to an anchor.
   */
  linkAs?: React.ElementType;
  /**
   * Extra props spread onto every `href` item's link.
   *
   * The case this exists for is `scroll={false}`: a tab bar that swaps a panel
   * must NOT jump the page to the top on every click, and the app mounts a
   * global `<ScrollToTop>` keyed on pathname, so opting out per-link is the
   * documented escape hatch. Also carries `prefetch`.
   */
  linkProps?: OverflowRowLinkProps;
  /** Applied to the outer shell. */
  className?: string;
}

function visualOf(item: OverflowRowItem, size: "pill" | "option"): React.ReactNode {
  if (item.imageUrl) {
    return (
      <Avatar
        src={item.imageUrl}
        name={item.label}
        size="xs"
        className={UI_OVERFLOW_ROW.visual}
      />
    );
  }
  if (item.iconName) {
    return <Icon name={item.iconName} size={size === "pill" ? "sm" : "md"} tone="current" />;
  }
  if (item.emoji) {
    return (
      <span className={UI_OVERFLOW_ROW.emoji} aria-hidden="true">
        {item.emoji}
      </span>
    );
  }
  if (item.dotTone) {
    return <span className={UI_OVERFLOW_ROW.dot} data-tone={item.dotTone} aria-hidden="true" />;
  }
  return null;
}

/** Stable signature of the item set — invalidates the cached natural width when the set changes. */
function signatureOf(items: readonly OverflowRowItem[]): string {
  return items.map((i) => `${i.id}:${i.label}:${i.count ?? ""}`).join("|");
}

export function OverflowRow({
  items,
  ariaLabel,
  activeId,
  variant = "tabs",
  placeholder,
  searchPlaceholder = "Search…",
  noResultsText = "No matches",
  alwaysCollapsed = false,
  linkAs: Link = NextLink,
  linkProps,
  className = "",
}: OverflowRowProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const signature = useMemo(() => signatureOf(items), [items]);
  const collapsed = useRowCollapse(shellRef, rowRef, signature, {
    disabled: alwaysCollapsed,
    initial: alwaysCollapsed,
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the search field on open — the whole point of collapsing is that the
  // set is too big to scan, so typing must work without a second click.
  useEffect(() => {
    if (open) searchRef.current?.focus();
    else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const activeItem = items.find((item) => item.id === activeId);

  const commit = useCallback((item: OverflowRowItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    setOpen(false);
  }, []);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const count = filtered.length;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!count) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % count);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + count) % count);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(count - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[Math.min(activeIndex, count - 1)];
      if (!item) return;
      if (item.href) {
        window.location.assign(item.href);
        return;
      }
      commit(item);
    }
  };

  const hasAnyVisual = items.some(
    (item) => item.imageUrl || item.iconName || item.emoji || item.dotTone,
  );

  // ── Collapsed: one searchable dropdown ──────────────────────────────────
  if (collapsed) {
    return (
      <div
        ref={shellRef}
        className={[UI_OVERFLOW_ROW.shell, className].filter(Boolean).join(" ")}
        data-collapsed="true"
      >
        <button
          ref={triggerRef}
          type="button"
          className={UI_OVERFLOW_ROW.trigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={ariaLabel}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          {activeItem ? visualOf(activeItem, "pill") : null}
          <span className={UI_OVERFLOW_ROW.triggerLabel}>
            {activeItem?.label ?? placeholder ?? ariaLabel}
          </span>
          {items.length > 0 && (
            <span className={UI_OVERFLOW_ROW.count}>{items.length}</span>
          )}
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>

        {open && (
          <div className={UI_OVERFLOW_ROW.popover}>
            {/*
              The search field is deliberately a SIBLING of the listbox, never a
              child: a `role="listbox"` may only contain `option`/`group`, and
              nesting a textbox inside one is what makes a screen reader
              announce the field as an option.
            */}
            <div className={UI_OVERFLOW_ROW.search}>
              <Input
                ref={searchRef}
                type="search"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listboxId}
                aria-activedescendant={
                  filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined
                }
                icon={<Search className="w-4 h-4" aria-hidden="true" />}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
              />
            </div>

            <div id={listboxId} role="listbox" aria-label={ariaLabel} className={UI_OVERFLOW_ROW.list}>
              {filtered.length === 0 && (
                <div className={UI_OVERFLOW_ROW.empty}>{noResultsText}</div>
              )}
              {filtered.map((item, index) => {
                const isSelected = item.id === activeId;
                const classes = [
                  UI_OVERFLOW_ROW.option,
                  index === activeIndex ? UI_OVERFLOW_ROW.optionActive : "",
                  isSelected ? UI_OVERFLOW_ROW.optionSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const body = (
                  <>
                    {hasAnyVisual ? visualOf(item, "option") : null}
                    <span className={UI_OVERFLOW_ROW.optionLabel}>{item.label}</span>
                    {typeof item.count === "number" && (
                      <span className={UI_OVERFLOW_ROW.optionCount}>
                        {item.count > 99 ? "99+" : item.count}
                      </span>
                    )}
                    {isSelected && (
                      <Check className={`w-4 h-4 ${UI_OVERFLOW_ROW.check}`} aria-hidden="true" />
                    )}
                  </>
                );

                return item.href ? (
                  <Link
                    key={item.id}
                    {...linkProps}
                    id={`${listboxId}-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    href={item.href}
                    className={classes}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    id={`${listboxId}-${item.id}`}
                    role="option"
                    type="button"
                    aria-selected={isSelected}
                    disabled={item.disabled}
                    className={classes}
                    onClick={() => commit(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Expanded: the pill row ──────────────────────────────────────────────
  return (
    <div
      ref={shellRef}
      className={[UI_OVERFLOW_ROW.shell, className].filter(Boolean).join(" ")}
      data-collapsed="false"
    >
      <div
        ref={rowRef}
        className={UI_OVERFLOW_ROW.row}
        role={variant === "tabs" ? "tablist" : undefined}
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          const classes = [
            UI_OVERFLOW_ROW.pill,
            isActive ? UI_OVERFLOW_ROW.pillActive : "",
          ]
            .filter(Boolean)
            .join(" ");
          const body = (
            <>
              {visualOf(item, "pill")}
              {item.label}
              {typeof item.count === "number" && (
                <span className={UI_OVERFLOW_ROW.count}>
                  {item.count > 99 ? "99+" : item.count}
                </span>
              )}
            </>
          );

          return item.href ? (
            <Link
              key={item.id}
              {...linkProps}
              href={item.href}
              className={classes}
              role={variant === "tabs" ? "tab" : undefined}
              aria-selected={variant === "tabs" ? isActive : undefined}
              aria-current={variant === "nav" && isActive ? "page" : undefined}
            >
              {body}
            </Link>
          ) : (
            <button
              key={item.id}
              type="button"
              className={classes}
              role={variant === "tabs" ? "tab" : undefined}
              aria-selected={variant === "tabs" ? isActive : undefined}
              disabled={item.disabled}
              onClick={() => commit(item)}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OverflowRow;
