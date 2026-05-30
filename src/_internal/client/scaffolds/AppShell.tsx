"use client";

/**
 * AppShell — the topmost layout chrome for any consumer surface.
 *
 * Slot-driven by design. Every region accepts a `renderXxx` prop or a
 * `slotXxx` ReactNode so consumers can swap individual pieces without
 * forking the shell.
 *
 * Example:
 *   <AppShell
 *     slotHeader={<MyHeader />}
 *     slotFooter={<MyFooter />}
 *     renderSidebar={(ctx) => <MyNav active={ctx.path} />}
 *   >
 *     {children}
 *   </AppShell>
 */

import * as React from "react";
import { Div } from "../../../ui";

export interface AppShellRenderContext {
  /** Current path (consumer-supplied; this scaffold is path-agnostic). */
  path?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  /** Static header content. Use `renderHeader` if you need access to context. */
  slotHeader?: React.ReactNode;
  /** Static footer content. */
  slotFooter?: React.ReactNode;
  /** Static sidebar content. */
  slotSidebar?: React.ReactNode;
  /** Function header — wins over slotHeader if both are provided. */
  renderHeader?: (ctx: AppShellRenderContext) => React.ReactNode;
  renderFooter?: (ctx: AppShellRenderContext) => React.ReactNode;
  renderSidebar?: (ctx: AppShellRenderContext) => React.ReactNode;
  /** Path passed through to render functions. */
  path?: string;
  /** Extra className applied to the root <div>. */
  className?: string;
}

export function AppShell({
  children,
  slotHeader,
  slotFooter,
  slotSidebar,
  renderHeader,
  renderFooter,
  renderSidebar,
  path,
  className,
}: AppShellProps) {
  const ctx: AppShellRenderContext = { path };
  const header = renderHeader ? renderHeader(ctx) : slotHeader;
  const footer = renderFooter ? renderFooter(ctx) : slotFooter;
  const sidebar = renderSidebar ? renderSidebar(ctx) : slotSidebar;

  return (
    <Div className={`appkit-app-shell flex min-h-screen flex-col ${className ?? ""}`}>
      {header ? (
        <header className="sticky top-0 z-30 w-full" data-appshell-slot="header">
          {header}
        </header>
      ) : null}
      <Div className="flex flex-1">
        {sidebar ? (
          <aside className="hidden lg:block lg:w-64 lg:shrink-0" data-appshell-slot="sidebar">
            {sidebar}
          </aside>
        ) : null}
        <main className="min-w-0 flex-1" data-appshell-slot="main">
          {children}
        </main>
      </Div>
      {footer ? (
        <footer className="w-full" data-appshell-slot="footer">
          {footer}
        </footer>
      ) : null}
    </Div>
  );
}
