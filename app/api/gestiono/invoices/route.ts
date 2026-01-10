import { NextRequest, NextResponse } from "next/server";
import {
  getPendingRecords,
  createInvoice,
  transformToGestionoFormat,
  validateGestionoConfig,
} from "@/src/lib/gestiono";
import type { GestionoApiError } from "@/src/types/gestiono";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {};

    if (searchParams.has("type")) params.type = searchParams.get("type");
    if (searchParams.has("divisionId"))
      params.divisionId = searchParams.get("divisionId");
    if (searchParams.has("minId")) params.minId = searchParams.get("minId");
    if (searchParams.has("page")) params.page = searchParams.get("page"); // ✅ Added page support
    if (searchParams.has("elementsPerPage"))
      params.elementsPerPage = searchParams.get("elementsPerPage");
    if (searchParams.has("status")) params.status = searchParams.get("status");
    if (searchParams.has("beneficiaryId"))
      params.beneficiaryId = searchParams.get("beneficiaryId");

    console.log("📋 Obteniendo facturas de Gestiono con params:", params);

    const invoices = await getPendingRecords(params);

    console.log("✅ Facturas obtenidas:", invoices);

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("❌ Error fetching invoices:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch invoices",
        details: error.message || error.msg,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = validateGestionoConfig();
    if (!config.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Gestiono no está configurado",
          details: config.errors,
          configured: false,
        },
        { status: 200 },
      );
    }

    const body = await request.json();

    console.log("📤 API Route: Creando factura en Gestiono...");

    const divisionId = body.divisionId || 183;
    console.log(`🏢 Usando división ID: ${divisionId}`);

    const gestionoPayload = transformToGestionoFormat(body, divisionId);

    console.log(
      "📦 Payload a enviar:",
      JSON.stringify(gestionoPayload, null, 2),
    );

    const result = await createInvoice(gestionoPayload);

    console.log("✅ Factura creada exitosamente:", result);

    return NextResponse.json({
      success: true,
      data: result,
      configured: true,
    });
  } catch (error: any) {
    console.error("❌ Error creando factura:", error);

    const gestionoError = error as GestionoApiError;

    return NextResponse.json(
      {
        success: false,
        error: gestionoError.error || "Error al crear factura",
        message: gestionoError.message || error.message,
        details: gestionoError.details,
        configured: true,
      },
      { status: gestionoError.statusCode || 500 },
    );
  }
}
