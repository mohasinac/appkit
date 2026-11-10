"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Div } from "./Div";
import { Text } from "./Typography";
import { ROUTES } from "../../next/routing/route-map";
import { useSignInHref } from "../../react/hooks/useReturnTo";

export interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Body copy shown inside the modal. */
  message?: string;
  /** Override the login destination (default: ROUTES.AUTH.LOGIN). */
  loginHref?: string;
}

export function LoginRequiredModal({
  isOpen,
  onClose,
  message = "You need to be signed in to continue. Please log in or create an account.",
  loginHref,
}: LoginRequiredModalProps) {
  /*
   * 🛑 Section-resolved AND carrying `?next=`. Both were missing: the raw
   * `/auth/login` is the SHOP's path and 404s on every other host, and without
   * `next` a visitor who was interrupted mid-action signed in and landed
   * somewhere unrelated — so the action they were trying to take was lost
   * rather than resumed, which is the whole purpose of this modal.
   */
  const href = useSignInHref(loginHref ?? String(ROUTES.AUTH.LOGIN));
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in required"
      size="sm"
      actions={
        <Div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { window.location.href = href; }}
          >
            Go to Login
          </Button>
        </Div>
      }
    >
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">{message}</Text>
    </Modal>
  );
}
