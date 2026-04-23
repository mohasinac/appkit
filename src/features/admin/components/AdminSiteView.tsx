"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormActions,
  Input,
  StackedViewShell,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import { SITE_SETTINGS_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

interface AdminSiteSettingsAnnouncement {
  announcementBar?: {
    enabled?: boolean;
    message?: string;
  };
}

export interface AdminSiteViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderTabs?: () => React.ReactNode;
  renderForm?: () => React.ReactNode;
}

export function AdminSiteView({
  labels = {},
  renderTabs,
  renderForm,
  ...rest
}: AdminSiteViewProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSiteSettings<AdminSiteSettingsAnnouncement>();
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(true);
  const [announcementMessage, setAnnouncementMessage] = React.useState("");
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setAnnouncementEnabled(data.announcementBar?.enabled ?? true);
    setAnnouncementMessage(data.announcementBar?.message ?? "");
  }, [data]);

  const saveAnnouncement = useMutation({
    mutationFn: async () => {
      await apiClient.patch(SITE_SETTINGS_ENDPOINTS.GET, {
        announcementBar: {
          enabled: announcementEnabled,
          message: announcementMessage,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setSaveMessage("Announcement settings saved.");
    },
    onError: () => {
      setSaveMessage("Failed to save announcement settings.");
    },
  });

  const defaultForm = () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        saveAnnouncement.mutate();
      }}
      className="space-y-4"
    >
      <Toggle
        checked={announcementEnabled}
        onChange={setAnnouncementEnabled}
        label="Show announcement bar on homepage"
      />
      <Input
        label="Announcement message"
        value={announcementMessage}
        onChange={(event) => setAnnouncementMessage(event.target.value)}
        placeholder="Enter homepage announcement"
        disabled={!announcementEnabled}
        helperText="This message is shown at the top of the homepage when enabled."
      />
      <FormActions align="right">
        <Button
          type="submit"
          disabled={saveAnnouncement.isPending || (announcementEnabled && !announcementMessage.trim())}
        >
          {saveAnnouncement.isPending ? "Saving..." : "Save announcement"}
        </Button>
      </FormActions>
      {saveMessage ? (
        <Alert
          variant={saveMessage.startsWith("Failed") ? "error" : "success"}
          title={saveMessage.startsWith("Failed") ? "Save failed" : "Saved"}
        >
          {saveMessage}
        </Alert>
      ) : null}
    </Form>
  );

  const loadingAlert = isLoading ? (
    <Alert variant="info" title="Loading settings">
      Fetching site settings...
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
      title={labels.title ?? "Site Settings"}
      sections={[renderTabs?.(), loadingAlert, errorAlert, renderForm?.() ?? defaultForm()]}
    />
  );
}
