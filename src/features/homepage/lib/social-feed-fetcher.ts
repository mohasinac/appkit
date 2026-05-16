import type { SocialPost, SocialPlatform, SocialPostType } from "../schemas";

// --- Helpers ------------------------------------------------------------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isVideoOrReels(postType: SocialPostType): boolean {
  return ["videos", "reels"].includes(postType);
}

// --- Instagram (Meta Graph API v19) ------------------------------------------

export async function fetchInstagramPosts(
  handle: string,
  postType: SocialPostType,
  count: number,
  accessToken: string,
): Promise<SocialPost[]> {
  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const url = new URL(`https://graph.facebook.com/v19.0/${handle}/media`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(clamp(count * 2, 1, 20)));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Instagram API error: ${await res.text()}`);
  const json = (await res.json()) as { data?: unknown[] };
  const items: unknown[] = Array.isArray(json.data) ? json.data : [];

  return items
    .filter((item) => {
      const m = item as Record<string, unknown>;
      if (postType === "images") return m.media_type === "IMAGE";
      if (isVideoOrReels(postType)) return m.media_type === "VIDEO";
      return true;
    })
    .slice(0, count)
    .map((item) => {
      const m = item as Record<string, string | undefined>;
      const isVideo = m.media_type === "VIDEO";
      return {
        id: m.id ?? "",
        platform: "instagram" as SocialPlatform,
        imageUrl: (isVideo ? m.thumbnail_url : m.media_url) ?? "",
        videoThumbnailUrl: isVideo ? m.thumbnail_url : undefined,
        caption: m.caption?.slice(0, 200),
        permalink: m.permalink ?? "",
        mediaType: isVideo ? "video" : (m.media_type === "CAROUSEL_ALBUM" ? "carousel" : "image"),
        stats: {
          likes: m.like_count ? Number(m.like_count) : undefined,
          comments: m.comments_count ? Number(m.comments_count) : undefined,
        },
        publishedAt: m.timestamp ?? "",
      } satisfies SocialPost;
    });
}

// --- Facebook (Meta Graph API v19) -------------------------------------------

export async function fetchFacebookPosts(
  handle: string,
  postType: SocialPostType,
  count: number,
  accessToken: string,
): Promise<SocialPost[]> {
  const fields =
    "id,message,full_picture,permalink_url,created_time,likes.summary(true),attachments{media_type}";
  const url = new URL(`https://graph.facebook.com/v19.0/${handle}/posts`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(clamp(count * 2, 1, 40)));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Facebook API error: ${await res.text()}`);
  const json = (await res.json()) as { data?: unknown[] };
  const items: unknown[] = Array.isArray(json.data) ? json.data : [];

  return items
    .filter((item) => {
      const m = item as Record<string, unknown>;
      if (!m.full_picture) return false;
      const attachType = (m as Record<string, Record<string, unknown[]> | undefined>)
        .attachments?.data?.[0];
      const mtype = (attachType as Record<string, unknown> | undefined)?.media_type as
        | string
        | undefined;
      if (postType === "images") return mtype !== "video";
      if (isVideoOrReels(postType)) return mtype === "video";
      return true;
    })
    .slice(0, count)
    .map((item) => {
      const m = item as Record<string, unknown>;
      const likesObj = m.likes as Record<string, unknown> | undefined;
      return {
        id: String(m.id ?? ""),
        platform: "facebook" as SocialPlatform,
        imageUrl: String(m.full_picture ?? ""),
        caption: m.message ? String(m.message).slice(0, 200) : undefined,
        permalink: String(m.permalink_url ?? ""),
        mediaType: "image" as const,
        stats: {
          likes: likesObj?.summary
            ? Number((likesObj.summary as Record<string, unknown>).total_count ?? 0)
            : undefined,
        },
        publishedAt: String(m.created_time ?? ""),
      } satisfies SocialPost;
    });
}

// --- TikTok (TikTok for Developers v2) ----------------------------------------

export async function fetchTikTokPosts(
  _handle: string,
  postType: SocialPostType,
  count: number,
  accessToken: string,
): Promise<SocialPost[]> {
  if (postType === "images") return [];
  const res = await fetch("https://open.tiktokapis.com/v2/video/list/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      max_count: clamp(count, 1, 20),
      fields: [
        "id",
        "title",
        "cover_image_url",
        "share_url",
        "like_count",
        "view_count",
        "create_time",
      ],
    }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`TikTok API error: ${await res.text()}`);
  const json = (await res.json()) as { data?: { videos?: unknown[] } };
  const items: unknown[] = json.data?.videos ?? [];

  return items.slice(0, count).map((item) => {
    const v = item as Record<string, unknown>;
    return {
      id: String(v.id ?? ""),
      platform: "tiktok" as SocialPlatform,
      imageUrl: String(v.cover_image_url ?? ""),
      videoThumbnailUrl: String(v.cover_image_url ?? ""),
      caption: v.title ? String(v.title).slice(0, 200) : undefined,
      permalink: String(v.share_url ?? ""),
      mediaType: "video" as const,
      stats: {
        likes: v.like_count ? Number(v.like_count) : undefined,
        views: v.view_count ? Number(v.view_count) : undefined,
      },
      publishedAt: v.create_time
        ? new Date(Number(v.create_time) * 1000).toISOString()
        : "",
    } satisfies SocialPost;
  });
}

// --- DeviantArt (client-credentials OAuth2) ----------------------------------

async function getDeviantArtToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://www.deviantart.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    next: { revalidate: 3300 },
  });
  if (!res.ok) throw new Error(`DeviantArt token error: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchDeviantArtPosts(
  handle: string,
  postType: SocialPostType,
  count: number,
  clientId: string,
  clientSecret: string,
): Promise<SocialPost[]> {
  if (isVideoOrReels(postType)) return [];
  const token = await getDeviantArtToken(clientId, clientSecret);
  const url = new URL("https://www.deviantart.com/api/v1/oauth2/gallery/all");
  url.searchParams.set("username", handle);
  url.searchParams.set("limit", String(clamp(count, 1, 24)));
  url.searchParams.set("mature_content", "false");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`DeviantArt API error: ${await res.text()}`);
  const json = (await res.json()) as { results?: unknown[] };
  const items: unknown[] = json.results ?? [];

  return items.slice(0, count).map((item) => {
    const d = item as Record<string, unknown>;
    const thumbs = d.thumbs as Array<Record<string, unknown>> | undefined;
    const bestThumb = thumbs?.sort(
      (a, b) => Number(b.width ?? 0) - Number(a.width ?? 0),
    )[0];
    return {
      id: String(d.deviationid ?? ""),
      platform: "deviantart" as SocialPlatform,
      imageUrl: bestThumb ? String(bestThumb.src ?? "") : "",
      caption: d.title ? String(d.title).slice(0, 200) : undefined,
      permalink: String(d.url ?? ""),
      mediaType: "image" as const,
      stats: {
        views: d.stats
          ? Number((d.stats as Record<string, unknown>).views ?? 0)
          : undefined,
        likes: d.stats
          ? Number((d.stats as Record<string, unknown>).favourites ?? 0)
          : undefined,
      },
      publishedAt: d.published_time ? String(d.published_time) : "",
    } satisfies SocialPost;
  });
}
