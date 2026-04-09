import { Caption, Text } from "./Typography";
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
    <div className={classNames("flex items-start gap-4", className)}>
      {thumbnail && <div className="flex-shrink-0">{thumbnail}</div>}

      <div className="min-w-0 flex-1">
        <Text size="sm" weight="medium" className="line-clamp-2">
          {title}
        </Text>
        {subtitle && <Caption className="mt-0.5">{subtitle}</Caption>}
        {actions && <div className="mt-2">{actions}</div>}
      </div>

      {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
    </div>
  );
}
