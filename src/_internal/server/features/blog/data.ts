import { cache } from "react";
import { blogRepository } from "../../../../repositories";

export const getBlogPostForDetail = cache(
  async (slug: string) => {
    return (await blogRepository.findBySlug(slug)) ?? null;
  },
);

export const getBlogPostById = cache(
  async (id: string) => {
    return (await blogRepository.findById(id)) ?? null;
  },
);
