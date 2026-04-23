// appkit/src/ui/components/DescriptionField.tsx

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
        "appkit-description-field",
        isLong
          ? "appkit-description-field--full"
          : "appkit-description-field--auto",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
     data-section="descriptionfield-div-476">
      <dt className="appkit-description-field__label">{label}</dt>
      <dd className="appkit-description-field__value">{value}</dd>
    </div>
  );
}
