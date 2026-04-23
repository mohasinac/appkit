"use client";
import React, { useState } from "react";
import { X } from "lucide-react";

export interface AnnouncementBarProps {
  message: string;
  className?: string;
}

export function AnnouncementBar({ message, className = "" }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className={`relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-primary-600 ${className}`} role="banner" data-section="announcementbar-div-310">
      <div className="container mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8" data-section="announcementbar-div-311">
        <div className="relative flex items-center justify-center py-2 text-center text-sm font-medium text-white" data-section="announcementbar-div-312">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
