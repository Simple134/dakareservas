import { NextRequest, NextResponse } from "next/server";
import { getBeneficiaries, addBeneficiary } from "@/src/lib/gestiono";
import type {
  BeneficiaryQueryParams,
  CreateBeneficiaryBody,
} from "@/src/types/gestiono";

export async function POST(request: NextRequest) {
  try {
    const body: CreateBeneficiaryBody = await request.json();
    const beneficiaries = await addBeneficiary(body as CreateBeneficiaryBody);
    return NextResponse.json(beneficiaries);
  } catch (error: any) {
    console.error("Error adding beneficiary:", error);
    return NextResponse.json(
      { error: "Failed to add beneficiary", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Build params object from query string
    const params: BeneficiaryQueryParams = {};

    if (searchParams.has("search")) params.search = searchParams.get("search")!;
    if (searchParams.has("type")) params.type = searchParams.get("type") as any;
    if (searchParams.has("minId")) params.minId = searchParams.get("minId")!;
    if (searchParams.has("elementsPerPage"))
      params.elementsPerPage = searchParams.get("elementsPerPage")!;
    if (searchParams.has("withContacts"))
      params.withContacts = searchParams.get("withContacts") as
        | "true"
        | "false";
    if (searchParams.has("withTaxData"))
      params.withTaxData = searchParams.get("withTaxData") as "true" | "false";

    const beneficiaries = await getBeneficiaries(params);

    return NextResponse.json(beneficiaries);
  } catch (error: any) {
    console.error("Error fetching beneficiaries:", error);
    return NextResponse.json(
      { error: "Failed to fetch beneficiaries", details: error.message },
      { status: 500 },
    );
  }
}
