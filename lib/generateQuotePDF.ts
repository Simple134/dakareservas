import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  GestionoInvoiceItem,
  PendingRecordElement,
  GestionoBeneficiary,
} from "@/src/types/gestiono";
import { getTaxRateById } from "@/lib/taxRates";

interface QuotePDFData {
  quote: GestionoInvoiceItem;
  beneficiary: GestionoBeneficiary | null;
  elements: PendingRecordElement[];
  documentType?: "QUOTE" | "ORDER";
  isSell?: boolean;
  userName?: string;
  applyRetention?: boolean;
  retentionRate?: number;
}

export async function generateQuotePDF(data: QuotePDFData) {
  const {
    quote,
    beneficiary,
    elements,
    documentType = "QUOTE",
    isSell = true,
    userName = "",
    applyRetention = false,
    retentionRate = 0,
  } = data;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Letter size: 8.5" x 11"

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  // Prepare quote data
  const quoteNumber = quote.taxId || `000000${quote.id}`.slice(-6);
  const quoteDate = new Date(quote.date).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // LEFT SIDE: Company Header
  const leftStartY = yPosition;

  page.drawText("Daka Dominicana SRL", {
    x: margin,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText("Av. Universitaria Plaza Daka módulo 201", {
    x: margin,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 12;
  page.drawText("Teléfono: 829-758-9474 / 829-780-2848", {
    x: margin,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // RIGHT SIDE: Document header based on type
  let rightYPosition = leftStartY;

  // Determine document label based on type
  let documentLabel = "COTIZACION";
  if (documentType === "ORDER") {
    documentLabel = isSell ? "ORDEN DE VENTA" : "ORDEN DE COMPRA";
  }

  const documentTitle = `${documentLabel} Nº${quoteNumber}`;

  page.drawText(documentTitle, {
    x: width - margin - fontBold.widthOfTextAtSize(documentTitle, 11),
    y: rightYPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  rightYPosition -= 15;

  page.drawText("De fecha", {
    x: width - margin - 200,
    y: rightYPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(quoteDate, {
    x: width - margin - 80,
    y: rightYPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  rightYPosition -= 12;

  page.drawText("Válido por 10 días", {
    x: width - margin - 200,
    y: rightYPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // Move to next section (use the lower of the two positions)
  yPosition = Math.min(yPosition, rightYPosition) - 30;

  // Client Information
  const clientName = beneficiary?.name || `Beneficiario ${quote.beneficiaryId}`;
  const clientPhone =
    beneficiary?.contacts?.find((c) => c.type === "phone")?.data || "";
  const clientAddress =
    beneficiary?.contacts?.find((c) => c.type === "address")?.data || "";

  // Client info
  page.drawText("A:", {
    x: margin,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(`[${quote.beneficiaryId}]  ${clientName}`, {
    x: margin + 30,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // Phone below client name
  if (clientPhone) {
    yPosition -= 15;
    page.drawText(`TEL: ${clientPhone}`, {
      x: margin + 30,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Address below phone
  if (clientAddress) {
    yPosition -= 15;
    const addressText =
      clientAddress.length > 60
        ? clientAddress.substring(0, 60) + "..."
        : clientAddress;
    page.drawText(addressText, {
      x: margin + 30,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Request text below client info
  if (documentType === "QUOTE" && !isSell) {
    yPosition -= 25;
    page.drawText("Favor cotizarnos lo siguiente:", {
      x: margin,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  } else {
    yPosition -= 15;
  }

  // Draw horizontal line
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  // Table Headers
  const tableHeaders = [
    "Ref.",
    "Cod.",
    "Descripcion",
    "Cant",
    "Und",
    "Precio",
    "ITBIS",
    "Total",
  ];
  const columnPositions = [
    margin,
    margin + 30,
    margin + 65,
    margin + 240,
    margin + 275,
    margin + 320,
    margin + 385,
    margin + 450,
  ];

  // Helper for text wrapping
  const wrapText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  tableHeaders.forEach((header, index) => {
    page.drawText(header, {
      x: columnPositions[index],
      y: yPosition,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  });

  yPosition -= 15;

  // Draw another line
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  // Table Rows (Items)
  let totalAmount = 0;
  let totalItbis = 0;

  elements.forEach((element, index) => {
    const ref = (index + 1).toString();
    const code = element.resourceId?.toString() || "";
    const descriptionLines = wrapText(element.description, 165, 8);
    const quantity = element.quantity.toString();
    const unit = element.unit;
    const price = element.price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const itemSubtotal = element.quantity * element.price;
    totalAmount += itemSubtotal;

    // Calculate per-element ITBIS using local tax rates map
    const taxRateId = element.taxes?.[0]?.taxRateId ?? 0;
    const rate = getTaxRateById(taxRateId);
    const itemItbis = itemSubtotal * rate;
    totalItbis += itemItbis;

    const rowHeight = Math.max(15, descriptionLines.length * 10 + 5);

    // Check if we need a new page
    if (yPosition < 100) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
    }

    page.drawText(ref, {
      x: columnPositions[0],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(code, {
      x: columnPositions[1],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    // Draw wrapped description
    descriptionLines.forEach((line, i) => {
      page.drawText(line, {
        x: columnPositions[2],
        y: yPosition - i * 10,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      });
    });

    page.drawText(quantity, {
      x: columnPositions[3],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(unit, {
      x: columnPositions[4],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(price, {
      x: columnPositions[5],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    // ITBIS per element
    page.drawText(
      itemItbis.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      {
        x: columnPositions[6],
        y: yPosition,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      },
    );

    // Total per element (subtotal + itbis)
    page.drawText(
      (itemSubtotal + itemItbis).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      {
        x: columnPositions[7],
        y: yPosition,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= rowHeight;
  });

  yPosition -= 40;

  // Row 1: Realizado por and Recibido Por
  page.drawText(`Realizado por: ${userName}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  const receivedByX = width / 2 + 20;
  page.drawText("Recibido Por:", {
    x: receivedByX,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // Line 1: Under Row 1
  yPosition -= 15;
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  // Row 2: TOTALS SECTION — Subtotal, ITBIS, Total
  yPosition -= 25;

  const grandTotal = totalAmount + totalItbis;

  // SUBTOTAL
  page.drawText("SUBTOTAL RD$", {
    x: width - margin - 170,
    y: yPosition + 5,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    {
      x: width - margin - 80,
      y: yPosition + 5,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    },
  );

  yPosition -= 18;

  // ITBIS — only show if there is actual tax on any element
  if (totalItbis > 0) {
    page.drawText("ITBIS RD$", {
      x: width - margin - 170,
      y: yPosition + 5,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      totalItbis.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      {
        x: width - margin - 80,
        y: yPosition + 5,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 18;
  }

  // Retención ISR (only when user chose to apply it)
  let retentionAmount = 0;
  if (applyRetention && retentionRate > 0) {
    retentionAmount = totalItbis * retentionRate;

    page.drawText(`ISR (${(retentionRate * 100).toFixed(0)}%) RD$`, {
      x: width - margin - 170,
      y: yPosition + 5,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `-${retentionAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: width - margin - 80,
        y: yPosition + 5,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 18;
  }

  // TOTAL
  const finalTotal = grandTotal - retentionAmount;
  page.drawText("TOTAL RD$", {
    x: width - margin - 170,
    y: yPosition + 5,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    finalTotal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    {
      x: width - margin - 80,
      y: yPosition + 5,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0),
    },
  );

  // Line 2: Under TOTAL
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Draw bottom line

  // Footer
  const now = new Date();
  const footerText = `Impreso al ${now.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${now.toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  })}. Pág. 001`;

  page.drawText(footerText, {
    x: width - margin - 200,
    y: 30,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  // Create a blob and download
  const blob = new Blob([new Uint8Array(pdfBytes)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${documentLabel}_${quoteNumber}_${clientName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
