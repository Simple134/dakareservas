import { NextRequest, NextResponse } from "next/server";
import {
  createPendingRecordElement,
  updatePendingRecordElement,
  deletePendingRecordElement,
} from "@/src/lib/gestiono/endpoints";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.pendingRecordId) {
      return NextResponse.json(
        { error: "Pending record ID is required" },
        { status: 400 },
      );
    }

    const result = await createPendingRecordElement(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating element:", error);
    return NextResponse.json(
      {
        error: "Failed to create element",
        details: error.message,
      },
      { status: error.status || 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Element ID is required" },
        { status: 400 },
      );
    }

    const result = await updatePendingRecordElement(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating element:", error);
    return NextResponse.json(
      {
        error: "Failed to update element",
        details: error.message,
      },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Element ID is required" },
        { status: 400 },
      );
    }

    const result = await deletePendingRecordElement(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting element:", error);
    return NextResponse.json(
      {
        error: "Failed to delete element",
        details: error.message,
      },
      { status: error.status || 500 },
    );
  }
}
