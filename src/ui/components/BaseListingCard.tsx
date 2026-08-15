import type { ReactNode, MouseEvent } from "react";
import { MediaImage } from "../../features/media/MediaImage";

import { Span } from "./Typography";

export interface BaseListingCardIconOverlayProps {
  /** Single icon (emoji or `/media/<slug>` URL) — typically `product.groupIcon`. */
  groupIcon?: string;
  /** Second icon — typically `product.sublistingIcon`. */
  sublistingIcon?: string;
  /** Where the overlay sits inside the hero. */
  position?: string;
}

// audit-touch-handler-ok: pure passthrough props onto the DOM element, no
// owned gesture state — callers wiring their own useLongPress() (see the
// card components) are responsible for their own onTouchCancel.
export interface BaseListingCardRootProps {
  className?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  variant?: "grid" | "list";
  onClick?: () => void;
  children?: ReactNode;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onTouchCancel?: () => void;
}

export interface BaseListingCardHeroProps {
  /** Aspect ratio for the hero image — only these two produce a real CSS rule (Tailwind's static scanner can't see a dynamically-interpolated `aspect-[${var}]`). Defaults to `"4/3"`. */
  aspect?: "square" | "4/3";
  variant?: "grid" | "list";
  className?: string;
  children?: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface BaseListingCardInfoProps {
  variant?: "grid" | "list";
  className?: string;
  children?: ReactNode;
}

export interface BaseListingCardCheckboxProps {
  selected?: boolean;
  onSelect?: (e: MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  position?: string;
  className?: string;
}

function BaseListingCardRoot({
  className = "",
  isSelected,
  isDisabled,
  variant = "grid",
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  children,
}: BaseListingCardRootProps) {
  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={[
        "group relative w-full min-w-0 overflow-hidden rounded-xl border bg-[var(--appkit-color-surface)] transition-shadow",
        variant === "list" ? "flex flex-row items-stretch" : "flex flex-col",
        isSelected
          ? "border-primary outline outline-2 outline-primary shadow-sm"
          : "border-[var(--appkit-color-border)] shadow-sm hover:shadow-md",
        isDisabled ? "opacity-60" : "",
        onClick ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function BaseListingCardHero({
  aspect,
  variant = "grid",
  className = "",
  children,
  onMouseEnter,
  onMouseLeave,
}: BaseListingCardHeroProps) {
  if (variant === "list") {
    return (
      <div
        className={[
          "relative overflow-hidden bg-[var(--appkit-color-surface)] flex-shrink-0",
          "w-20 h-20 sm:w-28 sm:h-28",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    );
  }

  // Literal, statically-scannable class names only — never interpolate an
  // arbitrary value into `aspect-[...]`, Tailwind's JIT scanner can't see it
  // and the rule silently never makes it into the compiled CSS.
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-[4/3]";

  return (
    <div
      className={[
        "relative overflow-hidden bg-[var(--appkit-color-surface)] flex-shrink-0",
        aspectClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function BaseListingCardInfo({
  variant = "grid",
  className = "",
  children,
}: BaseListingCardInfoProps) {
  return (
    <div
      className={[
        "flex flex-col flex-1 min-w-0 gap-1",
        variant === "list" ? "p-2 sm:p-3 justify-center" : "p-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function BaseListingCardCheckbox({
  selected,
  onSelect,
  label,
  position = "top-2 left-2",
  className = "",
}: BaseListingCardCheckboxProps) {
  return (
    <button
      type="button"
      aria-label={label ?? (selected ? "Deselect" : "Select")}
      aria-checked={selected}
      role="checkbox"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(e as unknown as MouseEvent<HTMLButtonElement>);
      }}
      className={[
        "absolute z-10 h-4 w-4 rounded flex items-center justify-center",
        "transition-all duration-150 cursor-pointer border focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "bg-primary border-primary shadow-sm"
          : "bg-white/80 hover:border-primary/60 hover:bg-[var(--appkit-color-surface)]/80 border-[var(--appkit-color-border)]",
        position,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {selected && (
        <svg
          className="w-2.5 h-2.5 text-white"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 5L4 7.5L8.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function BaseListingCardIconOverlay({
  groupIcon,
  sublistingIcon,
  position = "top-2 right-2",
}: BaseListingCardIconOverlayProps) {
  if (!groupIcon && !sublistingIcon) return null;
  const renderOne = (icon: string, key: string) => {
    const isMediaUrl = icon.startsWith("/media/") || icon.startsWith("http");
    if (isMediaUrl) {
      return (
        <div
          key={key}
          className="relative w-5 h-5 overflow-hidden rounded-full border border-white/80 shadow-sm bg-[var(--appkit-color-surface)]"
        >
          <MediaImage src={icon} alt="" size="thumbnail" />
        </div>
      );
    }
    return (
      <Span
        key={key}
        size="sm"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/80 bg-[var(--appkit-color-surface)]/95 shadow-sm leading-none"
      >
        {icon}
      </Span>
    );
  };
  return (
    <div
      className={`absolute z-10 flex items-center gap-1 ${position}`}
      aria-hidden="true"
    >
      {groupIcon && renderOne(groupIcon, "group")}
      {sublistingIcon && renderOne(sublistingIcon, "sublisting")}
    </div>
  );
}

export const BaseListingCard = Object.assign(BaseListingCardRoot, {
  Hero: BaseListingCardHero,
  Info: BaseListingCardInfo,
  Checkbox: BaseListingCardCheckbox,
  IconOverlay: BaseListingCardIconOverlay,
});
