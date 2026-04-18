"use client";

import type { ReactNode, MouseEvent } from "react";
import { Button } from "./Button";
import { Span } from "./Typography";

const UI_LISTING_CARD = {
  root: "appkit-listing-card",
  selected: "appkit-listing-card--selected",
  disabled: "appkit-listing-card--disabled",
  clickable: "appkit-listing-card--clickable",
  hero: "appkit-listing-card__hero",
  heroSquare: "appkit-listing-card__hero--square",
  heroLandscape: "appkit-listing-card__hero--landscape",
  info: "appkit-listing-card__info",
  checkbox: "appkit-listing-card__checkbox",
  checkboxSelected: "appkit-listing-card__checkbox--selected",
  checkboxIcon: "appkit-listing-card__checkbox-icon",
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
      className={[
        UI_LISTING_CARD.root,
        isSelected ? UI_LISTING_CARD.selected : "",
        isDisabled ? UI_LISTING_CARD.disabled : "",
        onClick ? UI_LISTING_CARD.clickable : "",
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
      ? UI_LISTING_CARD.heroSquare
      : aspect === "4/3" || !aspect
        ? UI_LISTING_CARD.heroLandscape
        : `aspect-[${aspect}]`;
  return (
    <div
      className={[UI_LISTING_CARD.hero, aspectClass, className]
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
      className={[UI_LISTING_CARD.info, className].filter(Boolean).join(" ")}
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
      onClick={onSelect}
      className={[
        UI_LISTING_CARD.checkbox,
        selected ? UI_LISTING_CARD.checkboxSelected : "",
        position,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {selected && <Span className={UI_LISTING_CARD.checkboxIcon}>✓</Span>}
    </Button>
  );
}

export const BaseListingCard = Object.assign(BaseListingCardRoot, {
  Hero: BaseListingCardHero,
  Info: BaseListingCardInfo,
  Checkbox: BaseListingCardCheckbox,
});
