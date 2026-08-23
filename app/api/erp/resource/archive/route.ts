import { NextRequest, NextResponse } from "next/server";
import { archiveResource } from "@/src/lib/erp/endpoints";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Resource ID is required" },
        { status: 400 },
      );
    }

    try {
      const result = await archiveResource(Number(id));
      return NextResponse.json(result);
    } catch (parseError) {
      if (
        parseError instanceof SyntaxError &&
        parseError.message.includes("JSON")
      ) {
        return NextResponse.json({ success: true });
      }
      throw parseError;
    }
  } catch (error: unknown) {
    console.error("❌ Error archiving resource:", error);
    return NextResponse.json(
      {
        error: "Failed to archive resource",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
