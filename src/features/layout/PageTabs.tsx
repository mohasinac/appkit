"use client";
/*
 * WHY: W8's C2 folds sibling pages that are one task into one tabbed page, and
 *      four of the six hosts are SERVER components that fetch their panels'
 *      data. Tabs need client state, so something has to sit between.
 *
 * WHAT: The tab strip and the panel switch, URL-synced via `?tab=`.
 *
 * ## 🛑 Why the tab list is DATA and the guard is derived
 *
 * A Server Component cannot hand a function to a Client Component — it is not
 * serialisable, and the failure is a build error at best and a React #441 at
 * worst (Root Cause #76). So this takes the tab ARRAY and derives the
 * "is this a real tab id" test from it, rather than taking an `isValid`
 * predicate the way `useTabParam` does for callers that are already clients.
 *
 * Panels are passed as a record of nodes, which IS serialisable: a Server
 * Component renders both panels and hands over the results.
 *
 * ## Every panel is rendered, always
 *
 * `TabsContent` mounts all of them and shows one. That is deliberate for these
 * six pages: the absorbed panels are small, their data was already fetched
 * server-side by the same request, and mounting on first view would make a tab
 * click cost a spinner for content that is already in the payload.
 *
 * EXPORTS: PageTabs, type PageTabDef
 *
 * @tag domain:layout
 * @tag layer:component
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:store payouts/shipping/fulfillment/storefront,admin roles/settings
 * @tag sideEffects:router
 */

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui";
import { useTabParam } from "../../react/hooks/useTabParam";

export interface PageTabDef {
  id: string;
  label: string;
}

export interface PageTabsProps {
  /** The tabs, in order. The first is the default when `?tab=` is absent or unknown. */
  tabs: readonly PageTabDef[];
  /** One node per tab id. A missing entry renders an empty panel, not a crash. */
  panels: Record<string, React.ReactNode>;
  /**
   * Override the default tab. Omit to use the first — which is right whenever
   * the host page's own content is the first tab, as it is on all six.
   */
  defaultTabId?: string;
}

export function PageTabs({ tabs, panels, defaultTabId }: PageTabsProps) {
  const ids = React.useMemo(() => tabs.map((t) => t.id), [tabs]);
  const isValid = React.useCallback(
    (value: string | null | undefined): value is string => !!value && ids.includes(value),
    [ids],
  );
  const [activeTab, setActiveTab] = useTabParam(isValid, defaultTabId ?? tabs[0]?.id ?? "");

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {panels[tab.id] ?? null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
