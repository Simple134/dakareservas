import { NextRequest, NextResponse } from "next/server";
import { archiveBeneficiary } from "@/src/lib/gestiono";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "beneficiary id is required" },
        { status: 400 },
      );
    }
    const result = await archiveBeneficiary(Number(id));
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("❌ Error archiving beneficiary:", error);
    return NextResponse.json(
      {
        error: "Failed to archive beneficiary",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
