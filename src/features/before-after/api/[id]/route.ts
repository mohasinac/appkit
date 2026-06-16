/**
 * feat-before-after — GET/PATCH/DELETE /api/before-after/[id]
 *
 * Before/After content retrieval, updates, and deletion.
 *
 * Consumer stub:
 * ```ts
 * export { beforeAfterDetailGET as GET, beforeAfterDetailPATCH as PATCH, beforeAfterDetailDELETE as DELETE } from "@mohasinac/feat-before-after";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";
import { normalizeError } from "../../../../errors/normalize";
import type { JsonValue } from "../../../../schemas/types";

const ERR_DB_NOT_CONFIGURED = "DB not configured";
const ERR_INTERNAL_SERVER_ERROR = "Internal server error";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID required" },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, JsonValue>>("before_after");
    const item = await repo.findById(id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
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
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID required" },
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

    const repo = db.getRepository<Record<string, JsonValue>>("before_after");
    const updated = await repo.update(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 },
      );
    }

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
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID required" },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, JsonValue>>("before_after");
    await repo.delete(id);

    return NextResponse.json({
      success: true,
      data: { id },
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
