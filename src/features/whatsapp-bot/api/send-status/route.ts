/**
 * feat-whatsapp-bot — POST /api/whatsapp/send-status
 *
 * WhatsApp message delivery status update.
 *
 * Consumer stub:
 * ```ts
 * export { whatsappSendStatusPOST as POST } from "@mohasinac/feat-whatsapp-bot";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "../../../../contracts";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    // Update message status in database
    const repo = db.getRepository<Record<string, unknown>>(
      "whatsapp_message_status",
    );
    const updated = await repo.create({
      ...body,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
