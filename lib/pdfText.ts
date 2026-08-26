import { PDFFont, PDFPage } from "pdf-lib";

/**
 * Las fuentes estándar de pdf-lib (Helvetica y compañía) codifican en WinAnsi,
 * que no puede representar caracteres invisibles de control bidireccional ni la
 * mayoría de la puntuación tipográfica. Los datos migrados traen ese tipo de
 * basura invisible (pegada desde Excel o WhatsApp) en descripciones y nombres,
 * y al dibujarla pdf-lib lanza `WinAnsi cannot encode "‪" (0x202a)`.
 *
 * Caracteres extra sobre Latin-1 que WinAnsi sí admite.
 */
const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e,
  0x0178, 0x2022,
]);

const REPLACEMENTS: Record<string, string> = {
  " ": " ", // espacio duro
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
  "−": "-",
  "‑": "-", // guión duro (iPhone)
  "‐": "-",
};

/** Deja el texto en algo que WinAnsi pueda codificar sin lanzar. */
export function sanitizePdfText(text: string): string {
  let out = "";
  for (const ch of text) {
    const mapped = REPLACEMENTS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0)!;
    // Controles C0/C1, marcas bidi, joiners y BOM: se descartan.
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      out += ch === "\n" || ch === "\r" || ch === "\t" ? ch : "";
      continue;
    }
    if (code <= 0xff || WIN_ANSI_EXTRA.has(code)) {
      out += ch;
      continue;
    }
    if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2060 && code <= 0x206f) ||
      code === 0xfeff
    ) {
      continue;
    }
    out += "?";
  }
  return out;
}

/**
 * Parchea `drawText` y `widthOfTextAtSize` una sola vez, en lugar de envolver a
 * mano los ~130 `drawText` repartidos por los generadores. Se aplica al importar
 * este módulo; el patch es idempotente.
 */
const PATCHED = Symbol.for("daka.pdfTextSanitized");
type Patchable = { [PATCHED]?: boolean };

if (!(PDFPage.prototype as Patchable)[PATCHED]) {
  const drawText = PDFPage.prototype.drawText;
  PDFPage.prototype.drawText = function (text, options) {
    return drawText.call(this, sanitizePdfText(String(text)), options);
  };
  (PDFPage.prototype as Patchable)[PATCHED] = true;

  const widthOf = PDFFont.prototype.widthOfTextAtSize;
  PDFFont.prototype.widthOfTextAtSize = function (text, size) {
    return widthOf.call(this, sanitizePdfText(String(text)), size);
  };
}
