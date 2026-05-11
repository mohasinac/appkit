import { cache } from "react";
import { blogRepository } from "../../../../repositories";

export const getBlogPostForDetail = cache(
  async (slug: string) => {
    return (await blogRepository.findBySlug(slug).catch(() => undefined)) ?? null;
  },
);

export const getBlogPostById = cache(
  async (id: string) => {
    return (await blogRepository.findById(id).catch(() => undefined)) ?? null;
  },
);
