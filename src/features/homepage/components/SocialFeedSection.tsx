import { normalizeError } from "../../../errors/normalize";
import { Div, Heading, Section, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import { SocialPostCard } from "./SocialPostCard";
import {
  fetchInstagramPosts,
  fetchFacebookPosts,
  fetchTikTokPosts,
  fetchDeviantArtPosts,
} from "../lib/social-feed-fetcher";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import type { SocialFeedSectionConfig, SocialPost, SocialPlatform } from "../schemas";

// --- Platform labels ---------------------------------------------------------

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  deviantart: "DeviantArt",
  youtube: "YouTube",
};

function platformProfileUrl(platform: SocialPlatform, handle: string): string {
  switch (platform) {
    case "instagram": return `https://www.instagram.com/${handle}/`;
    case "facebook": return `https://www.facebook.com/${handle}`;
    case "tiktok": return `https://www.tiktok.com/@${handle}`;
    case "deviantart": return `https://www.deviantart.com/${handle}`;
    case "youtube": return `https://www.youtube.com/@${handle}`;
  }
}

// --- Skeleton ----------------------------------------------------------------

function SocialFeedSkeleton({ count }: { count: number }) {
  return (
    <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Div key={i} className="aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      ))}
    </Div>
  );
}

// --- Empty state -------------------------------------------------------------

function SocialFeedEmpty({ platform }: { platform: SocialPlatform }) {
  return (
    <Div className="flex flex-col items-center justify-center py-16 text-zinc-400">
      <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
      <Text size="sm">No posts from {PLATFORM_LABELS[platform]} yet.</Text>
    </Div>
  );
}

// --- Server fetch ------------------------------------------------------------

async function loadPosts(config: SocialFeedSectionConfig): Promise<{ posts: SocialPost[]; error?: string }> {
  const { platform, handle, postType, count, posts: staticPosts } = config;

  // YouTube: no API token needed — render from static posts in config
  if (platform === "youtube") {
    const posts: SocialPost[] = (staticPosts ?? []).map((p) => ({
      id: p.id,
      platform: "youtube",
      permalink: `https://youtu.be/${p.videoId ?? ""}`,
      videoId: p.videoId,
      channelName: p.channelName,
      caption: p.caption,
      mediaType: "video",
      imageUrl: p.videoId ? `https://img.youtube.com/vi/${p.videoId}/maxresdefault.jpg` : undefined,
      stats: {},
    }));
    return { posts };
  }

  if (!handle) return { posts: [], error: `A handle is required for ${PLATFORM_LABELS[platform]}.` };

  try {
    const credentials = await siteSettingsRepository.getDecryptedCredentials().catch(() => null);
    switch (platform) {
      case "instagram": {
        const token = credentials?.metaPageAccessToken;
        if (!token) return { posts: [], error: "Instagram access token not configured in Site Settings." };
        return { posts: await fetchInstagramPosts(handle, postType, count, token) };
      }
      case "facebook": {
        const token = credentials?.metaPageAccessToken;
        if (!token) return { posts: [], error: "Facebook access token not configured in Site Settings." };
        return { posts: await fetchFacebookPosts(handle, postType, count, token) };
      }
      case "tiktok": {
        const token = credentials?.tiktokAccessToken;
        if (!token) return { posts: [], error: "TikTok access token not configured in Site Settings." };
        return { posts: await fetchTikTokPosts(handle, postType, count, token) };
      }
      case "deviantart": {
        const clientId = credentials?.deviantartClientId;
        const clientSecret = credentials?.deviantartClientSecret;
        if (!clientId || !clientSecret) return { posts: [], error: "DeviantArt credentials not configured in Site Settings." };
        return { posts: await fetchDeviantArtPosts(handle, postType, count, clientId, clientSecret) };
      }
      default:
        return { posts: [], error: "Unsupported platform." };
    }
  } catch (err) {
    void normalizeError(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[SocialFeedSection] ${platform} fetch failed:`, message);
    return { posts: [], error: `Could not load ${PLATFORM_LABELS[platform]} posts right now.` };
  }
}

// --- Main component ----------------------------------------------------------

export type SocialFeedSectionProps = SocialFeedSectionConfig;

export async function SocialFeedSection(config: SocialFeedSectionProps) {
  const { title, subtitle, platform, handle, layout, showCaption, showStats, count } = config;
  const { themed } = THEME_CONSTANTS;
  const { posts, error } = await loadPosts(config);
  const profileUrl = handle ? platformProfileUrl(platform, handle) : null;

  const gridClass =
    layout === "carousel"
      ? "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
      : layout === "masonry"
        ? "columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
        : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

  const cardClass =
    layout === "carousel"
      ? "flex-shrink-0 w-[85%] sm:w-56 snap-start"
      : layout === "masonry"
        ? "break-inside-avoid"
        : "";

  return (
    <Section className={`py-12 ${themed.bgPrimary}`}>
      <Div className="w-full max-w-7xl mx-auto px-4">
        <Div className="mb-8 flex items-end justify-between gap-4">
          <>
            <Heading level={2} className="mb-1">
              {title || `${PLATFORM_LABELS[platform]} Feed`}
            </Heading>
            {subtitle && (
              <Text size="sm" variant="muted">
                {subtitle}
              </Text>
            )}
          </>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-medium text-[var(--appkit-color-primary)] hover:opacity-80"
            >
              Follow on {PLATFORM_LABELS[platform]} →
            </a>
          )}
        </Div>

        {error ? (
          <Div className="py-12 text-center text-zinc-400 text-sm">{error}</Div>
        ) : posts.length === 0 ? (
          <SocialFeedEmpty platform={platform} />
        ) : (
          <Div className={gridClass}>
            {posts.slice(0, count).map((post) => (
              <Div key={post.id} className={cardClass}>
                <SocialPostCard
                  post={post}
                  showCaption={showCaption}
                  showStats={showStats}
                />
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </Section>
  );
}
