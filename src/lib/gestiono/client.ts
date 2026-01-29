import crypto from "crypto";
import type { GestionoApiError } from "@/src/types/gestiono";

const GESTIONO_BASE_URL = process.env.NEXT_PUBLIC_GESTIONO_API_URL || "";
const GESTIONO_API_PUBLIC_KEY = process.env.GESTIONO_API_PUBLIC_KEY || "";
const GESTIONO_API_PRIVATE_KEY = process.env.GESTIONO_API_PRIVATE_KEY || "";
const GESTIONO_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_GESTIONO_ORGANIZATION_ID || "";

function generateSignature(privateKey: string, data: any): string {
  const dataString = JSON.stringify(data);
  return crypto
    .createHmac("sha256", privateKey)
    .update(dataString)
    .digest("hex");
}

export interface GestionoRequestInit extends RequestInit {
  query?: Record<string, any>;
}

export async function gestionoRequest<T>(
  endpoint: string,
  options: GestionoRequestInit = {},
): Promise<T> {
  const timestamp = Date.now();
  const recvWindow = 60000;
  const method = options.method?.toUpperCase() || "GET";

  // Parse optios body
  const body = options.body ? JSON.parse(options.body as string) : {};

  const [path, queryString] = endpoint.split("?");
  const existingParams = new URLSearchParams(queryString || "");
  const queryParamsObj: Record<string, any> = {};
  existingParams.forEach((value, key) => {
    queryParamsObj[key] = value;
  });

  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParamsObj[key] = value;
      }
    });
  }

  // Prepare data to sign and final payload
  let dataToSign: any;
  let finalUrl = `${GESTIONO_BASE_URL}${path}`;
  let finalBody = options.body;

  if (method === "GET") {
    // Only GET uses query params without body
    const allParams: Record<string, string> = {};

    Object.entries(queryParamsObj).forEach(([key, value]) => {
      if (typeof value === "object") {
        allParams[key] = JSON.stringify(value);
      } else {
        allParams[key] = String(value);
      }
    });

    allParams["timestamp"] = String(timestamp);
    allParams["recvWindow"] = String(recvWindow);

    dataToSign = allParams;

    const params = new URLSearchParams(allParams);
    finalUrl = `${GESTIONO_BASE_URL}${path}?${params.toString()}`;
  } else {
    // POST, PATCH, DELETE - all use body
    dataToSign = {
      ...queryParamsObj,
      ...body,
      timestamp,
      recvWindow,
    };

    const newBody = {
      ...body,
      timestamp,
      recvWindow,
    };
    finalBody = JSON.stringify(newBody);
  }

  const signature = generateSignature(GESTIONO_API_PRIVATE_KEY, dataToSign);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Bitnation-Apikey": GESTIONO_API_PUBLIC_KEY,
    "X-Bitnation-Organization-Id": GESTIONO_ORGANIZATION_ID,
    Authorization: signature,
  };

  try {
    const response = await fetch(finalUrl, {
      ...options,
      body: finalBody,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "API Error",
        message: response.statusText,
        statusCode: response.status,
      }));

      throw {
        ...errorData,
        statusCode: response.status,
      } as GestionoApiError;
    }

    return await response.json();
  } catch (error) {
    console.error("Gestiono API Error:", error);
    throw error;
  }
}

export function validateGestionoConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!GESTIONO_API_PUBLIC_KEY)
    errors.push("GESTIONO_API_PUBLIC_KEY no está configurado");
  if (!GESTIONO_API_PRIVATE_KEY)
    errors.push("GESTIONO_API_PRIVATE_KEY no está configurado");
  if (!GESTIONO_ORGANIZATION_ID)
    errors.push("GESTIONO_ORGANIZATION_ID no está configurado");

  return {
    valid: errors.length === 0,
    errors,
  };
}
