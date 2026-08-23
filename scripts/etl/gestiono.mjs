// Cliente de lectura para el ETL. Replica EXACTAMENTE el firmado de
// src/lib/gestiono/client.ts (gestionoRequest). Ojo: para GET todos los
// valores se serializan a string ANTES de firmar -- incluidos timestamp y
// recvWindow. Firmarlos como numeros produce 401 Invalid signature.
import crypto from "node:crypto";
import fs from "node:fs";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const BASE = process.env.NEXT_PUBLIC_GESTIONO_API_URL || "";
const PUBLIC_KEY = process.env.GESTIONO_API_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.GESTIONO_API_PRIVATE_KEY || "";
const ORG = process.env.NEXT_PUBLIC_GESTIONO_ORGANIZATION_ID || "";

export async function get(path, query = {}) {
  const allParams = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    allParams[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  allParams.timestamp = String(Date.now());
  allParams.recvWindow = String(60000);

  const signature = crypto
    .createHmac("sha256", PRIVATE_KEY)
    .update(JSON.stringify(allParams))
    .digest("hex");

  const url = `${BASE}${path}?${new URLSearchParams(allParams)}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Bitnation-Apikey": PUBLIC_KEY,
      "X-Bitnation-Organization-Id": ORG,
      Authorization: signature,
    },
  });
  if (!res.ok) {
    throw new Error(
      `${res.status} ${path} :: ${(await res.text()).slice(0, 300)}`,
    );
  }
  return res.json();
}
