"use client";

/**
 * ClaimCouponButton — surfaced anywhere a user wins or earns a coupon
 * (SpinWheel "YOU WON" panel, raffle winner page, prize-draw reveal modal,
 * promotional inserts).
 *
 * Behaviour:
 *   1. If the visitor is not signed in, opens the standard LoginRequiredModal —
 *      no coupon is copied or saved. The wallet is per-user, so anonymous
 *      claims would be lost.
 *   2. POST `/api/user/coupons/claim` to persist the claim into the user's
 *      wallet (idempotent — second claim is a no-op).
 *   3. Copy the code to the clipboard so the user can paste it at checkout.
 *
 * No more cart deep-link — the wallet ("My Coupons" page) is the single home
 * for claimed coupons, and the user applies them from there at checkout.
 */

import React, { useCallback, useState } from "react";
import { Button } from "./Button";
import { LoginRequiredModal } from "./LoginRequiredModal";
import { useSession } from "../../react/contexts/SessionContext";
import { useToast } from "./Toast";

async function postClaim(
  couponCode: string,
  source: ClaimCouponButtonProps["source"],
): Promise<boolean> {
  if (typeof fetch === "undefined") return false;
  try {
    const res = await fetch("/api/user/coupons/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ couponCode, source }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface ClaimCouponButtonProps {
  couponCode: string;
  /** Optional server-side claim handler — overrides the default wallet POST. */
  onClaim?: (code: string) => Promise<void> | void;
  /** Override the button label. */
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  source?: "manual" | "promo" | "spin" | "raffle" | "prize-draw";
}

export function ClaimCouponButton({
  couponCode,
  onClaim,
  label,
  className,
  size = "md",
  source = "manual",
}: ClaimCouponButtonProps): React.JSX.Element {
  const { user, loading } = useSession();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy || !couponCode) return;
    if (loading) return;
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setBusy(true);
    try {
      const ok =
        onClaim != null
          ? (await Promise.resolve(onClaim(couponCode)), true)
          : await postClaim(couponCode, source);
      if (!ok) {
        showToast("Could not save coupon. Please try again.", "error");
        return;
      }
      await copyToClipboard(couponCode);
      setClaimed(true);
      showToast(`${couponCode} saved to your coupons.`, "success");
    } finally {
      setBusy(false);
    }
  }, [busy, couponCode, loading, onClaim, showToast, source, user]);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size={size}
        onClick={handleClick}
        disabled={busy || !couponCode || loading}
        className={className}
      >
        {busy
          ? "Saving…"
          : claimed
            ? "Saved to My Coupons"
            : (label ?? "Claim coupon")}
      </Button>
      <LoginRequiredModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        message="Sign in to save coupons to your wallet."
      />
    </>
  );
}
