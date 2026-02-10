import { NextRequest, NextResponse } from "next/server";
import {
  addPendingRecordElementTaxes,
  removePendingRecordElementTaxes,
} from "@/src/lib/gestiono";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.pendingRecordElementId || !body.taxRateId) {
      return NextResponse.json(
        { error: "pendingRecordElementId and taxRateId are required" },
        { status: 400 },
      );
    }

    const result = await addPendingRecordElementTaxes({
      pendingRecordElementId: body.pendingRecordElementId,
      taxRateId: body.taxRateId,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error adding element taxes:", error);
    return NextResponse.json(
      {
        error: "Failed to add element taxes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.pendingRecordElementId || !body.taxRateId) {
      return NextResponse.json(
        { error: "pendingRecordElementId and taxRateId are required" },
        { status: 400 },
      );
    }

    const result = await removePendingRecordElementTaxes({
      pendingRecordElementId: body.pendingRecordElementId,
      taxRateId: body.taxRateId,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error removing element taxes:", error);
    return NextResponse.json(
      {
        error: "Failed to remove element taxes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
