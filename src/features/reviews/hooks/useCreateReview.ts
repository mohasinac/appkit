import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { REVIEW_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

export interface CreateReviewHookInput {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  videoUrl?: string;
}

export function useCreateReview(
  onSuccess?: () => void,
  onError?: (err: { status?: number; message?: string }) => void,
) {
  return useMutation<unknown, Error, CreateReviewHookInput>({
    mutationFn: (data) => {
      if ((data.images?.length ?? 0) > 5) {
        return Promise.reject(new Error("Reviews support at most 5 images."));
      }
      return apiClient.post(REVIEW_ENDPOINTS.LIST, {
        ...data,
        comment: normalizeRichTextHtml(data.comment),
        images: data.images ?? [],
        videoUrl: data.videoUrl,
      });
    },
    onSuccess,
    onError,
  });
}
