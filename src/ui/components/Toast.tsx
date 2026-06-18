"use client"
import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "./Button";
import { Text } from "./Typography";
import { SPRING_SNAPPY } from "../../tokens/motion";

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";
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
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  /**
   * Show a toast. Returns the `dismissId` so long-running ops can later finalize
   * via `updateToast(id, "success" | "error", finalMessage)`. For the "loading"
   * variant pass `duration: 0` to keep it pinned until finalized.
   */
  showToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
    action?: { label: string; onClick: () => void },
  ) => string;
  hideToast: (id: string) => void;
  /** Replace an existing toast's variant + message (used to finalize loading toasts). */
  updateToast: (
    id: string,
    variant: ToastVariant,
    message?: string,
    duration?: number,
  ) => void;
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

/**
 * Like `useToast` but returns `undefined` when no `ToastProvider` is mounted
 * instead of throwing. Use in primitives (e.g. `Button`) that must be safe to
 * render outside a toast context.
 */
export function useToastSafe(): ToastContextValue | undefined {
  return React.useContext(ToastContext);
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
    loading: "appkit-toast--info",
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
    (message: string, variant: ToastVariant = "info", duration?: number, action?: { label: string; onClick: () => void }): string => {
      const id = buildToastId();
      // Loading toasts default to pinned (duration: 0) so the caller can finalize.
      const effectiveDuration = duration ?? (variant === "loading" ? 0 : 5000);
      setToasts((current) => [...current, { id, message, variant, duration: effectiveDuration, action }]);
      if (effectiveDuration > 0) {
        window.setTimeout(() => hideToast(id), effectiveDuration);
      }
      return id;
    },
    [hideToast],
  );

  const updateToast = React.useCallback(
    (id: string, variant: ToastVariant, message?: string, duration?: number) => {
      const effectiveDuration = duration ?? (variant === "loading" ? 0 : 5000);
      setToasts((current) =>
        current.map((t) =>
          t.id === id
            ? { ...t, variant, message: message ?? t.message, duration: effectiveDuration }
            : t,
        ),
      );
      if (effectiveDuration > 0) {
        window.setTimeout(() => hideToast(id), effectiveDuration);
      }
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast, updateToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="toast-container"
        className={[UI_TOAST.container, UI_TOAST.positions[position]]
          .filter(Boolean)
          .join(" ")}
       data-section="toast-div-623">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastRow key={toast.id} toast={toast} onClose={hideToast} />
          ))}
        </AnimatePresence>
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
  const reduced = useReducedMotion();
  const iconMap: Record<ToastVariant, React.ReactNode> = {
    success: <span aria-hidden="true">✓</span>,
    error: <span aria-hidden="true">!</span>,
    warning: <span aria-hidden="true">!</span>,
    info: <span aria-hidden="true">i</span>,
    loading: (
      <span
        aria-hidden="true"
        className="inline-block animate-spin"
        style={{ width: "1em", height: "1em", border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "9999px" }}
      />
    ),
  };

  return (
    <motion.div
      role="alert"
      data-testid="toast"
      className={[UI_TOAST.row, UI_TOAST.variants[toast.variant]].join(" ")}
      layout
      initial={reduced ? false : { opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.95 }}
      transition={SPRING_SNAPPY}
      data-section="toast-div-624"
    >
      <div className={UI_TOAST.icon} data-section="toast-div-625">{iconMap[toast.variant]}</div>
      <Text as="div" size="sm" weight="medium" className="flex-1 pr-1">
        {toast.message}
      </Text>
      {toast.action && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { toast.action!.onClick(); onClose(toast.id); }}
          className="min-h-0 shrink-0 px-2 py-1 font-semibold underline"
        >
          {toast.action.label}
        </Button>
      )}
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
    </motion.div>
  );
}
