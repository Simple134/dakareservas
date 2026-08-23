import { NextRequest, NextResponse } from "next/server";
import {
  v2GetPendingRecords,
  createPendingRecord,
} from "@/src/lib/erp/endpoints";
import { ErpApiError, V2GetPendingRecordsQuery } from "@/src/types/erp";

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
        erpError: error,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // El payload ya viene con la forma correcta desde CreateInvoice.tsx.
    const result = await createPendingRecord(body);

    return NextResponse.json({
      success: true,
      data: result,
      configured: true,
    });
  } catch (error: unknown) {
    console.error("❌ Error creando factura:", error);

    const erpError = error as ErpApiError;

    return NextResponse.json(
      {
        success: false,
        error: erpError.error || "Error al crear factura",
        message:
          erpError.message ||
          (error instanceof Error ? error.message : "Error desconocido"),
        details: erpError.details,
        configured: true,
      },
      { status: erpError.statusCode || 500 },
    );
  }
}
