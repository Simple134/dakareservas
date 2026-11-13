import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import "@/lib/pdfText";
import {
  fechaCorta,
  importe,
  type EstadoDeCuenta,
} from "@/src/lib/locales/statement";

// Carta apaisada: ocho columnas no caben en vertical sin partir los importes.
const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN = 36;

const X_DOC = MARGIN;
const X_METODO = 116;
const X_TASA = 272;
const X_DESC = 312;
const X_FECHA = 512;
const R_TOTAL = 628;
const R_APLICADO = 692;
const R_PENDIENTE = PAGE_W - MARGIN;

const W_METODO = X_TASA - X_METODO - 8;
const W_DESC = X_FECHA - X_DESC - 8;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.78, 0.78, 0.78);
const NAVY = rgb(0.05, 0.16, 0.42);

const FIRMA_CARGO = "GERENTE GENERAL Y ADMINISTRATIVO";
const FIRMA_NOMBRE = "EDWIN RAMOS";
const TELEFONOS = "Telefono: 829-885-2555 / 829-573-6200.";

type Page = ReturnType<PDFDocument["addPage"]>;
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

function partir(texto: string, ancho: number, size: number, font: Font) {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(candidata, size) <= ancho || !actual) {
      actual = candidata;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

export interface OpcionesEstadoPDF {
  /** Nombre del proyecto, bajo los teléfonos. */
  proyecto?: string;
  /** PNG del logo. Sin él, la cabecera va solo con el nombre de la empresa. */
  logo?: Uint8Array | ArrayBuffer;
  emitido?: Date;
}

export async function construirEstadoCuentaLocalPDF(
  estado: EstadoDeCuenta,
  opciones: OpcionesEstadoPDF = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = opciones.logo ? await pdf.embedPng(opciones.logo) : null;

  const emitido = (opciones.emitido ?? new Date()).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const ultimoRecibo =
    [...estado.filas].reverse().find((f) => f.documento)?.documento ?? "";

  const S = 7.5;
  const LINE = 10;
  const PIE = MARGIN + 70;

  const derecha = (
    page: Page,
    texto: string,
    x: number,
    y: number,
    f: Font = font,
    size = S,
  ) =>
    page.drawText(texto, {
      x: x - f.widthOfTextAtSize(texto, size),
      y,
      size,
      font: f,
      color: BLACK,
    });

  const centrado = (
    page: Page,
    texto: string,
    cx: number,
    y: number,
    f: Font,
  ) =>
    page.drawText(texto, {
      x: cx - f.widthOfTextAtSize(texto, 8) / 2,
      y,
      size: 8,
      font: f,
      color: BLACK,
    });

  const regla = (page: Page, y: number, grosor = 0.5, color = RULE) =>
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: grosor,
      color,
    });

  const cabeceraTabla = (page: Page, y: number) => {
    const t = (texto: string, x: number) =>
      page.drawText(texto, { x, y, size: S, font: bold, color: BLACK });
    t("Documento", X_DOC);
    t("Método de pago", X_METODO);
    t("Tasa", X_TASA);
    t("Descripción", X_DESC);
    t("Fecha", X_FECHA);
    derecha(page, "Monto total", R_TOTAL, y, bold);
    derecha(page, "Monto aplicado", R_APLICADO, y, bold);
    derecha(page, "Blce pendiente", R_PENDIENTE, y, bold);
    regla(page, y - 5, 0.8, BLACK);
    return y - 18;
  };

  const paginas: Page[] = [];
  const nuevaPagina = () => {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    paginas.push(page);
    return page;
  };

  let page = nuevaPagina();
  let y = PAGE_H - MARGIN;

  if (logo) {
    const alto = 46;
    const ancho = (logo.width / logo.height) * alto;
    page.drawImage(logo, {
      x: MARGIN,
      y: y - alto,
      width: ancho,
      height: alto,
    });
  }
  const cx = PAGE_W - MARGIN - 75;
  centrado(page, "ESTADO DE CUENTA DETALLADO", cx, y - 10, bold);
  if (ultimoRecibo) centrado(page, `No. ${ultimoRecibo}`, cx, y - 22, font);
  centrado(page, emitido, cx, y - 34, font);

  y -= 64;
  page.drawText("DAKA DOMINICANA SRL", {
    x: MARGIN,
    y,
    size: 8,
    font: bold,
    color: BLACK,
  });
  y -= 22;
  page.drawText(TELEFONOS, { x: MARGIN, y, size: 8, font, color: BLACK });
  if (opciones.proyecto) {
    y -= 18;
    page.drawText(opciones.proyecto.toUpperCase(), {
      x: MARGIN,
      y,
      size: 7.5,
      font: bold,
      color: NAVY,
    });
  }

  y -= 24;
  const ficha: [string, string][] = [
    [`Monto local ${estado.codigo}`, importe(estado.valor, estado.moneda)],
    ["Cantidad mt2:", estado.area.toFixed(2)],
    ["Precio mt2:", importe(estado.precioM2, estado.moneda)],
  ];
  if (estado.cliente) {
    ficha.push(["Cliente:", estado.cliente.nombre]);
    if (estado.cliente.identificacion) {
      ficha.push(["Cédula / RNC:", estado.cliente.identificacion]);
    }
  }
  for (const [etiqueta, valor] of ficha) {
    page.drawText(etiqueta, {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: BLACK,
    });
    page.drawText(valor, {
      x: MARGIN + 110,
      y,
      size: 8,
      font: etiqueta.startsWith("Monto") ? bold : font,
      color: BLACK,
    });
    y -= 12;
  }

  y -= 14;
  y = cabeceraTabla(page, y);

  for (const fila of estado.filas) {
    const metodo = partir(fila.metodo || "-", W_METODO, S, font);
    // Un pago en la otra moneda deja constancia de lo recibido y su tasa.
    const original =
      fila.moneda !== estado.moneda
        ? ` (recibido ${importe(fila.monto, fila.moneda)}${fila.tasa ? ` a tasa ${fila.tasa.toFixed(2)}` : ""})`
        : "";
    const desc = partir(
      `${fila.descripcion || "-"}${original}`,
      W_DESC,
      S,
      font,
    );
    const alto = Math.max(metodo.length, desc.length) * LINE + 5;

    if (y - alto < PIE) {
      page = nuevaPagina();
      y = PAGE_H - MARGIN;
      page.drawText(`ESTADO DE CUENTA ${estado.codigo}, continuación`, {
        x: MARGIN,
        y,
        size: 8,
        font: bold,
        color: GRAY,
      });
      y = cabeceraTabla(page, y - 20);
    }

    const t = (texto: string, x: number, dy = 0) =>
      page.drawText(texto, { x, y: y - dy, size: S, font, color: BLACK });
    t(fila.documento || "-", X_DOC);
    metodo.forEach((l, i) => t(l, X_METODO, i * LINE));
    t(fila.tasa ? fila.tasa.toFixed(2) : "-", X_TASA);
    desc.forEach((l, i) => t(l, X_DESC, i * LINE));
    t(fechaCorta(fila.fecha), X_FECHA);
    derecha(page, importe(fila.montoTotal, estado.moneda), R_TOTAL, y);
    derecha(page, importe(fila.montoAplicado, estado.moneda), R_APLICADO, y);
    derecha(page, importe(fila.balance, estado.moneda), R_PENDIENTE, y);

    y -= alto;
  }

  if (estado.filas.length === 0) {
    page.drawText("Sin pagos registrados.", {
      x: X_DOC,
      y,
      size: S,
      font,
      color: GRAY,
    });
    y -= LINE + 5;
  }

  regla(page, y + 4, 0.8, BLACK);
  y -= 12;
  page.drawText("Total recibido", { x: X_DOC, y, size: 8, font: bold });
  derecha(
    page,
    importe(estado.totalRecibido, estado.moneda),
    R_APLICADO,
    y,
    bold,
    8,
  );
  derecha(
    page,
    importe(estado.pendiente, estado.moneda),
    R_PENDIENTE,
    y,
    bold,
    8,
  );

  const firmaX = MARGIN + 110;
  page.drawLine({
    start: { x: firmaX - 85, y: MARGIN + 28 },
    end: { x: firmaX + 85, y: MARGIN + 28 },
    thickness: 0.5,
    color: BLACK,
  });
  centrado(page, FIRMA_CARGO, firmaX, MARGIN + 16, font);
  centrado(page, FIRMA_NOMBRE, firmaX, MARGIN + 5, bold);

  paginas.forEach((p, i) =>
    centrado(
      p,
      `${i + 1} Pag ${paginas.length}`,
      cx,
      PAGE_H - MARGIN - 50,
      font,
    ),
  );

  return pdf.save();
}

export const nombreArchivoEstado = (estado: EstadoDeCuenta): string =>
  `Estado_de_cuenta_${estado.codigo}.pdf`;

/** Solo en el navegador: genera el PDF y lo descarga. */
export async function descargarEstadoCuentaLocalPDF(
  estado: EstadoDeCuenta,
  proyecto?: string,
): Promise<void> {
  const res = await fetch("/pdf/logo-daka.png");
  const logo = res.ok ? await res.arrayBuffer() : undefined;
  const bytes = await construirEstadoCuentaLocalPDF(estado, { proyecto, logo });
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivoEstado(estado);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
