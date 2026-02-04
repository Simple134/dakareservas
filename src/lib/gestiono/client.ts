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
  formData?: FormData;
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

function formDataToSignObject(formData: FormData) {
  const obj: Record<string, string> = {};

  formData.forEach((value, key) => {
    if (typeof value === "string") {
      obj[key] = value;
    }
  });

  return obj;
}

export async function gestionoFormRequest<T>(
  endpoint: string,
  options: GestionoRequestInit = {},
): Promise<T> {
  const timestamp = Date.now();
  const recvWindow = 60000;
  const method = options.method?.toUpperCase() || "GET";
  const isFormData = options.body instanceof FormData;

  const [path, queryString] = endpoint.split("?");
  const queryParamsObj: Record<string, any> = {};

  new URLSearchParams(queryString || "").forEach((v, k) => {
    queryParamsObj[k] = v;
  });

  let finalUrl = `${GESTIONO_BASE_URL}${path}`;
  let finalBody: BodyInit | null = null;
  let dataToSign: Record<string, any> = {};

  if (method === "GET") {
    const params = {
      ...queryParamsObj,
      timestamp,
      recvWindow,
    };

    dataToSign = params;
    finalUrl += `?${new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString()}`;
  } else {
    if (isFormData) {
      const formData = options.body as FormData;

      formData.append("timestamp", String(timestamp));
      formData.append("recvWindow", String(recvWindow));

      finalBody = formData;

      dataToSign = {
        ...queryParamsObj,
        ...formDataToSignObject(formData),
      };
    } else {
      const jsonBody = options.body ? JSON.parse(options.body as string) : {};

      const newBody = {
        ...jsonBody,
        timestamp,
        recvWindow,
      };

      finalBody = JSON.stringify(newBody);

      dataToSign = {
        ...queryParamsObj,
        ...jsonBody,
        timestamp,
        recvWindow,
      };
    }
  }

  const signature = generateSignature(GESTIONO_API_PRIVATE_KEY, dataToSign);

  const headers: HeadersInit = {
    "X-Bitnation-Apikey": GESTIONO_API_PUBLIC_KEY,
    "X-Bitnation-Organization-Id": GESTIONO_ORGANIZATION_ID,
    Authorization: signature,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(finalUrl, {
    ...options,
    body: finalBody,
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw err ?? { statusCode: response.status };
  }

  return response.json();
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
