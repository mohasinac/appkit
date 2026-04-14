"use client";

import type { ReactNode, MouseEvent } from "react";
import { Button } from "./Button";
import { Span } from "./Typography";

// Viewport-relative card dimensions — clamp between floor/ceiling
const DIMS = {
  minW: "min-w-[clamp(150px,18vw,260px)]",
  minH: "min-h-[clamp(220px,26vh,360px)]",
  heroMinH: "min-h-[clamp(120px,14vh,200px)]",
  heroMaxH: "max-h-[clamp(160px,24vh,280px)]",
} as const;

export interface BaseListingCardRootProps {
  className?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  variant?: "grid" | "list";
  onClick?: () => void;
  children?: ReactNode;
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
  children,
}: BaseListingCardRootProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col h-full rounded-xl border overflow-hidden transition-shadow ${DIMS.minW} ${DIMS.minH}
        ${isSelected ? "ring-2 ring-primary border-primary" : "border-gray-200 dark:border-gray-700"}
        ${isDisabled ? "opacity-60" : ""}
        ${onClick ? "cursor-pointer hover:shadow-md" : ""}
        ${className}`}
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
      : aspect
        ? `aspect-[${aspect}]`
        : "aspect-[4/3]";
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${aspectClass} ${DIMS.heroMinH} ${DIMS.heroMaxH} ${className}`}
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
    <div className={`p-3 flex flex-col flex-1 ${className}`}>{children}</div>
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
      onClick={onSelect}
      className={`absolute ${position} z-10 h-5 w-5 rounded border-2 flex items-center justify-center
        ${selected ? "bg-primary border-primary" : "bg-white/90 border-gray-300"}
        ${className}`}
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
