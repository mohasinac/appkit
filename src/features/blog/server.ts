/**
 * @mohasinac/appkit/features/blog/server
 *
 * Server-only entry point — exports only the API route handlers.
 */

export { GET as blogGET, GET } from "./api/route";
export { GET as blogSlugGET } from "./api/[slug]/route";
export type { BlogPostDetailResponse } from "./api/[slug]/route";
