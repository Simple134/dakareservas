// Traslada los adjuntos de los documentos (comprobantes de pago) del S3 de
// Gestiono a Supabase Storage y reescribe las claves en metadata.files.
//
// Los historicos guardaron en `s3Key` la URL COMPLETA de Gestiono en vez de una
// clave, asi que hay que extraer el parametro `key` para descargar y sustituir
// el valor por la ruta dentro del bucket.
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const BUCKET = "erp-files";
const ORG = process.env.NEXT_PUBLIC_GESTIONO_ORGANIZATION_ID;

// La descarga usa la misma firma HMAC que el resto: se construye a mano porque
// el endpoint devuelve binario, no JSON.
function firmar(params) {
  const todos = {
    ...params,
    timestamp: String(Date.now()),
    recvWindow: "60000",
  };
  const sig = crypto
    .createHmac("sha256", process.env.GESTIONO_API_PRIVATE_KEY)
    .update(JSON.stringify(todos))
    .digest("hex");
  return {
    url: `${process.env.NEXT_PUBLIC_GESTIONO_API_URL}/v1/files/object/public?${new URLSearchParams(todos)}`,
    headers: {
      "X-Bitnation-Apikey": process.env.GESTIONO_API_PUBLIC_KEY,
      "X-Bitnation-Organization-Id": ORG,
      Authorization: sig,
    },
  };
}

const claveDe = (s3Key) => {
  if (!s3Key) return null;
  if (!s3Key.startsWith("http")) return s3Key;
  try {
    return new URL(s3Key).searchParams.get("key");
  } catch {
    return null;
  }
};

// Los adjuntos estan en metadata.files de los documentos y de los pagos.
const objetivos = [];
for (const tabla of ["pending_records", "payment_records"]) {
  const { data, error } = await db.from(tabla).select("id, metadata");
  if (error) {
    console.error(`${tabla}: ${error.message}`);
    process.exit(1);
  }
  for (const fila of data) {
    const files = fila.metadata?.files;
    if (Array.isArray(files) && files.length)
      objetivos.push({ tabla, ...fila, files });
  }
}
console.log(`documentos/pagos con adjuntos: ${objetivos.length}`);

let subidos = 0,
  yaMigrados = 0,
  fallidos = 0;
for (const o of objetivos) {
  const nuevos = [];
  for (const f of o.files) {
    if (f.s3Key && !f.s3Key.startsWith("http")) {
      nuevos.push(f);
      yaMigrados++;
      continue;
    }
    const key = claveDe(f.s3Key);
    if (!key) {
      console.log(`  ${o.tabla}#${o.id}: s3Key ilegible`);
      nuevos.push(f);
      fallidos++;
      continue;
    }

    try {
      const { url, headers } = firmar({ key, organizationId: ORG });
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const limpio = String(f.fileName || key).replace(/[^\w.\-]+/g, "_");
      const destino = `migrados/${o.tabla}/${o.id}/${key}-${limpio}`;

      const { error } = await db.storage.from(BUCKET).upload(destino, buf, {
        contentType:
          res.headers.get("content-type") || "application/octet-stream",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      // Se conserva la URL original para poder auditar la procedencia.
      nuevos.push({ ...f, s3Key: destino, origenGestiono: f.s3Key });
      subidos++;
    } catch (e) {
      console.log(`  ${o.tabla}#${o.id} (${f.fileName}): ${e.message}`);
      nuevos.push(f);
      fallidos++;
    }
  }

  const { error } = await db
    .from(o.tabla)
    .update({ metadata: { ...o.metadata, files: nuevos } })
    .eq("id", o.id);
  if (error) {
    console.error(`  actualizar ${o.tabla}#${o.id}: ${error.message}`);
    fallidos++;
  }
}

console.log(
  `\nsubidos: ${subidos}, ya migrados: ${yaMigrados}, fallidos: ${fallidos}`,
);
process.exit(fallidos ? 1 : 0);
