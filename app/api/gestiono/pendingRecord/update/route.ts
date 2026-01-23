import { NextRequest, NextResponse } from "next/server";
import { updatePendingRecord } from "@/src/lib/gestiono";

/**
 * PATCH - Update a pending record (e.g., convert type)
 * Body: { id: number, type?: "QUOTE" | "ORDER" | "INVOICE", ... }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "Record ID is required" },
                { status: 400 }
            );
        }

        const result = await updatePendingRecord(body);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("❌ Error updating pending record:", error);
        return NextResponse.json(
            {
                error: "Failed to update pending record",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
