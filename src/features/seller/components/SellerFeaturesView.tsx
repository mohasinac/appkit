"use client";
import { normalizeError } from "../../../errors/normalize";

import React from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Div,
  Heading,
  Row,
  SideDrawer,
  Stack,
  Text,
  Toggle,
  useToast,
  Skeleton,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ERROR_MESSAGES } from "../../../errors/messages";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { AdminFeatureEditorView } from "../../admin/components/AdminFeatureEditorView";
import { MAX_STORE_CUSTOM_FEATURES } from "../../products/schemas/product-features";
import type { ProductFeatureDocument } from "../../products/schemas/product-features";
import type { JsonValue } from "@mohasinac/appkit";

const TOAST = {
  ENABLED: "Feature enabled.",
  DISABLED: "Feature disabled.",
} as const;

const ROW_CLASS =
  "flex items-center justify-between gap-3 px-4 py-3";
const CAP_BANNER_CLASS =
  "rounded-xl border border-warning dark:border-warning/60 bg-warning-surface px-4 py-2.5 text-xs text-warning";
const EMPTY_STATE_CLASS =
  "rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400";
const LIST_CLASS =
  "divide-y divide-zinc-200 dark:divide-slate-700 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900";

interface SellerFeaturesResponse {
  items?: ProductFeatureDocument[];
  total?: number;
  limit?: number;
  isFull?: boolean;
}

function unwrap(res: unknown): SellerFeaturesResponse {
  return ((res as { data?: JsonValue })?.data ?? res) as SellerFeaturesResponse;
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
    queryFn: async () => unwrap(await apiClient.get(SELLER_ENDPOINTS.FEATURES)),
  });

  const features = featuresQuery.data?.items ?? [];
  const limit = featuresQuery.data?.limit ?? MAX_STORE_CUSTOM_FEATURES;
  const isFull = featuresQuery.data?.isFull ?? features.length >= limit;

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["seller", "features", "listing"],
    });
  }, [queryClient]);

  const onSaved = React.useCallback(() => {
    invalidate();
    closePanel();
  }, [closePanel, invalidate]);

  const toggleActive = async (
    feature: ProductFeatureDocument,
    nextActive: boolean,
  ) => {
    try {
      await apiClient.put(SELLER_ENDPOINTS.FEATURE_BY_ID(feature.id), {
        isActive: nextActive,
      });
      showToast(nextActive ? TOAST.ENABLED : TOAST.DISABLED, "success");
      invalidate();
    } catch (err) {
      void normalizeError(err);
      showToast(
        (err as Error)?.message ??
          ERROR_MESSAGES.PRODUCT_FEATURES.UPDATE_FAILED,
        "error",
      );
    }
  };

  return (
    <Stack gap="md" paddingX="x-sm-md" className="min-h-screen" padding="y-md">
      <Row align="center" justify="between">
        <Div>
          <Heading
            level={1} size="lg" weight="semibold" color="primary">
            Custom feature badges
          </Heading>
          <Text className="mt-0.5" color="muted" size="xs">
            {features.length} of {limit} used. Platform features are always
            available on top of your custom ones.
          </Text>
        </Div>
        <Button gap="sm" 
          size="sm"
          onClick={openCreatePanel}
          disabled={isFull}
        >
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </Row>

      {isFull && (
        <Text as="div" className={CAP_BANNER_CLASS}>
          You have reached the {limit}-feature limit for your store. Delete an
          existing feature before adding a new one.
        </Text>
      )}

      {featuresQuery.isLoading ? (
        <Stack gap="sm">
          <Skeleton variant="rectangular" height="48px" />
          <Skeleton variant="rectangular" height="48px" />
          <Skeleton variant="rectangular" height="48px" />
        </Stack>
      ) : features.length === 0 ? (
        <Div className={EMPTY_STATE_CLASS}>
          You haven&apos;t created any custom features yet.
        </Div>
      ) : (
        <Stack as="ul" gap="none" className={LIST_CLASS}>
          {features.map((f) => (
            <Row as="li" key={f.id} className={ROW_CLASS} gap="sm">
              <button
                type="button"
                onClick={() => openEditPanel(f.id)}
                className="flex-1 text-left"
              >
                <Text
                  as="div" size="sm" weight="medium" color="primary">
                  {f.label}
                </Text>
                <Text
                  as="div"
                  className="mt-0.5" color="muted" size="xs"
                >
                  {f.category} · {f.productTypes.join(" · ")}
                </Text>
              </button>
              <Toggle
                checked={f.isActive}
                onChange={(checked) => toggleActive(f, checked)}
                aria-label="Active"
              />
            </Row>
          ))}
        </Stack>
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
    </Stack>
  );
}
