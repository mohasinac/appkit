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

const UI_EMPTY = {
  base: "appkit-empty-state",
  icon: "appkit-empty-state__icon",
  description: "appkit-empty-state__description",
  action: "appkit-empty-state__action",
} as const;

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
      className={[UI_EMPTY.base, className].filter(Boolean).join(" ")}
    >
      {icon ? <div className={UI_EMPTY.icon}>{icon}</div> : null}
      <Heading level={3}>{title}</Heading>
      {description ? (
        <Text variant="secondary" className={UI_EMPTY.description}>
          {description}
        </Text>
      ) : null}
      {resolvedAction ? (
        <div className={UI_EMPTY.action}>{resolvedAction}</div>
      ) : null}
    </Card>
  );
}
