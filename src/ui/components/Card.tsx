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

const VARIANT_CLASSES: Record<CardVariant, string> = {
  flat: "bg-white dark:bg-slate-900",
  default: "bg-white dark:bg-slate-900",
  primary: "bg-primary text-primary-foreground",
  outlined:
    "bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700",
  bordered:
    "bg-white dark:bg-slate-900 border-2 border-zinc-200 dark:border-slate-700",
  elevated:
    "bg-white dark:bg-slate-900 shadow-md shadow-zinc-200/50 dark:shadow-black/20",
  interactive:
    "bg-white dark:bg-slate-900 border border-zinc-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700",
  glass:
    "border border-white/40 bg-white/75 shadow-sm backdrop-blur dark:border-slate-700/40 dark:bg-slate-900/75",
  "gradient-indigo":
    "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white",
  "gradient-teal": "bg-gradient-to-br from-teal-500 to-cyan-600 text-white",
  "gradient-amber": "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
  "gradient-rose": "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
  "stat-indigo":
    "bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800/60",
  "stat-teal":
    "bg-teal-50 text-teal-900 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-100 dark:border-teal-800/60",
  "stat-amber":
    "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800/60",
  "stat-rose":
    "bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800/60",
  "stat-emerald":
    "bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/60",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-7",
};

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
        "rounded-xl transition-all",
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        hover ? "hover:-translate-y-0.5 hover:shadow-lg" : "",
        onClick ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onClick={onClick}
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
      className={[
        "pb-4 border-b border-zinc-200 dark:border-slate-700",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardSectionProps) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardSectionProps) {
  return (
    <div
      className={[
        "pt-4 border-t border-zinc-200 dark:border-slate-700",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Card;
