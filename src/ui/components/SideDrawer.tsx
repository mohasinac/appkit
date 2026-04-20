import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { Row } from "./Layout";
import { Heading, Span } from "./Typography";
import { useSwipe } from "../../react";

export type DrawerMode = "create" | "edit" | "delete" | "view";

const UI_SIDE_DRAWER = {
  backdrop: "appkit-side-drawer__backdrop",
  root: "appkit-side-drawer",
  left: "appkit-side-drawer--left",
  right: "appkit-side-drawer--right",
  header: "appkit-side-drawer__header",
  headerMode: {
    view: "appkit-side-drawer__header--view",
    create: "appkit-side-drawer__header--create",
    edit: "appkit-side-drawer__header--edit",
    delete: "appkit-side-drawer__header--delete",
  },
  closeBtn: "appkit-side-drawer__close-btn",
  closeIcon: "appkit-side-drawer__close-icon",
  deleteBadge: "appkit-side-drawer__delete-badge",
  content: "appkit-side-drawer__content",
  footer: "appkit-side-drawer__footer",
  warnBackdrop: "appkit-side-drawer__warn-backdrop",
  warnDialog: "appkit-side-drawer__warn-dialog",
  warnHeader: "appkit-side-drawer__warn-header",
  warnIcon: "appkit-side-drawer__warn-icon",
  warnText: "appkit-side-drawer__warn-text",
  warnActions: "appkit-side-drawer__warn-actions",
} as const;

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Drawer mode controls header styling and unsaved-changes behaviour */
  mode?: DrawerMode;
  /** Whether the form has unsaved changes — triggers a warning on close */
  isDirty?: boolean;
  /** Which side the drawer opens from. Defaults to "right". */
  side?: "left" | "right";
}

/** Selector for all keyboard-focusable elements */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): Element[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * SideDrawer — accessible slide-in panel with focus trap, swipe-to-close,
 * and an optional unsaved-changes confirmation overlay.
 *
 * @example
 * ```tsx
 * <SideDrawer isOpen={open} onClose={() => setOpen(false)} title="Edit product" mode="edit" isDirty={isDirty}>
 *   <MyForm />
 * </SideDrawer>
 * ```
 */
export function SideDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  mode = "view",
  isDirty = false,
  side = "right",
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const tActions = useTranslations("actions");
  const tConfirm = useTranslations("confirm");
  const triggerRef = useRef<Element | null>(null);

  const attemptClose = useCallback(() => {
    if (isDirty && (mode === "create" || mode === "edit")) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [isDirty, mode, onClose]);

  const confirmClose = useCallback(() => {
    setShowUnsavedWarning(false);
    onClose();
  }, [onClose]);

  const cancelClose = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        attemptClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = getFocusableElements(drawerRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, attemptClose]);

  // Save / restore focus (WCAG 2.4.3)
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(drawerRef.current);
        if (focusable.length > 0) (focusable[0] as HTMLElement).focus();
      });
    } else {
      if (triggerRef.current && "focus" in triggerRef.current) {
        (triggerRef.current as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  useSwipe(drawerRef, {
    ...(side === "left"
      ? { onSwipeLeft: () => attemptClose() }
      : { onSwipeRight: () => attemptClose() }),
    minSwipeDistance: 60,
  });

  if (!isOpen) return null;

  const positionClass =
    side === "left" ? UI_SIDE_DRAWER.left : UI_SIDE_DRAWER.right;

  return (
    <>
      {/* Backdrop */}
      <div
        className={UI_SIDE_DRAWER.backdrop}
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={[UI_SIDE_DRAWER.root, positionClass].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <Row
          justify="between"
          gap="none"
          className={[
            UI_SIDE_DRAWER.header,
            UI_SIDE_DRAWER.headerMode[mode],
          ].join(" ")}
        >
          <Row gap="3" className="min-w-0">
            <Button
              variant="ghost"
              onClick={attemptClose}
              className={UI_SIDE_DRAWER.closeBtn}
              aria-label={tActions("close")}
            >
              <svg
                className={UI_SIDE_DRAWER.closeIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
            <Heading level={3} id="drawer-title" className="truncate">
              {title}
            </Heading>
          </Row>
          {mode === "delete" && (
            <Span className={UI_SIDE_DRAWER.deleteBadge}>
              {tActions("delete")}
            </Span>
          )}
        </Row>

        {/* Content */}
        <div className={UI_SIDE_DRAWER.content}>{children}</div>

        {/* Footer */}
        {footer && <div className={UI_SIDE_DRAWER.footer}>{footer}</div>}
      </div>

      {/* Unsaved changes warning overlay */}
      {showUnsavedWarning && (
        <>
          <div className={UI_SIDE_DRAWER.warnBackdrop} onClick={cancelClose} />
          <div className={UI_SIDE_DRAWER.warnDialog}>
            <div className={UI_SIDE_DRAWER.warnHeader}>
              <div className={UI_SIDE_DRAWER.warnIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <Heading level={4} className="mb-1">
                  {tConfirm("unsavedChangesTitle")}
                </Heading>
                <p className={UI_SIDE_DRAWER.warnText}>
                  {tConfirm("unsavedChangesDescription")}
                </p>
              </div>
            </div>
            <div className={UI_SIDE_DRAWER.warnActions}>
              <Button variant="outline" onClick={cancelClose} size="sm">
                {tActions("keepEditing")}
              </Button>
              <Button variant="danger" onClick={confirmClose} size="sm">
                {tActions("discardChanges")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
