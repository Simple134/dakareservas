import { NextRequest, NextResponse } from "next/server";
import {
  v2GetPendingRecords,
  deletePendingRecord,
  createPendingRecord,
  transformToGestionoFormat,
} from "@/src/lib/gestiono/endpoints";
import {
  GestionoApiError,
  V2GetPendingRecordsQuery,
} from "@/src/types/gestiono";
import { validateGestionoConfig } from "@/src/lib/gestiono";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query: Record<string, unknown> = {};

    searchParams.forEach((value, key) => {
      if (value === "true") {
        query[key] = true;
      } else if (value === "false") {
        query[key] = false;
      } else if (
        !isNaN(Number(value)) &&
        !["month", "year", "taxId", "phone", "reference"].includes(key)
      ) {
        query[key] = Number(value);
      } else if (value.startsWith("[") || value.startsWith("{")) {
        try {
          query[key] = JSON.parse(value);
        } catch {
          query[key] = value;
        }
      } else {
        query[key] = value;
      }
    });

    console.log("📍 Calling v2GetPendingRecords with params:", query);

    const pendingRecords = await v2GetPendingRecords(
      query as unknown as V2GetPendingRecordsQuery,
    );
    console.log("✅ v2GetPendingRecords obtenidas:", pendingRecords);
    return NextResponse.json(pendingRecords);
  } catch (error: unknown) {
    console.error("❌ Error fetching v2GetPendingRecords:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch v2GetPendingRecords",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
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

    const result = await createPendingRecord(gestionoPayload);

    console.log("✅ Factura creada exitosamente:", result);

    return NextResponse.json({
      success: true,
      data: result,
      configured: true,
    });
  } catch (error: unknown) {
    console.error("❌ Error creando factura:", error);

    const gestionoError = error as GestionoApiError;

    return NextResponse.json(
      {
        success: false,
        error: gestionoError.error || "Error al crear factura",
        message:
          gestionoError.message || error instanceof Error
            ? error
            : "Error desconocido",
        details: gestionoError.details,
        configured: true,
      },
      { status: gestionoError.statusCode || 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recordId = searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json(
        { error: "recordId is required" },
        { status: 400 },
      );
    }

    console.log("📍 Deleting pending record with ID:", recordId);

    const result = await deletePendingRecord(Number(recordId));
    console.log("✅ Pending record deleted:", result);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("❌ Error deleting pending record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete pending record",
        details: error instanceof Error ? error.message : "Error desconocido",
        gestionoError: error,
      },
      { status: 500 },
    );
  }
}
