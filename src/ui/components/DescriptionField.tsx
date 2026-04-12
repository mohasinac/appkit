// appkit/src/ui/components/DescriptionField.tsx
import { THEME_CONSTANTS } from "../../tokens";

export interface DescriptionFieldProps {
  label: string;
  value: string;
  /** Force full-width regardless of value length (default: auto-detect by length) */
  fullWidth?: boolean;
  className?: string;
}

/**
 * `DescriptionField` — renders a label + value pair using the appropriate
 * text style. Short values render inline-ish (`flex-1 min-w-[280px]`);
 * long values (> 80 chars) take full width with `prose` wrapping.
 *
 * Designed for use inside `FormGrid` or `<Row as="dl">` definition lists.
 *
 * @example
 * ```tsx
 * <Row as="dl" wrap gap="md">
 *   <DescriptionField label="Store name" value="My Amazing Store" />
 *   <DescriptionField label="Description" value={longDescription} />
 * </Row>
 * ```
 */
export function DescriptionField({
  label,
  value,
  fullWidth,
  className,
}: DescriptionFieldProps) {
  const isLong = fullWidth ?? value.length > 80;

  return (
    <div
      className={[
        "flex flex-col gap-1",
        isLong ? "w-full" : "flex-1 min-w-[280px]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <dt className={THEME_CONSTANTS.text.label}>{label}</dt>
      <dd
        className={
          isLong ? THEME_CONSTANTS.text.body : THEME_CONSTANTS.text.body
        }
      >
        {value}
      </dd>
    </div>
  );
}
