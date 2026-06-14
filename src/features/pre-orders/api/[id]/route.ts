/**
 * feat-pre-orders — GET/PATCH/DELETE /api/pre-orders/[id]
 *
 * Pre-order item retrieval, updates, and deletion.
 *
 * Consumer stub:
 * ```ts
 * export { preOrderDetailGET as GET, preOrderDetailPATCH as PATCH, preOrderDetailDELETE as DELETE } from "@mohasinac/feat-pre-orders";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";
import { normalizeError } from "../../../../errors/normalize";

const ERR_PRE_ORDER_ID_REQUIRED = "Pre-order ID is required";
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
        { success: false, error: ERR_PRE_ORDER_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("pre_orders");
    const preOrder = await repo.findById(id);

    if (!preOrder) {
      return NextResponse.json(
        { success: false, error: "Pre-order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: preOrder,
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
        { success: false, error: ERR_PRE_ORDER_ID_REQUIRED },
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

    const repo = db.getRepository<Record<string, unknown>>("pre_orders");
    const updated = await repo.update(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pre-order not found" },
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
        { success: false, error: ERR_PRE_ORDER_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>("pre_orders");
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
