import { NextRequest, NextResponse } from "next/server";
import { createFromPendingRecord } from "@/src/lib/gestiono";

/**
 * POST - Create a new record from an existing one (e.g., convert quote to order/invoice)
 * Body: { id: number, type: "ORDER" | "INVOICE" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.type) {
      return NextResponse.json(
        { error: "Record ID and type are required" },
        { status: 400 },
      );
    }

    const result = await createFromPendingRecord({
      id: body.id,
      type: body.type,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error creating record from source:", error);
    return NextResponse.json(
      {
        error: "Failed to create record from source",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
