import { NextRequest, NextResponse } from "next/server";
import { getAppData, updateAppData } from "@/src/lib/gestiono";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryData: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryData[key] = value;
    });

    const appId =
      searchParams.get("appId") || searchParams.get("unique_id") || "";

    const appData = await getAppData(parseInt(appId), queryData);
    return NextResponse.json(appData);
  } catch (error: unknown) {
    console.error("❌ Error fetching appData:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch appData",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, appId, type, data, strategy } = body as {
      id: number;
      appId: number;
      type: string;
      data: Record<string, unknown>;
      strategy?: "merge" | "replace";
    };

    if (!id || !appId || !type || !data) {
      return NextResponse.json(
        { error: "id, appId, type and data are required" },
        { status: 400 },
      );
    }

    const updated = await updateAppData({ id, appId, type, data, strategy });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("❌ Error updating appData:", error);
    return NextResponse.json(
      {
        error: "Failed to update appData",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
