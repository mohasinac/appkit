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
    <Div className={classNames("appkit-item-row", className)}>
      {thumbnail && (
        <Div className="appkit-item-row__thumbnail">{thumbnail}</Div>
      )}

      <Div className="appkit-item-row__content">
        <Text size="sm" weight="medium" className="appkit-item-row__title">
          {title}
        </Text>
        {subtitle && (
          <Caption className="appkit-item-row__subtitle">{subtitle}</Caption>
        )}
        {actions && <Div className="appkit-item-row__actions">{actions}</Div>}
      </Div>

      {rightSlot && <Div className="appkit-item-row__right">{rightSlot}</Div>}
    </Div>
  );
}
