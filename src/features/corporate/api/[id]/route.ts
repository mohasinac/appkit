/**
 * feat-corporate — GET/PATCH/DELETE /api/corporate-inquiries/[id]
 *
 * Corporate inquiry retrieval, updates, and deletion.
 *
 * Consumer stub:
 * ```ts
 * export { corporateInquiryDetailGET as GET, corporateInquiryDetailPATCH as PATCH, corporateInquiryDetailDELETE as DELETE } from "@mohasinac/feat-corporate";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";

const ERR_INQUIRY_ID_REQUIRED = "Inquiry ID is required";
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
        { success: false, error: ERR_INQUIRY_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>(
      "corporate_inquiries",
    );
    const inquiry = await repo.findById(id);

    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "Inquiry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: inquiry,
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
        { success: false, error: ERR_INQUIRY_ID_REQUIRED },
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

    const repo = db.getRepository<Record<string, unknown>>(
      "corporate_inquiries",
    );
    const updated = await repo.update(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Inquiry not found" },
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
        { success: false, error: ERR_INQUIRY_ID_REQUIRED },
        { status: 400 },
      );
    }

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: ERR_DB_NOT_CONFIGURED },
        { status: 503 },
      );

    const repo = db.getRepository<Record<string, unknown>>(
      "corporate_inquiries",
    );
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
