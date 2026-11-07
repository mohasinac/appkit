"use client";

import { useCallback, useState } from "react";
import { WidgetInstanceEditor, applyEditPatch, type WidgetEditPatch } from "./WidgetInstanceEditor";
import type { ResolvedWidget, WidgetInstance } from "../../../ui/widgets/types";
import type { ReactNode } from "react";

/**
 * The client boundary for in-place widget editing.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------------------------------------------------------
 *
 * `WidgetInstanceEditor` needs an `onPatch` callback, and a SERVER component
 * cannot hand a function to a client component — it throws at serialization.
 * `RelatedItemsSection` is a server component (it awaits
 * `getWidgetInstances`). So the write has to be owned on the client side of
 * the boundary, which is this file.
 *
 * `children` is still server-rendered content passed INTO a client component,
 * which is allowed and is the whole point: the rails keep rendering on the
 * server (crawlable `<h2>`s, no hydration cost for a visitor) and only the
 * edit affordance is client-side. A visitor who cannot edit gets
 * `editMode === false`, and `WidgetInstanceEditor` then returns `children`
 * untouched — no wrapper, no layout shift.
 *
 * ---------------------------------------------------------------------------
 * 🛑 PLAIN `fetch` WITH A RELATIVE URL, DELIBERATELY NOT `ApiClient`
 * ---------------------------------------------------------------------------
 *
 * W-TEST found that `ApiClient` uses `process.env.NEXT_PUBLIC_APP_URL` as its
 * `baseURL`, so its documented `window.location.origin` fallback is dead
 * whenever that variable is set. On a portal host (`seller.localhost:3001`)
 * every `ApiClient` call is then cross-origin and CORS-blocked, and the page
 * cannot hydrate. An in-place editor is client-side by nature, so going
 * through `ApiClient` would make this feature fail entirely on exactly the
 * hosts an admin is most likely to be editing from.
 *
 * A relative URL is always same-origin by construction, so it works on the
 * canonical host AND on every portal host without depending on an env var
 * being right. 🚩 The underlying `ApiClient` bug is still real and still
 * unowned — reported, not worked around silently.
 */

export interface EditableWidgetProps {
  /** The resolved node. Plain data — crosses the server/client boundary safely. */
  node: ResolvedWidget;
  /** Every instance in this region, so a patch can be sent as a whole-region PUT. */
  instances: readonly WidgetInstance[];
  /** The region being edited. Also the authorised scope server-side. */
  regionId: string;
  /** Human-readable blast radius, e.g. "every product page". */
  scopeLabel: string;
  children: ReactNode;
}

export function EditableWidget({
  node,
  instances,
  regionId,
  scopeLabel,
  children,
}: EditableWidgetProps) {
  /*
   * Held locally so a second edit in the same session builds on the first
   * without a round trip. Seeded from the server-resolved list.
   */
  const [local, setLocal] = useState<readonly WidgetInstance[]>(instances);

  const onPatch = useCallback(
    async (id: string, patch: WidgetEditPatch) => {
      const next = applyEditPatch(local, id, patch);

      const res = await fetch(`/api/admin/widget-instances/${encodeURIComponent(regionId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: next }),
      });

      if (!res.ok) {
        /*
         * Surfaced to the operator by `WidgetInstanceEditor`'s catch, never
         * swallowed — a 403 from the permission gate has to read as "you may
         * not do that", not as a silently unsaved edit. Local state is NOT
         * advanced on failure, so the UI keeps showing the true stored state.
         */
        const detail = res.status === 403
          ? "You do not have permission to change this page's composition."
          : `Save failed (${res.status}).`;
        throw new Error(detail);
      }

      setLocal(next);
      /*
       * A full reload rather than a client-side re-render: the rails are
       * SERVER-rendered from the stored config, so the only way to see the
       * real new output — including anything the resolver's precedence rules
       * changed about siblings — is to re-render on the server. Optimistically
       * patching the DOM here would show the admin a composition the server
       * might not agree with, which is the one thing an in-place editor must
       * never do.
       */
      if (typeof window !== "undefined") window.location.reload();
    },
    [local, regionId],
  );

  return (
    <WidgetInstanceEditor node={node} scopeLabel={scopeLabel} onPatch={onPatch}>
      {children}
    </WidgetInstanceEditor>
  );
}
