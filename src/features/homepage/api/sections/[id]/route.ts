/**
 * feat-homepage — GET/PATCH/DELETE /api/homepage/sections/[id]
 *
 * Homepage section retrieval, updates, and deletion.
 *
 * Consumer stub:
 * ```ts
 * export { sectionDetailGET as GET, sectionDetailPATCH as PATCH, sectionDetailDELETE as DELETE } from "@mohasinac/feat-homepage";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../../contracts";

const ERR_SECTION_ID_REQUIRED = "Section ID is required";
const ERR_DB_NOT_CONFIGURED = "Database provider not configured";
const ERR_INTERNAL_SERVER_ERROR = "Internal server error";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: ERR_SECTION_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("homepage_sections");
    const section = await repo.findById(id);

    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
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
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: ERR_SECTION_ID_REQUIRED },
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

    const repo = db.getRepository<Record<string, unknown>>("homepage_sections");
    const updated = await repo.update(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
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
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: ERR_SECTION_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("homepage_sections");
    await repo.delete(id);

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : ERR_INTERNAL_SERVER_ERROR,
      },
      { status: 500 },
    );
  }
}
