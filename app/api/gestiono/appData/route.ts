import { NextRequest, NextResponse } from "next/server";
import { getAppData } from "@/src/lib/gestiono";

export async function GET(request: NextRequest) {
  try {
    console.log("📍 Llamando a getAppData()...");

    const searchParams = request.nextUrl.searchParams;
    const queryData: Record<string, any> = {};

    searchParams.forEach((value, key) => {
      queryData[key] = value;
    });

    console.log("📊 Query data:", queryData);

    const appData = await getAppData(15, queryData);
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
