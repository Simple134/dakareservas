import { NextRequest, NextResponse } from "next/server";
import { payPendingRecord } from "@/src/lib/gestiono";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recordId = parseInt(id, 10);

    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const body = await request.json();

    const paymentData = {
      pendingRecordId: recordId,
      paymentMethod: body.paymentMethod,
      accountId: body.accountId,
      amount: body.amount,
      reference: body.reference,
      description: body.description,
      state: body.state || "COMPLETED",
      date: body.date,
      receivedFrom: body.receivedFrom,
      labels: body.labels,
      metadata: body.metadata,
    };

    const result = await payPendingRecord(paymentData);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error paying pending record:", error);
    return NextResponse.json(
      {
        error: "Failed to pay pending record",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
