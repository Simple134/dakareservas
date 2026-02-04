import { NextRequest, NextResponse } from "next/server";
import {
  getBeneficiaryById,
  updateBeneficiary,
} from "@/src/lib/gestiono/endpoints";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Fetch beneficiary - the API should return contacts by default
    const beneficiary = await getBeneficiaryById(id);

    return NextResponse.json(beneficiary, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching beneficiary:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch beneficiary",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const beneficiaryId = parseInt(id);

    if (isNaN(beneficiaryId)) {
      return NextResponse.json(
        { error: "Invalid beneficiary ID" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Update beneficiary
    const result = await updateBeneficiary(body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error updating beneficiary:", error);
    return NextResponse.json(
      {
        error: "Failed to update beneficiary",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
