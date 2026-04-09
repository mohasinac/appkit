import React from "react";
import { Heading } from "./Typography";
import { Button } from "./Button";

/**
 * Alert — flexible alert/notification with variant icons and optional dismiss.
 *
 * Extracted from src/components/feedback/Alert.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.colors.alert and THEME_CONSTANTS.colors.button.
 */

// Inlined from THEME_CONSTANTS.colors.alert
const ALERT_STYLES = {
  info: {
    container:
      "bg-sky-50 border-sky-200/80 dark:bg-sky-950/30 dark:border-sky-800/50",
    icon: "text-sky-600 dark:text-sky-400",
    title: "text-sky-900 dark:text-sky-200",
    text: "text-sky-800 dark:text-sky-300",
  },
  success: {
    container:
      "bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-900 dark:text-emerald-200",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  warning: {
    container:
      "bg-amber-50 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-800/50",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-200",
    text: "text-amber-800 dark:text-amber-300",
  },
  error: {
    container:
      "bg-red-50 border-red-200/80 dark:bg-red-950/30 dark:border-red-800/50",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-200",
    text: "text-red-800 dark:text-red-300",
  },
} as const;

const ALERT_CLOSE_HOVER = "hover:bg-black/5 dark:hover:bg-white/5";

const ICONS = {
  info: (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
} as const;

export interface AlertProps {
  children: React.ReactNode;
  variant?: keyof typeof ALERT_STYLES;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  children,
  variant = "info",
  title,
  onClose,
  className = "",
}: AlertProps) {
  const styles = ALERT_STYLES[variant];

  return (
    <div
      className={`relative p-4 rounded-xl border ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>{ICONS[variant]}</div>

        <div className="flex-1 min-w-0">
          {title && (
            <Heading
              level={3}
              className={`text-sm font-semibold mb-1 ${styles.title}`}
            >
              {title}
            </Heading>
          )}
          <div className={`text-sm ${styles.text}`}>{children}</div>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`flex-shrink-0 ml-3 rounded-lg p-1.5 min-h-0 ${styles.icon} ${ALERT_CLOSE_HOVER}`}
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
