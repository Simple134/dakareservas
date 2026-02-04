import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  GestionoInvoiceItem,
  PendingRecordElement,
  GestionoBeneficiary,
} from "@/src/types/gestiono";

interface InvoicePDFData {
  invoice: GestionoInvoiceItem;
  beneficiary: GestionoBeneficiary | null;
  elements: PendingRecordElement[];
  isSell?: boolean;
}

export async function generateInvoicePDF(data: InvoicePDFData) {
  const { invoice, beneficiary, elements, isSell = true } = data;

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
  page.drawText("Descripción", {
    x: margin,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText("Impreso", {
    x: width - margin - 80,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;

  // Items
  let subtotal = 0;

  elements.forEach((element) => {
    const description =
      element.description.length > 65
        ? element.description.substring(0, 65) + "..."
        : element.description;

    const itemTotal = element.quantity * element.price;
    subtotal += itemTotal;

    // Check if we need a new page
    if (yPosition < 150) {
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
    }

    page.drawText(description, {
      x: margin,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `$${itemTotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: width - margin - 80,
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

  // ITBIS (18%)
  const itbis = subtotal * 0.18;
  page.drawText("ITBIS", {
    x: rightColumnX,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    `RD$${itbis.toLocaleString("en-US", {
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
  drawDashedLine(yPosition);
  yPosition -= 20;

  // TOTAL
  const total = subtotal + itbis;
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

  page.drawText("REALIZADO POR:", {
    x: margin,
    y: yPosition,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // Repeated total at bottom right
  yPosition -= 80;
  page.drawText(
    `$${total.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    {
      x: width - margin - 100,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    },
  );

  // Dollar sign at bottom center
  page.drawText("$", {
    x: width / 2 - 5,
    y: 40,
    size: 12,
    font: fontBold,
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
  link.download = `${fullInvoiceNumber}_${clientName.replace(/\s+/g, "_")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
