import { NextRequest, NextResponse } from "next/server";
import { assignFiscalNumeral } from "@/src/lib/data/records";
import { requireAdmin } from "@/src/lib/erp/requireAdmin";
import type { ErpApiError } from "@/src/types/erp";

/** Asigna el siguiente NCF B01 a una factura de venta que no tiene. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rechazo = await requireAdmin(request);
  if (rechazo) return rechazo;

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Factura inválida" }, { status: 400 });
  }

  try {
    return NextResponse.json({ taxId: await assignFiscalNumeral(id) });
  } catch (error: unknown) {
    console.error("Error asignando NCF:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: (error as ErpApiError).statusCode || 500 },
    );
  }
}
