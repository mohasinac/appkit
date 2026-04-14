export interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = "",
  disabled = false,
}: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(Number(e.target.value))}
      className={[
        "appkit-slider",
        disabled ? "appkit-slider--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
