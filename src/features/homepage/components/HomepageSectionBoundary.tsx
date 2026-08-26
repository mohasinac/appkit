"use client";

/**
 * Crash containment for a single homepage section.
 *
 * The homepage renders ~26 independently-fetched sections. Before this existed,
 * a throw inside ANY one of them propagated to `[locale]/error.tsx` and replaced
 * the entire page with "Something went wrong" — which is exactly what one bad
 * import in `PrizeDrawsSection` did in production on 2026-08-26.
 *
 * A section is not load-bearing for the page. Losing one should cost that strip
 * and nothing else, so the fallback renders NOTHING: a visitor sees a homepage
 * missing one row instead of a homepage that is entirely an error message.
 *
 * The failure is still reported — `ErrorBoundary` calls `trackError`, which the
 * app wires to the client-error beacon, so the row lands in `serverErrors` and
 * shows up at /admin/maintenance/server-errors. Silent to the visitor, loud to
 * the operator; the inverse would be the Root Cause #59 swallow.
 *
 * `sectionId` is a plain string on purpose. This is a Client Component rendered
 * from a Server Component, so a function prop (e.g. `onError`) would not be
 * serialisable across that boundary.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../../../monitoring/error-tracking";

export interface HomepageSectionBoundaryProps {
  /** Homepage section document id — identifies the strip in the error report. */
  sectionId: string;
  /** Section type, e.g. "prize-draws". */
  sectionType: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class HomepageSectionBoundary extends Component<
  HomepageSectionBoundaryProps,
  State
> {
  constructor(props: HomepageSectionBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    trackError(error, ErrorCategory.UI, ErrorSeverity.HIGH, {
      component: "HomepageSection",
      metadata: {
        sectionId: this.props.sectionId,
        sectionType: this.props.sectionType,
        componentStack: errorInfo.componentStack ?? null,
        digest: (error as Error & { digest?: string }).digest ?? null,
      },
    });
  }

  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
