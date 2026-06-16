"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Code, Div, FormActions, HorizontalRule, Label, Row, Select, SideDrawer, Span, Stack, Text, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const __P = {
  p3: "p-3",
  p4: "p-4",
} as const;

const CLS_SECTION_LABEL = "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide";

export interface AdminScammerEditorViewProps {
  open: boolean;
  onClose: () => void;
  scammerId?: string;
  displayNames?: string[];
  scamType?: string;
  description?: string;
  phones?: string[];
  upiIds?: string[];
  currentStatus?: string;
  verificationNote?: string;
  reportedBy?: string;
  reportedByAnon?: boolean;
}

const STATUS_OPTIONS = [
  { label: "Pending review", value: "pending_review" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
  { label: "Removed", value: "removed" },
];

const STATUS_COLOR: Record<string, string> = {
  pending_review: "bg-warning-surface text-warning",
  verified: "bg-success-surface text-success",
  rejected: "bg-error-surface text-error",
  removed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function AdminScammerEditorView({
  open,
  onClose,
  scammerId,
  displayNames = [],
  scamType,
  description,
  phones = [],
  upiIds = [],
  currentStatus,
  verificationNote,
  reportedBy,
  reportedByAnon,
}: AdminScammerEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "pending_review");
  const [note, setNote] = React.useState(verificationNote ?? "");

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "pending_review");
      setNote(verificationNote ?? "");
    }
  }, [open, currentStatus, verificationNote]);

  const updateMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.SCAMMER_BY_ID(scammerId!), {
        status,
        verificationNote: note || undefined,
      });
    },
    onSuccess: () => {
      showToast("Scammer profile updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "scammers"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update profile.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.SCAMMER_BY_ID(scammerId!));
    },
    onSuccess: () => {
      showToast("Scammer profile deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "scammers"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete profile.", "error");
    },
  });

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={displayNames.length > 0 ? displayNames[0] : "Scammer Profile"}
    >
      <Stack className={`${__P.p4}`} gap="md">
        {/* Status badge */}
        <Row align="center" gap="sm">
          <Span
            size="xs"
            weight="medium"
            className={`inline-flex px-2.5 ${ STATUS_COLOR[currentStatus ?? "pending_review"] ?? STATUS_COLOR.pending_review }`} rounded="full" padding="y-2xs"
          >
            {(currentStatus ?? "pending_review").replace(/_/g, " ")}
          </Span>
          {scamType && (
            <Span size="xs" className="px-2.5" rounded="full" padding="y-2xs" surface="subtle" color="muted">
              {scamType.replace(/_/g, " ")}
            </Span>
          )}
        </Row>

        {/* Names */}
        {displayNames.length > 0 && (
          <Div>
            <Text className="mb-1 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Names / Aliases
            </Text>
            <Row wrap gap="xs">
              {displayNames.map((name, i) => (
                <Span
                  key={i}
                  size="xs" rounded="full" surface="subtle" padding="pill-sm">
                  {name}
                </Span>
              ))}
            </Row>
          </Div>
        )}

        {/* Contact identifiers */}
        {(phones.length > 0 || upiIds.length > 0) && (
          <Div className={`${__P.p3}`} rounded="lg" surface="muted" border="default">
            {phones.length > 0 && (
              <Div className="mb-2">
                <Text className={CLS_SECTION_LABEL}>
                  Phone numbers
                </Text>
                <Row wrap gap="xs">
                  {phones.map((p, i) => (
                    <Code key={i} size="xs" rounded="default" padding="sm" surface="subtle">
                      {p}
                    </Code>
                  ))}
                </Row>
              </Div>
            )}
            {upiIds.length > 0 && (
              <>
                <Text className={CLS_SECTION_LABEL}>
                  UPI IDs
                </Text>
                <Row wrap gap="xs">
                  {upiIds.map((u, i) => (
                    <Code key={i} size="xs" rounded="default" padding="sm" surface="subtle">
                      {u}
                    </Code>
                  ))}
                </Row>
              </>
            )}
          </Div>
        )}

        {/* Description */}
        {description && (
          <Div className={`${__P.p3}`} rounded="lg" surface="muted" border="default">
            <Text className={CLS_SECTION_LABEL}>
              Description
            </Text>
            <Text className="whitespace-pre-wrap" color="primary" size="sm">
              {description}
            </Text>
          </Div>
        )}

        {/* Reporter */}
        <Div textSize="xs" color="muted">
          Reported by:{" "}
          <Span weight="medium" color="muted">
            {reportedByAnon ? "Anonymous" : (reportedBy ?? "Unknown")}
          </Span>
        </Div>

        <HorizontalRule tone="subtle" spacing="comfortable" />

        {/* Status change */}
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />

        {/* Verification note */}
        <Stack gap="xs">
          <Label className="uppercase tracking-wide" color="muted" size="xs" weight="semibold">
            Verification note (internal)
          </Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Verified via 3 independent reports…"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </Stack>

        <FormActions align="right">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={!scammerId}
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={updateMutation.isPending}
            disabled={!scammerId || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            Save changes
          </Button>
        </FormActions>
      </Stack>
    </SideDrawer>
  );
}
