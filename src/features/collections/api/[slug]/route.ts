/**
 * feat-collections — GET/PATCH/DELETE /api/collections/[slug]
 *
 * Collection retrieval, updates, and deletion by slug.
 *
 * Consumer stub:
 * ```ts
 * export { collectionDetailGET as GET, collectionDetailPATCH as PATCH, collectionDetailDELETE as DELETE } from "@mohasinac/feat-collections";
 * ```
 */

import { NextResponse } from "next/server.js";
import type { JsonValue } from "@mohasinac/appkit";
import { getProviders } from "../../../../contracts";
import { normalizeError } from "../../../../errors/normalize";

const ERR_COLLECTION_SLUG_REQUIRED = "Collection slug is required";
const ERR_DB_NOT_CONFIGURED = "Database provider not configured";
const ERR_COLLECTION_NOT_FOUND = "Collection not found";
const ERR_INTERNAL_SERVER_ERROR = "Internal server error";

interface CollectionEntity extends Record<string, JsonValue> {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_SLUG_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<CollectionEntity>("collections");
    const result = await repo.findAll({
      filters: `slug==${slug}`,
      perPage: 1,
    });

    if (!result.data[0]) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_NOT_FOUND },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data[0],
    });
  } catch (error) {
    void normalizeError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERR_INTERNAL_SERVER_ERROR,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_SLUG_REQUIRED },
        { status: 400 },
      );
    }

    const body = await request.json();

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<CollectionEntity>("collections");
    const result = await repo.findAll({
      filters: `slug==${slug}`,
      perPage: 1,
    });

    if (!result.data[0]) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_NOT_FOUND },
        { status: 404 },
      );
    }

    const updated = await repo.update(result.data[0].id, body);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    void normalizeError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERR_INTERNAL_SERVER_ERROR,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_SLUG_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<CollectionEntity>("collections");
    const result = await repo.findAll({
      filters: `slug==${slug}`,
      perPage: 1,
    });

    if (!result.data[0]) {
      return NextResponse.json(
        { success: false, error: ERR_COLLECTION_NOT_FOUND },
        { status: 404 },
      );
    }

    await repo.delete(result.data[0].id);

    return NextResponse.json({
      success: true,
      data: { slug },
    });
  } catch (error) {
    void normalizeError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERR_INTERNAL_SERVER_ERROR,
      },
      { status: 500 },
    );
  }
}
