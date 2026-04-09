import React from "react";
import { cn, ERROR_BASE } from "./utils";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  suffix?: React.ReactNode;
  error?: string;
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  suffix,
  error,
  indeterminate,
  className = "",
  checked,
  ...props
}: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="w-full">
      <label className="flex flex-row items-center gap-3 cursor-pointer group">
        <div className="relative flex items-center justify-center flex-shrink-0">
          <input
            ref={inputRef}
            type="checkbox"
            checked={checked}
            className={cn(
              "peer w-5 h-5 rounded-md border-2 cursor-pointer",
              "transition-all duration-200 appearance-none",
              error
                ? "border-red-400 dark:border-red-500"
                : "border-zinc-300 dark:border-slate-600",
              "checked:bg-primary-600 checked:border-primary-600",
              "dark:checked:bg-secondary-500 dark:checked:border-secondary-500",
              "hover:border-primary-400 dark:hover:border-secondary-400",
              "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-1",
              "dark:focus:ring-secondary-400/30 dark:focus:ring-offset-slate-900",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
            )}
            {...props}
          />
          {/* Tick icon */}
          <svg
            className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            {indeterminate ? (
              <line
                x1="2"
                y1="6"
                x2="10"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        {(label || suffix) && (
          <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
            {label}
            {suffix}
          </span>
        )}
      </label>

      {error && (
        <p className={cn(ERROR_BASE, "mt-1.5")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
