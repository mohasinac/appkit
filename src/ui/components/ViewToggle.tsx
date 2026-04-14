"use client";

import { Button } from "./Button";
import { Div } from "./Div";

/** Three layout modes for listing pages. Stored in URL as ?view=card|fluid|list */
export type ViewMode = "card" | "fluid" | "list";

export interface ViewToggleLabels {
  card: string;
  fluid: string;
  list: string;
  toolbar?: string;
}

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  labels?: ViewToggleLabels;
  className?: string;
}

const DEFAULT_LABELS: ViewToggleLabels = {
  card: "Card grid",
  fluid: "Fluid grid",
  list: "List view",
  toolbar: "View mode",
};

export function ViewToggle({
  value,
  onChange,
  labels,
  className,
}: ViewToggleProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  return (
    <Div
      className={["appkit-view-toggle", className ?? ""].join(" ").trim()}
      role="toolbar"
      aria-label={mergedLabels.toolbar}
    >
      {/* Card grid — fixed breakpoint columns */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("card")}
        aria-label={mergedLabels.card}
        aria-pressed={value === "card"}
        className={[
          "appkit-view-toggle__button",
          value === "card"
            ? "appkit-view-toggle__button--active"
            : "appkit-view-toggle__button--inactive",
        ].join(" ")}
      >
        <svg
          className="appkit-view-toggle__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      </Button>

      {/* Fluid grid — CSS auto-fill columns */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("fluid")}
        aria-label={mergedLabels.fluid}
        aria-pressed={value === "fluid"}
        className={[
          "appkit-view-toggle__button",
          value === "fluid"
            ? "appkit-view-toggle__button--active"
            : "appkit-view-toggle__button--inactive",
        ].join(" ")}
      >
        <svg
          className="appkit-view-toggle__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 9.375v1.5m1.5-3.75C19.496 8.25 20 8.754 20 9.375v1.5m0-5.25v5.25m0-5.25C20 5.004 19.496 4.5 18.875 4.5M7.5 15h9"
          />
        </svg>
      </Button>

      {/* List mode — compact rows */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("list")}
        aria-label={mergedLabels.list}
        aria-pressed={value === "list"}
        className={[
          "appkit-view-toggle__button",
          value === "list"
            ? "appkit-view-toggle__button--active"
            : "appkit-view-toggle__button--inactive",
        ].join(" ")}
      >
        <svg
          className="appkit-view-toggle__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </Button>
    </Div>
  );
}
