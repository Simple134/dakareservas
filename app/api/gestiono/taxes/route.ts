import { NextResponse } from "next/server";
import { getTaxesList } from "@/src/lib/gestiono";

export async function GET() {
  try {
    const taxes = await getTaxesList();
    return NextResponse.json(taxes);
  } catch (error: unknown) {
    console.error("Error fetching taxes list:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch taxes",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
