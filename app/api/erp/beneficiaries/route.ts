import { NextRequest, NextResponse } from "next/server";
import { getBeneficiaries, addBeneficiary } from "@/src/lib/erp";
import type {
  BeneficiaryQueryParams,
  CreateBeneficiaryBody,
} from "@/src/types/erp";

export async function POST(request: NextRequest) {
  try {
    const body: CreateBeneficiaryBody = await request.json();
    const beneficiaries = await addBeneficiary(body as CreateBeneficiaryBody);
    return NextResponse.json(beneficiaries);
  } catch (error: unknown) {
    console.error("Error adding beneficiary:", error);

    // Error del ERP con la propiedad 'msg'
    if (error && typeof error === "object" && "msg" in error) {
      const erpError = error as { msg: string; statusCode?: number };
      return NextResponse.json(
        { msg: erpError.msg },
        { status: erpError.statusCode || 500 },
      );
    }

    // Fallback for other errors
    return NextResponse.json(
      { msg: error instanceof Error ? error.message : "Error desconocido" },
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
    if (searchParams.has("type"))
      params.type = searchParams.get("type") as BeneficiaryQueryParams["type"];
    if (searchParams.has("minId")) params.minId = searchParams.get("minId")!;
    if (searchParams.has("elementsPerPage"))
      params.elementsPerPage = searchParams.get("elementsPerPage")!;
    if (searchParams.has("withContacts"))
      params.withContacts = searchParams.get("withContacts") as
        "true" | "false";
    if (searchParams.has("withTaxData"))
      params.withTaxData = searchParams.get("withTaxData") as "true" | "false";

    const beneficiaries = await getBeneficiaries(params);

    return NextResponse.json(beneficiaries);
  } catch (error: unknown) {
    console.error("Error fetching beneficiaries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch beneficiaries",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
