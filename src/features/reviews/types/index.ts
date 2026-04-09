export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewImage {
  url: string;
  thumbnailUrl?: string;
}

export interface ReviewVideo {
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
}

export interface Review {
  id: string;
  productId: string;
  productTitle?: string;
  sellerId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  images?: ReviewImage[];
  video?: ReviewVideo;
  status: ReviewStatus;
  helpfulCount?: number;
  reportCount?: number;
  verified?: boolean;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewListResponse {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
}

export interface ReviewListParams {
  productId?: string;
  userId?: string;
  sellerId?: string;
  status?: ReviewStatus;
  rating?: number;
  featured?: boolean;
  page?: number;
  perPage?: number;
  sort?: string;
}

export interface CreateReviewInput {
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: ReviewImage[];
  video?: ReviewVideo;
}
