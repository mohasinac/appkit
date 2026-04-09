import React from "react";
import Link from "next/link";
import { Li, Nav, Ol } from "@mohasinac/ui";

export interface BreadcrumbsProps {
  children: React.ReactNode;
  separator?: React.ReactNode;
  className?: string;
}

export interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  /** Marks this item as the current page — renders as plain text, not link. */
  current?: boolean;
  className?: string;
}

/**
 * Breadcrumbs — navigation hierarchy showing the user's location.
 * Automatically adds separators between items.
 *
 * @example
 * <Breadcrumbs>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbItem href="/products">Products</BreadcrumbItem>
 *   <BreadcrumbItem current>Detail</BreadcrumbItem>
 * </Breadcrumbs>
 */
export function Breadcrumbs({
  children,
  separator = "/",
  className = "",
}: BreadcrumbsProps) {
  const items = React.Children.toArray(children);

  return (
    <Nav aria-label="Breadcrumb" className={className}>
      <Ol className="flex items-center gap-2 text-sm flex-wrap">
        {items.map((item, index) => (
          <Li key={index} className="flex items-center gap-2">
            {item}
            {index < items.length - 1 && (
              <span
                className="text-zinc-400 dark:text-zinc-500 select-none"
                aria-hidden="true"
              >
                {separator}
              </span>
            )}
          </Li>
        ))}
      </Ol>
    </Nav>
  );
}

export function BreadcrumbItem({
  href,
  children,
  current = false,
  className = "",
}: BreadcrumbItemProps) {
  if (current || !href) {
    return (
      <span
        aria-current={current ? "page" : undefined}
        className={`text-zinc-500 dark:text-zinc-400 ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}
