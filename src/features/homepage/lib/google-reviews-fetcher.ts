export interface GoogleReview {
  authorName: string;
  authorPhotoUrl: string;
  rating: number;
  text: string;
  time: number;
  profileUrl: string;
}

export interface GoogleReviewsResult {
  reviews: GoogleReview[];
  aggregateRating: number;
  totalRatings: number;
}

export async function fetchGoogleReviews(
  placeId: string,
  apiKey: string,
  maxReviews = 5,
  minRating = 0,
): Promise<GoogleReviewsResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "reviews,rating,user_ratings_total");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);

  const json = (await res.json()) as {
    result?: {
      reviews?: Array<{
        author_name?: string;
        profile_photo_url?: string;
        rating?: number;
        text?: string;
        time?: number;
        author_url?: string;
      }>;
      rating?: number;
      user_ratings_total?: number;
    };
  };

  const raw = Array.isArray(json.result?.reviews) ? json.result.reviews : [];
  const reviews: GoogleReview[] = raw
    .filter((r) => (r.rating ?? 0) >= minRating)
    .slice(0, maxReviews)
    .map((r) => ({
      authorName: r.author_name ?? "Anonymous",
      authorPhotoUrl: r.profile_photo_url ?? "",
      rating: r.rating ?? 0,
      text: r.text ?? "",
      time: r.time ?? 0,
      profileUrl: r.author_url ?? "",
    }));

  return {
    reviews,
    aggregateRating: json.result?.rating ?? 0,
    totalRatings: json.result?.user_ratings_total ?? 0,
  };
}
