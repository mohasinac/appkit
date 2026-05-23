"use client";

import { useState, useCallback } from "react";
import { useToast } from "../../ui";

export interface UseEntityDeleteOptions {
  endpoint?: string | ((id: string) => string);
  deleteFn?: (id: string) => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (id: string) => void;
  onError?: (id: string, error: unknown) => void;
  fetchOptions?: Omit<RequestInit, "method">;
}

export interface UseEntityDeleteReturn {
  deletingId: string | null;
  handleDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useEntityDelete(opts: UseEntityDeleteOptions): UseEntityDeleteReturn {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        if (opts.deleteFn) {
          await opts.deleteFn(id);
        } else {
          const url = typeof opts.endpoint === "function" ? opts.endpoint(id) : `${opts.endpoint}/${id}`;
          const res = await fetch(url, { method: "DELETE", ...opts.fetchOptions });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { message?: string }).message || `Delete failed (${res.status})`);
          }
        }
        if (opts.successMessage) showToast(opts.successMessage, "success");
        opts.onSuccess?.(id);
      } catch (err) {
        const msg = opts.errorMessage ?? (err instanceof Error ? err.message : "Delete failed.");
        showToast(msg, "error");
        opts.onError?.(id, err);
      } finally {
        setDeletingId(null);
      }
    },
    [opts, showToast],
  );

  return {
    deletingId,
    handleDelete,
    isDeleting: deletingId !== null,
  };
}
