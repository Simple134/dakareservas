import { NextRequest, NextResponse } from "next/server";
import { getAppDataTypes } from "@/src/lib/erp";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appId =
      searchParams.get("appId") || searchParams.get("unique_id") || "";

    const appData = await getAppDataTypes(parseInt(appId));
    return NextResponse.json(appData);
  } catch (error: unknown) {
    console.error("❌ Error fetching appData:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch appData",
        details: error instanceof Error ? error.message : "Error desconocido",
        erpError: error,
      },
      { status: 500 },
    );
  }
}
