"use client";

import React from "react";
import type { SocialPost, SocialPlatform } from "../schemas";

// --- Platform brand colours & icons ------------------------------------------

const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; icon: React.ReactNode }> = {
  instagram: {
    label: "Instagram",
    color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    color: "bg-blue-600",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "bg-black",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  deviantart: {
    label: "DeviantArt",
    color: "bg-green-600",
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.207 4.794l.23-.43V0h-4.169l-.321.33-1.445 2.698-.428.33H4.793v5.994l.289.321 1.156 2.168v.065l-1.156 2.168-.289.321V19.8h8.481l.428.33 1.445 2.698.321.329h4.169v-4.364l-.23-.43-1.09-2.044v-.064l1.09-2.044.23-.43V4.794zM14.72 14.058h-4.53v-4.116h4.53v4.116z" />
      </svg>
    ),
  },
};

// --- Stats formatter ---------------------------------------------------------

function formatCount(n: number | undefined): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// --- Component ---------------------------------------------------------------

export interface SocialPostCardProps {
  post: SocialPost;
  showCaption?: boolean;
  showStats?: boolean;
}

export function SocialPostCard({ post, showCaption = true, showStats = true }: SocialPostCardProps) {
  const meta = PLATFORM_META[post.platform];

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={post.caption ?? `View on ${meta.label}`}
    >
      {/* Thumbnail */}
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={post.caption ?? `${meta.label} post`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
          <span className="text-zinc-400 text-sm">No preview</span>
        </div>
      )}

      {/* Video play overlay */}
      {post.mediaType === "video" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Carousel indicator */}
      {post.mediaType === "carousel" && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <div className="w-6 h-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="15" height="15" rx="2" />
              <path d="M7 8h14M7 12h14M7 16h14" />
            </svg>
          </div>
        </div>
      )}

      {/* Platform badge */}
      <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-1 rounded text-white text-xs font-medium ${meta.color}`}>
        {meta.icon}
        <span className="hidden sm:inline">{meta.label}</span>
      </div>

      {/* Hover overlay — caption + stats */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 pointer-events-none">
        {showCaption && post.caption && (
          <p className="text-white text-xs line-clamp-3 mb-2">{post.caption}</p>
        )}
        {showStats && (
          <div className="flex items-center gap-3 text-white/80 text-xs">
            {post.stats.likes != null && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {formatCount(post.stats.likes)}
              </span>
            )}
            {post.stats.views != null && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                {formatCount(post.stats.views)}
              </span>
            )}
            {post.stats.comments != null && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {formatCount(post.stats.comments)}
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
