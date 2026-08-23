import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/src/lib/erp";
import { politicaDeEntrega } from "@/src/lib/data/files";

/**
 * Sirve un adjunto (comprobantes de pago y documentos de factura) desde
 * Supabase Storage.
 *
 * El bucket es privado a propósito, así que la descarga pasa por aquí en vez de
 * por una URL pública. El `Content-Type` guardado no se reenvía sin filtrar: un
 * adjunto HTML o SVG servido en línea ejecutaría script en nuestro propio
 * origen, y la UI ofrece un enlace directo con target="_blank" junto a la vista
 * previa. `politicaDeEntrega` deja en línea solo imágenes rasterizadas y PDF, y
 * fuerza la descarga de todo lo demás.
 */
export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "Falta el parámetro key" },
      { status: 400 },
    );
  }

  try {
    const archivo = await downloadFile(key);
    if (!archivo) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
    }

    const politica = politicaDeEntrega(
      archivo.contentType,
      // Las claves se guardan como "<uuid>-<nombre original>".
      (key.split("/").pop() ?? "adjunto").replace(/^[0-9a-f-]{36}-/i, ""),
    );

    return new NextResponse(archivo.body, {
      headers: {
        "Content-Type": politica.contentType,
        "Content-Disposition": politica.disposition,
        "Cache-Control": "private, max-age=3600",
        ...politica.extras,
      },
    });
  } catch (error) {
    console.error("Error sirviendo archivo:", error);
    return NextResponse.json(
      { error: "Error al obtener el archivo" },
      { status: 500 },
    );
  }
}
