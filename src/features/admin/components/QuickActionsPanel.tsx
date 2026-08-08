import React from "react";
import { Button, Div, Heading, Row, TextLink } from "../../../ui";

export interface QuickActionItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface QuickActionsPanelProps {
  title?: string;
  actions: QuickActionItem[];
  renderAction?: (action: QuickActionItem) => React.ReactNode;
  className?: string;
}

export function QuickActionsPanel({
  title,
  actions,
  renderAction,
  className = "",
}: QuickActionsPanelProps) {
  return (
    <Div className={className}>
      {title && (
        <Heading level={3} className="mb-4">
          {title}
        </Heading>
      )}
      <Div layout="grid" gap="4" className="grid-cols-1 md:grid-cols-3">
        {actions.map((action) => (
          <Div key={action.id}>
            {renderAction ? (
              renderAction(action)
            ) : action.onClick ? (
              <Button
                type="button"
                variant="outline"
                onClick={action.onClick}
                rounded="lg"
                paddingX="sm"
                paddingY="sm"
                textSize="sm"
                className="w-full"
              >
                <Row align="center" justify="start" gap="sm" className="w-full">
                  {action.icon}
                  {action.label}
                </Row>
              </Button>
            ) : (
              <TextLink
                variant="bare"
                href={action.href ?? "#"}
                rounded="lg"
                paddingX="sm"
                paddingY="xs"
                size="sm"
                layout="inline-flex"
                align="center"
                justify="start"
                gap="sm"
                className="w-full border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)]"
              >
                {action.icon}
                {action.label}
              </TextLink>
            )}
          </Div>
        ))}
      </Div>
    </Div>
  );
}
