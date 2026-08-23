import { NextRequest, NextResponse } from "next/server";
import { archiveDivision, getDivisionById } from "@/src/lib/erp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const divisionData = await getDivisionById(id);
    return NextResponse.json(divisionData);
  } catch (error: unknown) {
    console.error("❌ Error fetching division:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch division",
        details: error instanceof Error ? error.message : "Error desconocido",
        erpError: error,
      },
      { status: 500 },
    );
  }
}

/**
 * Borrado lógico de un proyecto.
 *
 * La UI lo hacía con un PATCH que mandaba `metadata: { disabled: true }`, y
 * `updateDivision` reemplaza la metadata completa: presupuesto, cliente,
 * estado, ubicación y partidas quedaban destruidos junto al borrado. Aquí solo
 * se sella `archived_at`, así que el proyecto se puede restaurar intacto.
 *
 * Las facturas del proyecto no se tocan: son documentos fiscales y su
 * historial tiene que sobrevivir al proyecto.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const division = await archiveDivision(id);
    return NextResponse.json({ success: true, division });
  } catch (error: unknown) {
    console.error("❌ Error archivando división:", error);
    return NextResponse.json(
      {
        error: "No se pudo eliminar el proyecto",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
