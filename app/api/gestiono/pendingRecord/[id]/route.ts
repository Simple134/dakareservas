import { NextRequest, NextResponse } from "next/server";
import { archivePendingRecord, deletePendingRecord } from "@/src/lib/gestiono";

/**
 * PATCH - Archive a pending record (soft delete)
 * Sets metadata.disabled = true
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recordId = parseInt(id, 10);

    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const result = await archivePendingRecord(recordId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error archiving pending record:", error);
    return NextResponse.json(
      {
        error: "Failed to archive pending record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Permanently delete a pending record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recordId = parseInt(id, 10);

    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const result = await deletePendingRecord(recordId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error deleting pending record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete pending record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
