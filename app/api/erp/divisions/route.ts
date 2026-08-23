import { NextRequest, NextResponse } from "next/server";
import { getDivisions, postDivision, updateDivision } from "@/src/lib/erp";
import { DivisionPayload } from "@/src/types/erp";

export async function GET(request: NextRequest) {
  try {
    // Las divisiones archivadas se omiten salvo que se pidan explícitamente.
    const includeArchived =
      request.nextUrl.searchParams.get("includeArchived") === "true";
    const divisions = await getDivisions({ includeArchived });
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        erpError: error,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const divisions = await postDivision(body as DivisionPayload);
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        erpError: error,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const divisions = await updateDivision(body as DivisionPayload);
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        erpError: error,
      },
      { status: 500 },
    );
  }
}
