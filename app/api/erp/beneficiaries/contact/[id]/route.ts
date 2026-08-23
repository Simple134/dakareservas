import { NextRequest, NextResponse } from "next/server";
import { deleteContactData } from "@/src/lib/erp/endpoints";

/**
 * DELETE - Delete a beneficiary contact by ID
 * URL: /api/erp/beneficiaries/contact/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: "Invalid contact ID" },
        { status: 400 },
      );
    }

    // `deleteContactData` no devuelve nada, y `NextResponse.json(undefined)`
    // lanza «Value is not JSON serializable»: el contacto se borraba de la
    // base pero la UI recibía un 500 y mostraba «Error al eliminar».
    await deleteContactData(contactId);

    return NextResponse.json({ success: true, id: contactId }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting beneficiary contact:", error);
    return NextResponse.json(
      {
        error: "Failed to delete beneficiary contact",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
