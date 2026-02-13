import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  GestionoInvoiceItem,
  PendingRecordElement,
  GestionoBeneficiary,
} from "@/src/types/gestiono";
import { getTaxRateById } from "@/lib/taxRates";

interface InvoicePDFData {
  invoice: GestionoInvoiceItem;
  beneficiary: GestionoBeneficiary | null;
  elements: PendingRecordElement[];
  isSell?: boolean;
  userName: string;
  applyRetention?: boolean;
  retentionRate?: number;
}

export async function generateInvoicePDF(data: InvoicePDFData) {
  const {
    invoice,
    beneficiary,
    elements,
    isSell = true,
    applyRetention = false,
    retentionRate = 0,
  } = data;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size: 8.5" x 11"

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  // Prepare invoice data
  const invoiceNumber = invoice.taxId || `0000000${invoice.id}`.slice(-8);
  const invoicePrefix = isSell ? "FAVE" : "FACO";
  const fullInvoiceNumber = `${invoicePrefix}-${invoiceNumber}`;

  const invoiceDate = new Date(invoice.date).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Company Header (centered)
  page.drawText("DAKA DOMINICANA SRL", {
    x: width / 2 - 70,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText("Av. Universitaria Plaza Daka modulo 201", {
    x: width / 2 - 100,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 12;
  page.drawText("Telefono: 849-885-2555 / 829-673-6200", {
    x: width / 2 - 95,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 12;
  page.drawText("RNC: 132139313", {
    x: width / 2 - 40,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 30;

  // Invoice Number and Details (left-aligned)
  page.drawText(fullInvoiceNumber, {
    x: margin,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  page.drawText(`Emisión : ${invoiceDate}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  const clientName =
    beneficiary?.name || `Beneficiario ${invoice.beneficiaryId}`;
  page.drawText(`Cliente: ${clientName}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  const clientRNC = beneficiary?.taxId || "";
  page.drawText(`RNC: ${clientRNC}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  // Draw dashed line
  const drawDashedLine = (y: number) => {
    const dashLength = 5;
    const gapLength = 3;
    let currentX = margin;

    while (currentX < width - margin) {
      page.drawLine({
        start: { x: currentX, y },
        end: { x: Math.min(currentX + dashLength, width - margin), y },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      currentX += dashLength + gapLength;
    }
  };

  drawDashedLine(yPosition);
  yPosition -= 15;

  // Table Header
  const colDescX = margin;
  const colItbisX = width - margin - 160;
  const colTotalX = width - margin - 80;

  page.drawText("Descripción", {
    x: colDescX,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("ITBIS", {
    x: colItbisX,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Impreso", {
    x: colTotalX,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  // Items
  let subtotal = 0;
  let totalItbis = 0;

  elements.forEach((element) => {
    const description =
      element.description.length > 55
        ? element.description.substring(0, 55) + "..."
        : element.description;

    const itemSubtotal = element.quantity * element.price;
    subtotal += itemSubtotal;

    // Calculate per-element ITBIS using local tax rates map
    const taxRateId = element.taxes?.[0]?.taxRateId ?? 0;
    const rate = getTaxRateById(taxRateId);
    const itemItbis = itemSubtotal * rate;
    totalItbis += itemItbis;

    const itemTotal = itemSubtotal + itemItbis;

    // Check if we need a new page
    if (yPosition < 150) {
      pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
    }

    page.drawText(description, {
      x: colDescX,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });

    // ITBIS per element
    page.drawText(
      `$${itemItbis.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: colItbisX,
        y: yPosition,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      },
    );

    // Total per element (subtotal + itbis)
    page.drawText(
      `$${itemTotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: colTotalX,
        y: yPosition,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 15;
  });

  yPosition -= 10;
  drawDashedLine(yPosition);
  yPosition -= 20;

  // Totals section (right-aligned)
  const rightColumnX = width - margin - 150;
  const amountColumnX = width - margin - 80;

  // SUBTOTAL
  page.drawText("SUBTOTAL", {
    x: rightColumnX,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    `RD$${subtotal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    {
      x: amountColumnX,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    },
  );

  yPosition -= 15;

  // ITBIS — show aggregated total only if there is actual tax on any element
  if (totalItbis > 0) {
    page.drawText("ITBIS", {
      x: rightColumnX,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `RD$${totalItbis.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: amountColumnX,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 20;
  }

  // Retención ISR (only when user chose to apply it)
  let retentionAmount = 0;
  if (applyRetention && retentionRate > 0) {
    retentionAmount = subtotal * retentionRate;

    page.drawText(`Retención ISR (${(retentionRate * 100).toFixed(0)}%)`, {
      x: rightColumnX,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `-RD$${retentionAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: amountColumnX,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 20;
  }

  drawDashedLine(yPosition);
  yPosition -= 20;

  // TOTAL
  const total = subtotal + totalItbis - retentionAmount;
  page.drawText("TOTAL", {
    x: rightColumnX,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    `RD$${total.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    {
      x: amountColumnX,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0),
    },
  );

  yPosition -= 15;
  drawDashedLine(yPosition);

  // Footer section
  yPosition -= 60;

  // page.drawText(`REALIZADO POR: ${userName || ""}`, {
  //   x: margin,
  //   y: yPosition,
  //   size: 10,
  //   font,
  //   color: rgb(0, 0, 0),
  // });

  // // Repeated total at bottom right
  // yPosition -= 80;
  // page.drawText(
  //   `$${total.toLocaleString("en-US", {
  //     minimumFractionDigits: 2,
  //     maximumFractionDigits: 2,
  //   })}`,
  //   {
  //     x: width - margin - 100,
  //     y: yPosition,
  //     size: 10,
  //     font,
  //     color: rgb(0, 0, 0),
  //   },
  // );

  // // Dollar sign at bottom center
  // page.drawText("$", {
  //   x: width / 2 - 5,
  //   y: 40,
  //   size: 12,
  //   font: fontBold,
  //   color: rgb(0, 0, 0),
  // });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  // Create a blob and download
  const blob = new Blob([new Uint8Array(pdfBytes)], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fullInvoiceNumber}_${clientName.replace(/\s+/g, "_")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
