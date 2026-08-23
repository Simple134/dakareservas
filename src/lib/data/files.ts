/**
 * Adjuntos sobre Supabase Storage, en sustitución de POST /v1/files y del
 * proxy de archivos del sistema anterior.
 */
import { supabaseAdmin } from "@/src/lib/supabase/admin";

const BUCKET = "erp-files";

/**
 * Tipos que se pueden servir EN LÍNEA sin riesgo.
 *
 * La UI previsualiza los comprobantes en <img> y en <iframe>, y además ofrece
 * un enlace directo con target="_blank". Ese enlace es lo que hace explotable
 * un adjunto HTML o SVG: se renderiza como documento en nuestro propio origen y
 * ejecuta script con la sesión del administrador. El SVG queda fuera de la
 * lista a propósito, aunque en un <img> sea inofensivo.
 */
const TIPOS_EN_LINEA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

/**
 * Decide con qué cabeceras se sirve un adjunto. Lo que no esté en la lista
 * blanca se degrada a binario opaco y se fuerza la descarga, así que un
 * adjunto malicioso nunca llega a ejecutarse en el origen.
 */
export function politicaDeEntrega(
  contentTypeGuardado: string | null | undefined,
  nombre: string,
): {
  contentType: string;
  disposition: string;
  extras: Record<string, string>;
} {
  const tipo = (contentTypeGuardado ?? "").split(";")[0].trim().toLowerCase();
  const seguro = TIPOS_EN_LINEA.has(tipo);
  const nombreLimpio = nombre.replace(/[^\w.\-]+/g, "_") || "adjunto";

  if (!seguro) {
    return {
      contentType: "application/octet-stream",
      disposition: `attachment; filename="${nombreLimpio}"`,
      extras: { "X-Content-Type-Options": "nosniff" },
    };
  }

  return {
    contentType: tipo,
    disposition: `inline; filename="${nombreLimpio}"`,
    extras: {
      "X-Content-Type-Options": "nosniff",
      // El visor de PDF del navegador necesita ejecutarse, así que la CSP
      // restrictiva se aplica solo a las imágenes.
      ...(tipo === "application/pdf"
        ? {}
        : { "Content-Security-Policy": "default-src 'none'; sandbox" }),
    },
  };
}

/**
 * Los adjuntos históricos se guardaron con `s3Key` conteniendo la URL completa
 * del sistema anterior en vez de una clave. Al servirlos hay que distinguir esos de las
 * claves nuevas, que son rutas dentro del bucket.
 */
export const esClaveHeredada = (clave: string): boolean =>
  clave.startsWith("http://") || clave.startsWith("https://");

export async function uploadFile({
  file,
  path = "/",
}: {
  file: File;
  createFolder?: "true";
  convertTo?: "mp3" | "ogg";
  path?: string;
}): Promise<{ file: { id: number; url: string; public: string } }> {
  const limpio = file.name.replace(/[^\w.\-]+/g, "_");
  const carpeta = path.replace(/^\/+|\/+$/g, "");
  // El prefijo aleatorio evita que dos comprobantes con el mismo nombre se
  // sobrescriban.
  const clave = `${carpeta ? carpeta + "/" : ""}${crypto.randomUUID()}-${limpio}`;

  // `file.type` lo elige quien sube, así que no se persiste tal cual: si no
  // está en la lista blanca se guarda como binario opaco. Es la primera de las
  // dos barreras; la segunda está al servir.
  const tipoDeclarado = (file.type ?? "").split(";")[0].trim().toLowerCase();
  const contentType = TIPOS_EN_LINEA.has(tipoDeclarado)
    ? tipoDeclarado
    : "application/octet-stream";

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(clave, file, { contentType, upsert: false });
  if (error) {
    throw Object.assign(new Error(`subir archivo: ${error.message}`), {
      statusCode: 500,
      message: error.message,
    });
  }

  // El sistema anterior devolvía un id numérico. Aquí la clave es la identidad, así que se
  // devuelve en `url`/`public`, que es lo que la UI guarda como s3Key.
  return { file: { id: 0, url: clave, public: clave } };
}

/** Descarga un adjunto. Devuelve null si la clave no existe. */
export async function downloadFile(
  clave: string,
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(clave);
  if (error || !data) return null;
  return {
    body: await data.arrayBuffer(),
    contentType: data.type || "application/octet-stream",
  };
}

export async function deleteFile(clave: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([clave]);
  if (error) throw new Error(`eliminar archivo: ${error.message}`);
}
