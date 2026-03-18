import { NextRequest, NextResponse } from "next/server";
import {
  v2GetPendingRecords,
  createPendingRecord,
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
      } else if (value === "") {
        query[key] = undefined;
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

    const pendingRecords = await v2GetPendingRecords(
      query as unknown as V2GetPendingRecordsQuery,
    );
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

    // El payload ya viene en el formato correcto de Gestiono desde CreateInvoice.tsx
    const result = await createPendingRecord(body);

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
          gestionoError.message ||
          (error instanceof Error ? error.message : "Error desconocido"),
        details: gestionoError.details,
        configured: true,
      },
      { status: gestionoError.statusCode || 500 },
    );
  }
}
