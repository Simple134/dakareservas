import { NextRequest, NextResponse } from "next/server";
import { getAppDataTypes } from "@/src/lib/gestiono";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appId =
      searchParams.get("appId") || searchParams.get("unique_id") || "";

    console.log(`📍 Llamando a getAppDataTypes(${appId})...`);
    const appData = await getAppDataTypes(parseInt(appId));
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
