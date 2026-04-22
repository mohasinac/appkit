"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface DashboardNavState {
  /** Whether a dashboard section has registered its nav handler. */
  hasNav: boolean;
  /** Open the registered dashboard navigation drawer. */
  openNav: () => void;
  /** Close the registered dashboard navigation drawer. */
  closeNav: () => void;
  /** Toggle the registered dashboard navigation drawer. */
  toggleNav: () => void;
  /** Register dashboard navigation handlers. */
  registerNav: (handlers: (() => void) | {
    open: () => void;
    close?: () => void;
    toggle?: () => void;
  }) => void;
  /** Unregister the dashboard nav (on unmount). */
  unregisterNav: () => void;
}

const DashboardNavContext = createContext<DashboardNavState | null>(null);

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const openerRef = useRef<(() => void) | null>(null);
  const closerRef = useRef<(() => void) | null>(null);
  const togglerRef = useRef<(() => void) | null>(null);
  const [hasNav, setHasNav] = useState(false);

  const registerNav = useCallback((handlers: (() => void) | {
    open: () => void;
    close?: () => void;
    toggle?: () => void;
  }) => {
    if (typeof handlers === "function") {
      openerRef.current = handlers;
      closerRef.current = null;
      togglerRef.current = null;
      setHasNav(true);
      return;
    }

    openerRef.current = handlers.open;
    closerRef.current = handlers.close ?? null;
    togglerRef.current = handlers.toggle ?? null;
    setHasNav(true);
  }, []);

  const unregisterNav = useCallback(() => {
    openerRef.current = null;
    closerRef.current = null;
    togglerRef.current = null;
    setHasNav(false);
  }, []);

  const openNav = useCallback(() => {
    openerRef.current?.();
  }, []);

  const closeNav = useCallback(() => {
    closerRef.current?.();
  }, []);

  const toggleNav = useCallback(() => {
    if (togglerRef.current) {
      togglerRef.current();
      return;
    }
    openerRef.current?.();
  }, []);

  return (
    <DashboardNavContext.Provider
      value={{
        hasNav,
        openNav,
        closeNav,
        toggleNav,
        registerNav,
        unregisterNav,
      }}
    >
      {children}
    </DashboardNavContext.Provider>
  );
}

/**
 * useDashboardNav — read the dashboard navigation context.
 * Returns a no-op state when rendered outside a DashboardNavProvider.
 */
export function useDashboardNav(): DashboardNavState {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) {
    return {
      hasNav: false,
      openNav: () => {},
      closeNav: () => {},
      toggleNav: () => {},
      registerNav: () => {},
      unregisterNav: () => {},
    };
  }
  return ctx;
}
