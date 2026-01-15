import { NextRequest, NextResponse } from "next/server";
import { getDivisions, postDivision, updateDivision } from "@/src/lib/gestiono";
import { GestionoDivisionPayload } from "@/src/types/gestiono";

export async function GET(request: NextRequest) {
  try {
    console.log("📍 Llamando a getDivisions()...");
    const divisions = await getDivisions();
    console.log("✅ Divisiones obtenidas:", divisions);
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const divisions = await postDivision(body as GestionoDivisionPayload);
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const divisions = await updateDivision(body as GestionoDivisionPayload);
    return NextResponse.json(divisions);
  } catch (error: unknown) {
    console.error("❌ Error fetching divisions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
