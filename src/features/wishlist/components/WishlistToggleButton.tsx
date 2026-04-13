"use client";

import type { MouseEvent } from "react";
import { Button } from "../../../ui";

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

  return (
    <Button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      aria-label={label}
      title={label}
      className={`
        flex items-center justify-center rounded-full
        transition-all duration-150
        ${
          inWishlist
            ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
            : "bg-white/80 text-zinc-400 hover:text-rose-400"
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
  );
}
