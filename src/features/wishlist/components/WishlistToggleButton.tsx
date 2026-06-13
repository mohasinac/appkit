"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Button, LoginRequiredModal } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";

interface WishlistToggleButtonProps {
  inWishlist: boolean;
  isLoading?: boolean;
  onToggle: (e: MouseEvent) => void | Promise<void>;
  addLabel: string;
  removeLabel: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-11 h-11",
};

export function WishlistToggleButton({
  inWishlist,
  isLoading = false,
  onToggle,
  addLabel,
  removeLabel,
  className = "",
  size = "md",
}: WishlistToggleButtonProps) {
  const label = inWishlist ? removeLabel : addLabel;
  const [showLoginModal, setShowLoginModal] = useState(false);

  async function handleClick(e: MouseEvent) {
    try {
      await onToggle(e);
    } catch (err) {
      if (isAuthError(err)) {
        setShowLoginModal(true);
      }
    }
  }

  return (
    <>
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to save items to your wishlist. Please log in or create an account."
      />
      <Button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={label}
        title={label}
        className={`
          flex items-center justify-center rounded-full
          transition-all duration-150
          ${
            inWishlist
              ? "bg-error-surface text-error hover:bg-error-surface"
              : "bg-white/80 text-zinc-400 hover:text-error"
          }
          ${sizeClasses[size]}
          ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${className}
        `}
      >
        <svg
          className="w-4/6 h-4/6"
          viewBox="0 0 24 24"
          fill={inWishlist ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </Button>
    </>
  );
}
