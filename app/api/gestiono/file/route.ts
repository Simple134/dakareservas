import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const GESTIONO_BASE_URL = process.env.NEXT_PUBLIC_GESTIONO_API_URL || "";
const GESTIONO_API_PUBLIC_KEY = process.env.GESTIONO_API_PUBLIC_KEY || "";
const GESTIONO_API_PRIVATE_KEY = process.env.GESTIONO_API_PRIVATE_KEY || "";
const GESTIONO_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_GESTIONO_ORGANIZATION_ID || "";

function generateSignature(
  privateKey: string,
  data: Record<string, string>,
): string {
  return crypto
    .createHmac("sha256", privateKey)
    .update(JSON.stringify(data))
    .digest("hex");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const organizationId =
    searchParams.get("organizationId") || GESTIONO_ORGANIZATION_ID;

  if (!key) {
    return NextResponse.json(
      { error: "Missing key parameter" },
      { status: 400 },
    );
  }

  const timestamp = Date.now();
  const recvWindow = 60000;

  const params: Record<string, string> = {
    key,
    organizationId,
    timestamp: String(timestamp),
    recvWindow: String(recvWindow),
  };

  const signature = generateSignature(GESTIONO_API_PRIVATE_KEY, params);
  const qs = new URLSearchParams(params).toString();
  const url = `${GESTIONO_BASE_URL}/v1/files/object/public?${qs}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Bitnation-Apikey": GESTIONO_API_PUBLIC_KEY,
        "X-Bitnation-Organization-Id": organizationId,
        Authorization: signature,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: response.status },
      );
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error proxying file:", error);
    return NextResponse.json({ error: "Error fetching file" }, { status: 500 });
  }
}
