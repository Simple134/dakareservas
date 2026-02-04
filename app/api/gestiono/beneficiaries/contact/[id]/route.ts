import { NextRequest, NextResponse } from "next/server";
import { deleteContactData } from "@/src/lib/gestiono/endpoints";

/**
 * DELETE - Delete a beneficiary contact by ID
 * URL: /api/gestiono/beneficiaries/contact/[id]
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

    // Delete contact
    const result = await deleteContactData(contactId);

    return NextResponse.json(result, { status: 200 });
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
