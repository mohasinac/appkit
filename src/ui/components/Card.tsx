"use client"
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";
import { SPRING_SNAPPY } from "../../tokens/motion";

type CardAnimate = "hoverLift" | "pressScale" | "hoverScale" | "both";

type CardVariant =
  | "flat"
  | "outlined"
  | "elevated"
  | "default"
  | "primary"
  | "bordered"
  | "interactive"
  | "glass"
  | "gradient-indigo"
  | "gradient-teal"
  | "gradient-amber"
  | "gradient-rose"
  | "stat-indigo"
  | "stat-teal"
  | "stat-amber"
  | "stat-rose"
  | "stat-emerald"
  | "chat-bubble"
  | "chat-bubble-mine"
  | "chat-bubble-theirs";
type CardPadding = "none" | "sm" | "md" | "lg";

const UI_CARD = {
  base: "appkit-card",
  variants: {
    flat: "appkit-card--flat",
    default: "appkit-card--default",
    primary: "appkit-card--primary",
    outlined: "appkit-card--outlined",
    bordered: "appkit-card--bordered",
    elevated: "appkit-card--elevated",
    interactive: "appkit-card--interactive",
    glass: "appkit-card--glass",
    "gradient-indigo": "appkit-card--gradient-indigo",
    "gradient-teal": "appkit-card--gradient-teal",
    "gradient-amber": "appkit-card--gradient-amber",
    "gradient-rose": "appkit-card--gradient-rose",
    "stat-indigo": "appkit-card--stat-indigo",
    "stat-teal": "appkit-card--stat-teal",
    "stat-amber": "appkit-card--stat-amber",
    "stat-rose": "appkit-card--stat-rose",
    "stat-emerald": "appkit-card--stat-emerald",
    "chat-bubble": "appkit-card--chat-bubble",
    "chat-bubble-mine": "appkit-card--chat-bubble-mine",
    "chat-bubble-theirs": "appkit-card--chat-bubble-theirs",
  },
  padding: {
    none: "",
    sm: "appkit-card--pad-sm",
    md: "appkit-card--pad-md",
    lg: "appkit-card--pad-lg",
  },
} as const;

export interface CardProps extends SurfaceProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  animate?: CardAnimate;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Card({
  children,
  variant = "flat",
  padding = "md",
  hover = false,
  animate,
  surface,
  rounded,
  border,
  shadow,
  className = "",
  style,
  onClick,
}: CardProps) {
  const reduced = useReducedMotion();
  const cls = [
    UI_CARD.base,
    UI_CARD.variants[variant],
    UI_CARD.padding[padding],
    hover ? "appkit-card--hoverable" : "",
    onClick ? "appkit-card--clickable" : "",
    buildSurfaceClasses({ surface, rounded, border, shadow }),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (animate && !reduced) {
    const whileHover =
      animate === "hoverLift" || animate === "both"
        ? { y: -2 }
        : animate === "hoverScale"
          ? { scale: 1.02 }
          : undefined;
    const whileTap =
      animate === "pressScale" || animate === "both"
        ? { scale: 0.97 }
        : undefined;

    return (
      <motion.div
        className={cls}
        // audit-inline-style-ok: pass-through style prop
        style={style}
        onClick={onClick}
        whileHover={whileHover}
        whileTap={whileTap}
        transition={SPRING_SNAPPY}
        data-section="card-div-463"
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cls}
      // audit-inline-style-ok: pass-through style prop
      style={style}
      onClick={onClick}
      data-section="card-div-463"
    >
      {children}
    </div>
  );
}

export interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardSectionProps) {
  return (
    <div
      className={["appkit-card__header", className].filter(Boolean).join(" ")}
     data-section="card-div-464">
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardSectionProps) {
  return <div className={className} data-section="card-div-465">{children}</div>;
}

export function CardFooter({ children, className = "" }: CardSectionProps) {
  return (
    <div
      className={["appkit-card__footer", className].filter(Boolean).join(" ")}
     data-section="card-div-466">
      {children}
    </div>
  );
}

export default Card;
