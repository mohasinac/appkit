"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, SideDrawer, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { AdminFeatureEditorView } from "../../admin/components/AdminFeatureEditorView";
import { MAX_STORE_CUSTOM_FEATURES } from "../../products/schemas/product-features";
import type { ProductFeatureDocument } from "../../products/schemas/product-features";

interface SellerFeaturesResponse {
  items?: ProductFeatureDocument[];
  total?: number;
  limit?: number;
  isFull?: boolean;
}

export function SellerFeaturesView() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    openCreatePanel,
    openEditPanel,
    closePanel,
    isCreateOpen,
    isEditOpen,
    editId,
  } = usePanelUrlSync();

  const featuresQuery = useQuery({
    queryKey: ["seller", "features", "listing"],
    queryFn: async () => {
      const res = await apiClient.get(SELLER_ENDPOINTS.FEATURES);
      return ((res as { data?: unknown })?.data ??
        res) as SellerFeaturesResponse;
    },
  });

  const features = featuresQuery.data?.items ?? [];
  const limit = featuresQuery.data?.limit ?? MAX_STORE_CUSTOM_FEATURES;
  const isFull = featuresQuery.data?.isFull ?? features.length >= limit;

  const onSaved = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["seller", "features", "listing"],
    });
    closePanel();
  }, [closePanel, queryClient]);

  const toggleActive = async (
    feature: ProductFeatureDocument,
    nextActive: boolean,
  ) => {
    try {
      await apiClient.put(SELLER_ENDPOINTS.FEATURE_BY_ID(feature.id), {
        isActive: nextActive,
      });
      showToast(
        nextActive ? "Feature enabled." : "Feature disabled.",
        "success",
      );
      queryClient.invalidateQueries({
        queryKey: ["seller", "features", "listing"],
      });
    } catch (err) {
      showToast(
        (err as Error)?.message ?? "Failed to update feature.",
        "error",
      );
    }
  };

  return (
    <div className="min-h-screen px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Custom feature badges
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {features.length} of {limit} used. Platform features are always
            available on top of your custom ones.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreatePanel}
          disabled={isFull}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {isFull && (
        <div className="mb-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          You have reached the {limit}-feature limit for your store. Delete an
          existing feature before adding a new one.
        </div>
      )}

      {featuresQuery.isLoading ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
      ) : features.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          You haven't created any custom features yet.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-slate-700 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {features.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                onClick={() => openEditPanel(f.id)}
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {f.label}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {f.category} · {f.productTypes.join(" · ")}
                </div>
              </button>
              <Toggle
                checked={f.isActive}
                onChange={(checked) => toggleActive(f, checked)}
                aria-label="Active"
              />
            </li>
          ))}
        </ul>
      )}

      <SideDrawer
        isOpen={isCreateOpen || isEditOpen}
        onClose={closePanel}
        title={isCreateOpen ? "Add Feature" : "Edit Feature"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminFeatureEditorView
            featureId={editId ?? undefined}
            fixedScope="store"
            embedded
            endpointOverride={{
              create: SELLER_ENDPOINTS.FEATURES,
              byId: SELLER_ENDPOINTS.FEATURE_BY_ID,
            }}
            onSaved={onSaved}
            onDeleted={onSaved}
          />
        )}
      </SideDrawer>
    </div>
  );
}
