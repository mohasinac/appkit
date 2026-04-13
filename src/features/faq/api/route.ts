/**
 * feat-faq — Next.js App Router API handler (GET /api/faq)
 *
 * 2-line stub:
 * ```ts
 * // app/api/faq/route.ts
 * export { GET } from "@mohasinac/feat-faq";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../contracts";
import type { FAQ, FAQListResponse } from "../types/index";

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);

    const parts: string[] = ["isActive==true"];
    const category = param(url, "category");
    if (category) parts.push(`category==${category}`);
    const homepage = param(url, "homepage");
    if (homepage === "true") parts.push("showOnHomepage==true");
    const q = param(url, "q");
    if (q) parts.push(`question@=*${q}`);
    const filters = parts.join(",");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<FAQ>("faqs");
    const result = await repo.findAll({
      filters,
      sort: "order",
      order: "asc",
      perPage: 100,
    });

    const body: FAQListResponse = {
      items: result.data,
      total: result.total,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("[feat-faq] GET /api/faq failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FAQs" },
      { status: 500 },
    );
  }
}
