import React from "react";
import Link from "next/link";
import { Row, Span } from "../../ui";

export interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  variant?: "horizontal" | "vertical";
  highlighted?: boolean;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

/**
 * NavItem — reusable navigation link with horizontal and vertical variants.
 * Color and typography are controlled via className props from the consumer.
 */
export function NavItem({
  href,
  label,
  icon,
  isActive = false,
  variant = "horizontal",
  highlighted = false,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  iconClassName = "",
  labelClassName = "",
}: NavItemProps) {
  const stateClass = isActive ? activeClassName : inactiveClassName;

  if (variant === "vertical") {
    return (
      <Link
        href={href}
        className={[
          "relative flex flex-col items-center gap-1 py-2 transition-colors",
          stateClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isActive && (
          <Span
            className="absolute inset-0 rounded-t-xl bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"
            aria-hidden
          />
        )}
        <Row className={["relative", iconClassName].join(" ")}>{icon}</Row>
        <Span className={["relative", labelClassName].join(" ")}>{label}</Span>
      </Link>
    );
  }

  if (highlighted) {
    return (
      <Link
        href={href}
        className={[
          "flex items-center gap-2 px-3 py-1 rounded-full border border-primary-700/30 dark:border-primary/30 bg-primary-700/5 dark:bg-primary/5 text-primary-700 dark:text-primary text-sm font-medium transition-all hover:bg-primary-700/10 dark:hover:bg-primary/10",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Row className="flex-shrink-0">{icon}</Row>
        <Span className="whitespace-nowrap">{label}</Span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-200",
        stateClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Row className={["flex-shrink-0", iconClassName].join(" ")}>{icon}</Row>
      <Span className={["whitespace-nowrap", labelClassName].join(" ")}>
        {label}
      </Span>
    </Link>
  );
}
