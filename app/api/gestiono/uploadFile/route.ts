import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/src/lib/gestiono/endpoints";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo válido" },
        { status: 400 },
      );
    }

    const response = await uploadFile({
      file,
      createFolder: "true",
      path: "/daka_system/payments",
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 },
    );
  }
}
