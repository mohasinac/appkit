"use client"
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

const UI_TOAST = {
  container: "appkit-toast-container",
  positions: {
    "top-right": "appkit-toast-container--top-right",
    "top-left": "appkit-toast-container--top-left",
    "bottom-right": "appkit-toast-container--bottom-right",
    "bottom-left": "appkit-toast-container--bottom-left",
    "top-center": "appkit-toast-container--top-center",
    "bottom-center": "appkit-toast-container--bottom-center",
  },
  row: "appkit-toast",
  variants: {
    success: "appkit-toast--success",
    error: "appkit-toast--error",
    warning: "appkit-toast--warning",
    info: "appkit-toast--info",
  },
  icon: "appkit-toast__icon",
} as const;

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
        className={[UI_TOAST.container, UI_TOAST.positions[position]]
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
  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <span aria-hidden="true">✓</span>,
    error: <span aria-hidden="true">!</span>,
    warning: <span aria-hidden="true">!</span>,
    info: <span aria-hidden="true">i</span>,
  };

  return (
    <div
      role="alert"
      className={[UI_TOAST.row, UI_TOAST.variants[toast.variant]].join(" ")}
    >
      <div className={UI_TOAST.icon}>{iconMap[toast.variant]}</div>
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
