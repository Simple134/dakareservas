import { NextRequest, NextResponse } from "next/server";
import { getDivisionById } from "@/src/lib/gestiono";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    console.log(`📍 Fetching division ${id}...`);
    const divisionData = await getDivisionById(id);
    console.log("✅ Division fetched:", divisionData);
    return NextResponse.json(divisionData);
  } catch (error: any) {
    console.error("❌ Error fetching division:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch division",
        details: error.message || "Unknown error",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
