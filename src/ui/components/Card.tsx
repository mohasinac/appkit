import React from "react";

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
  | "stat-emerald";
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
  },
  padding: {
    none: "",
    sm: "appkit-card--pad-sm",
    md: "appkit-card--pad-md",
    lg: "appkit-card--pad-lg",
  },
} as const;

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Card({
  children,
  variant = "flat",
  padding = "md",
  hover = false,
  className = "",
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        UI_CARD.base,
        UI_CARD.variants[variant],
        UI_CARD.padding[padding],
        hover ? "appkit-card--hoverable" : "",
        onClick ? "appkit-card--clickable" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onClick={onClick}
     data-section="card-div-463">
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
