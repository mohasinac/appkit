import React from "react";
import { Caption, Text } from "./Typography";
import { Div } from "./Div";
import { classNames } from "../style.helper";

export interface ItemRowProps {
  thumbnail?: React.ReactNode;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ItemRow({
  thumbnail,
  title,
  subtitle,
  rightSlot,
  actions,
  className,
}: ItemRowProps) {
  return (
    <Div className={classNames("flex items-start gap-4", className)}>
      {thumbnail && <Div className="flex-shrink-0">{thumbnail}</Div>}

      <Div className="min-w-0 flex-1">
        <Text size="sm" weight="medium" className="line-clamp-2">
          {title}
        </Text>
        {subtitle && <Caption className="mt-0.5">{subtitle}</Caption>}
        {actions && <Div className="mt-2">{actions}</Div>}
      </Div>

      {rightSlot && <Div className="flex-shrink-0">{rightSlot}</Div>}
    </Div>
  );
}
