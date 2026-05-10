import type { ReactNode, MouseEvent } from "react";
import { Button } from "./Button";
import { Span } from "./Typography";

export interface BaseListingCardRootProps {
  className?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  variant?: "grid" | "list";
  onClick?: () => void;
  children?: ReactNode;
  /** Long-press / gesture event handlers forwarded to the root element */
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

export interface BaseListingCardHeroProps {
  aspect?: string;
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
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
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
      className={[
        "group relative flex flex-col w-full min-w-0 overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 transition-shadow",
        isSelected
          ? "border-primary outline outline-2 outline-primary shadow-sm"
          : "border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md",
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
  className = "",
  children,
  onMouseEnter,
  onMouseLeave,
}: BaseListingCardHeroProps) {
  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "4/3" || !aspect
        ? "aspect-[4/3]"
        : `aspect-[${aspect}]`;
  return (
    <div
      className={[
        "relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0",
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
  className = "",
  children,
}: BaseListingCardInfoProps) {
  return (
    <div
      className={[
        "p-3 flex flex-col flex-1 gap-1.5",
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
    <Button
      type="button"
      aria-label={label ?? (selected ? "Deselect" : "Select")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(e);
      }}
      className={[
        "absolute z-10 h-5 w-5 rounded border-2 flex items-center justify-center bg-white/90",
        selected ? "bg-primary border-primary" : "border-zinc-300",
        position,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {selected && <Span className="text-white text-xs leading-none">✓</Span>}
    </Button>
  );
}

export const BaseListingCard = Object.assign(BaseListingCardRoot, {
  Hero: BaseListingCardHero,
  Info: BaseListingCardInfo,
  Checkbox: BaseListingCardCheckbox,
});
