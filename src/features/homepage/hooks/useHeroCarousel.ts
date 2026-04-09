"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { CarouselSlide } from "../types/index.js";

/**
 * useHeroCarousel
 * Fetches active carousel slides for the homepage hero.
 * Data is pre-filtered to active slides, sorted by order, capped at 5.
 */
export function useHeroCarousel(options?: { initialData?: CarouselSlide[] }) {
  return useQuery<CarouselSlide[]>({
    queryKey: ["carousel", "active"],
    queryFn: () => apiClient.get<CarouselSlide[]>("/api/carousel"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
  });
}
