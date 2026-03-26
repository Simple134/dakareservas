import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface CuentaRowPDF {
  fecha: string;
  descripcion: string;
  montoTotal: number;
  montoAplicado: number;
  balancePendiente: number;
}

export interface CuentasPorPagarPDFData {
  projectName: string;
  rows: CuentaRowPDF[];
  totals: {
    montoTotal: number;
    montoAplicado: number;
    balancePendiente: number;
  };
}

// ─── Page & layout constants ──────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;

const C_FECHA = MARGIN;
const C_DESC = 118;
const C_MONTO_R = 452;
const C_APLIC_R = 512;
const C_PEND_R = PAGE_W - MARGIN;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);
const GOLD = rgb(0.55, 0.42, 0.08);
const GREEN = rgb(0.1, 0.48, 0.15);
const ORANGE = rgb(0.8, 0.35, 0.0);
const LGRAY = rgb(0.75, 0.75, 0.75);

type Page = ReturnType<PDFDocument["addPage"]>;
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function rText(
  page: Page,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: Font,
  color = BLACK,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
}

function hLine(page: Page, y: number, color = LGRAY, thick = 0.5) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: thick,
    color,
  });
}

function wrapText(
  text: string,
  maxW: number,
  size: number,
  font: Font,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxW) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) > maxW) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) <= maxW) {
            chunk += ch;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function generateCuentasPorPagarPDF(data: CuentasPorPagarPDFData) {
  const { projectName, rows, totals } = data;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const today = new Date().toLocaleDateString("es-DO", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const LINE_H = 12;
  const ROW_PAD = 8;
  const MIN_Y = MARGIN + 70;
  const MAX_DESC_W = 240;

  function drawPageHeader(
    page: Page,
    pageNum: number,
    totalPgs: number,
  ): number {
    let y = PAGE_H - MARGIN;

    page.drawText("DAKA DOMINICANA SRL", {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: BLACK,
    });

    const titleX = PAGE_W - MARGIN - 185;
    page.drawText("ESTADO DE CUENTA POR PAGAR", {
      x: titleX,
      y,
      size: 9,
      font: fontBold,
      color: BLACK,
    });

    y -= 14;
    page.drawText("Av. Universitaria Plaza Daka modulo 201", {
      x: MARGIN,
      y,
      size: 8,
      font,
      color: GRAY,
    });
    page.drawText(`Fecha   ${today}`, {
      x: titleX,
      y,
      size: 8,
      font,
      color: GRAY,
    });

    y -= 12;
    page.drawText("Telefono: 829-885-2555 / 829-573-6200.", {
      x: MARGIN,
      y,
      size: 8,
      font,
      color: GRAY,
    });
    page.drawText(`${pageNum} Pag ${totalPgs}`, {
      x: titleX,
      y,
      size: 8,
      font,
      color: GRAY,
    });

    y -= 12;
    page.drawText("RNC:  132139313", {
      x: MARGIN,
      y,
      size: 8,
      font,
      color: GRAY,
    });

    y -= 14;
    hLine(page, y, LGRAY, 0.5);

    return y;
  }

  function drawInfoBox(page: Page, y: number): number {
    y -= 10;
    page.drawText("DAKA DOMINICANA", {
      x: MARGIN,
      y,
      size: 8,
      font: fontBold,
      color: GOLD,
    });

    y -= 14;
    const BOX_H = 50;
    page.drawRectangle({
      x: MARGIN,
      y: y - BOX_H,
      width: PAGE_W - MARGIN * 2,
      height: BOX_H,
      borderColor: BLACK,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    const r1y = y - 14;
    page.drawText("Proyecto:", {
      x: MARGIN + 8,
      y: r1y,
      size: 8,
      font: fontBold,
      color: BLACK,
    });
    page.drawText(
      projectName.length > 60 ? `${projectName.slice(0, 57)}…` : projectName,
      { x: MARGIN + 58, y: r1y, size: 8, font, color: BLACK },
    );

    const r2y = y - 30;
    page.drawText("Total Compras:", {
      x: MARGIN + 8,
      y: r2y,
      size: 8,
      font: fontBold,
      color: BLACK,
    });
    page.drawText(fmt(totals.montoTotal), {
      x: MARGIN + 90,
      y: r2y,
      size: 8,
      font,
      color: BLACK,
    });

    page.drawText("Total Pagado:", {
      x: MARGIN + 200,
      y: r2y,
      size: 8,
      font: fontBold,
      color: BLACK,
    });
    page.drawText(fmt(totals.montoAplicado), {
      x: MARGIN + 278,
      y: r2y,
      size: 8,
      font,
      color: GREEN,
    });

    page.drawText("Balance por Pagar:", {
      x: MARGIN + 370,
      y: r2y,
      size: 8,
      font: fontBold,
      color: BLACK,
    });
    page.drawText(fmt(totals.balancePendiente), {
      x: MARGIN + 462,
      y: r2y,
      size: 8,
      font,
      color: ORANGE,
    });

    return y - BOX_H - 14;
  }

  function drawTableHeader(page: Page, y: number): number {
    const S = 8;
    page.drawText("Fecha", {
      x: C_FECHA,
      y,
      size: S,
      font: fontBold,
      color: BLACK,
    });
    page.drawText("Descripción", {
      x: C_DESC,
      y,
      size: S,
      font: fontBold,
      color: BLACK,
    });
    rText(page, "Monto Total", C_MONTO_R, y, S, fontBold, BLACK);
    rText(page, "Monto Pagado", C_APLIC_R, y, S, fontBold, BLACK);
    rText(page, "Blce Pendiente", C_PEND_R, y, S, fontBold, BLACK);

    y -= 4;
    hLine(page, y, BLACK, 0.8);
    return y - 4;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / 20));

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let pageNum = 1;

  let y = drawPageHeader(page, pageNum, totalPages);
  y = drawInfoBox(page, y);
  y = drawTableHeader(page, y);

  const S = 8;

  rows.forEach((row) => {
    const descLines = wrapText(row.descripcion, MAX_DESC_W, S, font);
    const rowHeight = ROW_PAD + descLines.length * LINE_H;

    if (y - rowHeight < MIN_Y) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pageNum++;
      y = PAGE_H - MARGIN;
      page.drawText("ESTADO DE CUENTA POR PAGAR — continuación", {
        x: MARGIN,
        y,
        size: 8,
        font: fontBold,
        color: GRAY,
      });
      rText(
        page,
        `Pág. ${pageNum} / ${totalPages}`,
        PAGE_W - MARGIN,
        y,
        8,
        font,
        GRAY,
      );
      y -= 14;
      hLine(page, y, LGRAY);
      y -= 8;
      y = drawTableHeader(page, y);
    }

    const rowY = y - ROW_PAD / 2;

    page.drawText(row.fecha, {
      x: C_FECHA,
      y: rowY,
      size: S,
      font,
      color: GRAY,
    });
    rText(page, fmt(row.montoTotal), C_MONTO_R, rowY, S, font, BLACK);
    rText(
      page,
      fmt(row.montoAplicado),
      C_APLIC_R,
      rowY,
      S,
      font,
      row.montoAplicado > 0 ? GREEN : GRAY,
    );
    rText(
      page,
      fmt(row.balancePendiente),
      C_PEND_R,
      rowY,
      S,
      font,
      row.balancePendiente > 0 ? ORANGE : GRAY,
    );

    descLines.forEach((line, li) => {
      page.drawText(line, {
        x: C_DESC,
        y: rowY - li * LINE_H,
        size: S,
        font,
        color: BLACK,
      });
    });

    y -= rowHeight;
  });

  y -= 4;
  hLine(page, y, BLACK, 0.8);
  y -= 14;

  page.drawText("TOTAL", {
    x: C_FECHA,
    y,
    size: S,
    font: fontBold,
    color: BLACK,
  });
  rText(page, fmt(totals.montoTotal), C_MONTO_R, y, S, fontBold, BLACK);
  rText(page, fmt(totals.montoAplicado), C_APLIC_R, y, S, fontBold, GREEN);
  rText(page, fmt(totals.balancePendiente), C_PEND_R, y, S, fontBold, ORANGE);

  y -= 14;
  hLine(page, y + 10, LGRAY, 0.4);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = projectName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  link.download = `Cuentas_Por_Pagar_${safeName}_${today.replace(/\//g, "-")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
