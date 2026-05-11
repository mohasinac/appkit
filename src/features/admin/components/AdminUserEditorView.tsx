"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ConfirmDeleteModal,
  Form,
  FormActions,
  Select,
  SideDrawer,
  Toggle,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface AdminUserEditorViewProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  displayName?: string;
  currentRole?: string;
  currentIsDisabled?: boolean;
  currentEmailVerified?: boolean;
  /** Store the user owns (for sellers/admins). storeId === storeSlug in this project. */
  ownedStoreId?: string;
  ownedStoreName?: string;
}

const ROLE_OPTIONS = [
  { label: "User (buyer)", value: "user" },
  { label: "Seller", value: "seller" },
  { label: "Admin", value: "admin" },
];

// --- Component ---------------------------------------------------------------

export function AdminUserEditorView({
  open,
  onClose,
  userId,
  displayName,
  currentRole,
  currentIsDisabled,
  currentEmailVerified,
  ownedStoreId,
  ownedStoreName,
}: AdminUserEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [role, setRole] = React.useState(currentRole ?? "user");
  const [isDisabled, setIsDisabled] = React.useState(currentIsDisabled ?? false);
  const [banReason, setBanReason] = React.useState("");
  const [emailVerified, setEmailVerified] = React.useState(currentEmailVerified ?? false);
  const [adminNotes, setAdminNotes] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setRole(currentRole ?? "user");
      setIsDisabled(currentIsDisabled ?? false);
      setBanReason("");
      setEmailVerified(currentEmailVerified ?? false);
      setAdminNotes("");
    }
  }, [open, currentRole, currentIsDisabled, currentEmailVerified]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.USER_BY_ID(userId!), {
        role,
        isDisabled,
        emailVerified,
        adminNotes: adminNotes || undefined,
      });
    },
    onSuccess: () => {
      showToast("User updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update user.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.USER_BY_ID(userId!));
    },
    onSuccess: () => {
      showToast("User deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeleteOpen(false);
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete user.", "error");
    },
  });

  return (
    <>
      <SideDrawer
        isOpen={open}
        onClose={onClose}
        title={displayName ? `Manage: ${displayName}` : "Manage User"}
      >
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4 p-4"
        >
          {userId && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
                <div>
                  <span className="font-semibold">Owner ID (Firebase UID):</span>{" "}
                  <code className="select-all font-mono">{userId}</code>
                </div>
                {ownedStoreId && (
                  <div>
                    <span className="font-semibold">Owns store:</span>{" "}
                    <code className="select-all font-mono">{ownedStoreId}</code>
                    {ownedStoreName ? ` — ${ownedStoreName}` : ""}
                  </div>
                )}
              </div>
            </div>
          )}

          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onValueChange={setRole}
          />

          <Toggle
            label="Account disabled (banned)"
            checked={isDisabled}
            onChange={(val) => {
              setIsDisabled(val);
              if (!val) setBanReason("");
            }}
          />

          {isDisabled && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Ban reason (optional)
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
                placeholder="e.g. Repeated policy violations, fraudulent activity…"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <Toggle
            label="Email verified"
            checked={emailVerified}
            onChange={setEmailVerified}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this user…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <FormActions align="right">
            <Button
              type="button"
              variant="danger"
              onClick={() => setDeleteOpen(true)}
              disabled={!userId}
            >
              Delete user
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={saveMutation.isPending}
              disabled={!userId || saveMutation.isPending}
            >
              Save changes
            </Button>
          </FormActions>
        </Form>
      </SideDrawer>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title={`Delete ${displayName ?? "user"}?`}
        message="This action cannot be undone. The user's account and all associated data will be permanently removed."
        confirmText="Delete user"
        variant="danger"
      />
    </>
  );
}
