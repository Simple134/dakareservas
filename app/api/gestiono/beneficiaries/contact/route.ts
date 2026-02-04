import { NextRequest, NextResponse } from "next/server";
import {
  createContactData,
  updateContactData,
} from "@/src/lib/gestiono/endpoints";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.beneficiaryId) {
      return NextResponse.json(
        { error: "Missing required field: beneficiaryId" },
        { status: 400 },
      );
    }

    // Create contact for beneficiary
    const result = await createContactData(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating beneficiary contact:", error);
    return NextResponse.json(
      {
        error: "Failed to create beneficiary contact",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update an existing beneficiary contact
 * Body: { id: number, beneficiaryId: number, type: string, dataType: string, data: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.beneficiaryId) {
      return NextResponse.json(
        { error: "Missing required fields: id and beneficiaryId" },
        { status: 400 },
      );
    }

    // Update contact
    const result = await updateContactData(body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error updating beneficiary contact:", error);
    return NextResponse.json(
      {
        error: "Failed to update beneficiary contact",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
