"use client";

import React from "react";
import { Button } from "./Button";
import { Text } from "./Typography";

export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  showToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
  ) => void;
  hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

function buildToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right": "md:top-4 md:right-4",
  "top-left": "md:top-4 md:left-4",
  "bottom-right": "md:bottom-4 md:right-4",
  "bottom-left": "md:bottom-4 md:left-4",
  "top-center": "md:top-4 md:left-1/2 md:-translate-x-1/2",
  "bottom-center": "md:bottom-4 md:left-1/2 md:-translate-x-1/2",
};

export function ToastProvider({
  children,
  position = "top-right",
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const hideToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = React.useCallback(
    (message: string, variant: ToastVariant = "info", duration = 5000) => {
      const id = buildToastId();
      setToasts((current) => [...current, { id, message, variant, duration }]);
      if (duration > 0) {
        window.setTimeout(() => hideToast(id), duration);
      }
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={[
          "pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col gap-2 px-3 pt-3 md:inset-x-auto md:px-0 md:pt-0",
          position.startsWith("bottom") ? "md:top-auto" : "",
          POSITION_CLASSES[position],
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onClose={hideToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: (id: string) => void;
}) {
  const variantClasses: Record<ToastVariant, string> = {
    success:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/70 dark:text-green-100",
    error:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/70 dark:text-red-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/70 dark:text-amber-100",
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/70 dark:text-sky-100",
  };

  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <span aria-hidden="true">✓</span>,
    error: <span aria-hidden="true">!</span>,
    warning: <span aria-hidden="true">!</span>,
    info: <span aria-hidden="true">i</span>,
  };

  return (
    <div
      role="alert"
      className={[
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-lg md:min-w-[320px] md:max-w-md",
        variantClasses[toast.variant],
      ].join(" ")}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-semibold dark:bg-white/10">
        {iconMap[toast.variant]}
      </div>
      <Text as="div" size="sm" weight="medium" className="flex-1 pr-1">
        {toast.message}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onClose(toast.id)}
        className="min-h-0 shrink-0 px-2 py-1"
        aria-label="Close notification"
      >
        ×
      </Button>
    </div>
  );
}
