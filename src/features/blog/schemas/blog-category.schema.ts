import { z } from "zod";

export const blogPostCategorySchema = z.enum([
  "news",
  "tips",
  "guides",
  "updates",
  "community",
]);
