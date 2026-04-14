"use client";

import React from "react";
import { Heading, Text } from "./Typography";
import { Card } from "./Card";
import { Button } from "./Button";
import { TextLink } from "./TextLink";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionHref,
  className = "",
}: EmptyStateProps) {
  const resolvedAction =
    action ??
    (actionLabel && actionHref ? (
      <TextLink href={actionHref}>{actionLabel}</TextLink>
    ) : actionLabel && onAction ? (
      <Button type="button" variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);

  return (
    <Card
      variant="outlined"
      className={[
        "text-center",
        "flex flex-col items-center justify-center gap-3",
        "min-h-[220px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <div className="text-zinc-400 dark:text-slate-500">{icon}</div>
      ) : null}
      <Heading level={3}>{title}</Heading>
      {description ? (
        <Text variant="secondary" className="max-w-[48ch]">
          {description}
        </Text>
      ) : null}
      {resolvedAction ? <div className="pt-1">{resolvedAction}</div> : null}
    </Card>
  );
}
