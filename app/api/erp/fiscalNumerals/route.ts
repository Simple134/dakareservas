import { NextRequest, NextResponse } from "next/server";
import { getFiscalNumerals, updateFiscalNumeral } from "@/src/lib/erp";
import { requireAdmin } from "@/src/lib/erp/requireAdmin";
import type { ErpApiError, FiscalNumeralType } from "@/src/types/erp";

const TIPOS: readonly FiscalNumeralType[] = [
  "TAX_CREDIT",
  "CONSUMER",
  "CREDIT_NOTE",
  "SPECIAL_REGIME",
  "GOVERNMENT",
  "TAX_CREDIT_ELECTRONIC",
];

export async function GET(request: NextRequest) {
  const rechazo = await requireAdmin(request);
  if (rechazo) return rechazo;
  try {
    return NextResponse.json(await getFiscalNumerals());
  } catch (error: unknown) {
    console.error("Error listando comprobantes fiscales:", error);
    return NextResponse.json(
      {
        error: "No se pudieron cargar los comprobantes fiscales",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const rechazo = await requireAdmin(request);
  if (rechazo) return rechazo;
  try {
    const body = await request.json();
    if (!TIPOS.includes(body?.type)) {
      return NextResponse.json(
        { error: "Tipo de comprobante desconocido" },
        { status: 400 },
      );
    }
    const numeral = await updateFiscalNumeral({
      type: body.type as FiscalNumeralType,
      nextValue: Number(body.nextValue),
      maxValue:
        body.maxValue === null || body.maxValue === ""
          ? null
          : Number(body.maxValue),
    });
    return NextResponse.json(numeral);
  } catch (error: unknown) {
    console.error("Error guardando comprobante fiscal:", error);
    const erpError = error as ErpApiError;
    return NextResponse.json(
      {
        error: "No se pudo guardar la secuencia",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: erpError.statusCode || 500 },
    );
  }
}
