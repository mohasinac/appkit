"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormActions,
  StackedViewShell,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import { SITE_SETTINGS_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

interface AdminNavigationSettings {
  navbarConfig?: {
    hiddenNavItems?: string[];
  };
}

const NAV_KEYS = [
  "home",
  "products",
  "auctions",
  "preOrders",
  "categories",
  "stores",
  "events",
  "blog",
  "reviews",
] as const;

const NAV_LABELS: Record<(typeof NAV_KEYS)[number], string> = {
  home: "Home",
  products: "Products",
  auctions: "Auctions",
  preOrders: "Pre-orders",
  categories: "Categories",
  stores: "Stores",
  events: "Events",
  blog: "Blog",
  reviews: "Reviews",
};

export interface AdminNavigationViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  /** @deprecated Use `overlays` instead. */
  renderDrawer?: () => React.ReactNode;
  /** @deprecated Use `overlays` instead. */
  renderModal?: () => React.ReactNode;
  labels?: { title?: string };
  renderForm?: () => React.ReactNode;
}

export function AdminNavigationView({
  labels = {},
  renderForm,
  renderDrawer,
  renderModal,
  ...rest
}: AdminNavigationViewProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSiteSettings<AdminNavigationSettings>();
  const [hiddenNavItems, setHiddenNavItems] = React.useState<string[]>([]);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (!data) return;
    setHiddenNavItems(data.navbarConfig?.hiddenNavItems ?? []);
  }, [data]);

  const saveNavigation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(SITE_SETTINGS_ENDPOINTS.GET, {
        navbarConfig: {
          hiddenNavItems,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      showToast("Navigation settings saved.", "success");
    },
    onError: () => {
      showToast("Failed to save navigation settings.", "error");
    },
  });

  const toggleNavItem = (key: string, visible: boolean) => {
    setHiddenNavItems((prev) => {
      if (visible) {
        return prev.filter((item) => item !== key);
      }
      if (prev.includes(key)) {
        return prev;
      }
      return [...prev, key];
    });
  };

  const defaultForm = () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        saveNavigation.mutate();
      }}
      className="space-y-4"
    >
      {NAV_KEYS.map((key) => {
        const isVisible = !hiddenNavItems.includes(key);
        return (
          <Toggle
            key={key}
            checked={isVisible}
            onChange={(value) => toggleNavItem(key, value)}
            label={`Show ${NAV_LABELS[key]} in top navigation`}
          />
        );
      })}
      <FormActions align="right">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setHiddenNavItems(data?.navbarConfig?.hiddenNavItems ?? []);
          }}
          disabled={saveNavigation.isPending}
        >
          Reset
        </Button>
        <Button type="submit" disabled={saveNavigation.isPending}>
          {saveNavigation.isPending ? "Saving..." : "Save navigation"}
        </Button>
      </FormActions>
    </Form>
  );

  const loadingAlert = isLoading ? (
    <Alert variant="info" title="Loading settings">
      Fetching navigation configuration...
    </Alert>
  ) : null;

  const errorAlert = error ? (
    <Alert variant="error" title="Could not load settings">
      {error instanceof Error ? error.message : "Unknown error"}
    </Alert>
  ) : null;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Navigation"}
      sections={[loadingAlert, errorAlert, renderForm?.() ?? defaultForm(), renderDrawer?.(), renderModal?.()]}
    />
  );
}
