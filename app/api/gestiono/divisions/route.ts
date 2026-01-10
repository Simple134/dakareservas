import { NextRequest, NextResponse } from "next/server";
import { getDivisions, postDivision } from "@/src/lib/gestiono";
import { GestionoDivisionPayload } from "@/src/types/gestiono";

export async function GET(request: NextRequest) {
  try {
    console.log("📍 Llamando a getDivisions()...");
    const divisions = await getDivisions();
    console.log("✅ Divisiones obtenidas:", divisions);
    return NextResponse.json(divisions);
  } catch (error: any) {
    console.error("❌ Error fetching divisions:", error);
    console.error("📋 Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      msg: error.msg,
      details: error.details,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error.message || error.msg,
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
  } catch (error: any) {
    console.error("❌ Error fetching divisions:", error);
    console.error("📋 Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      msg: error.msg,
      details: error.details,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch divisions",
        details: error.message || error.msg,
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
