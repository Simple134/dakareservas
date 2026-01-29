import { NextRequest, NextResponse } from "next/server";
import { getAppDataTypes } from "@/src/lib/gestiono";

export async function GET(request: NextRequest) {
  try {
    console.log("📍 Llamando a getAppData()...");
    const appData = await getAppDataTypes(15);
    console.log("✅ AppData obtenida:", appData);
    return NextResponse.json(appData);
  } catch (error: unknown) {
    console.error("❌ Error fetching appData:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch appData",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
