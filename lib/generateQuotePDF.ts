import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  GestionoInvoiceItem,
  PendingRecordElement,
  GestionoBeneficiary,
} from "@/src/types/gestiono";

interface QuotePDFData {
  quote: GestionoInvoiceItem;
  beneficiary: GestionoBeneficiary | null;
  elements: PendingRecordElement[];
}

export async function generateQuotePDF(data: QuotePDFData) {
  const { quote, beneficiary, elements } = data;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size: 8.5" x 11"

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

  // RIGHT SIDE: Quotation Number and Date (at same level as company name)
  let rightYPosition = leftStartY;

  page.drawText("COTIZACION No.", {
    x: width - margin - 200,
    y: rightYPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(quoteNumber, {
    x: width - margin - 80,
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

  // Move to next section (use the lower of the two positions)
  yPosition = Math.min(yPosition, rightYPosition) - 30;

  // Client Information
  const clientName = beneficiary?.name || `Beneficiario ${quote.beneficiaryId}`;
  const clientPhone =
    beneficiary?.contacts?.find((c) => c.type === "phone")?.data || "";
  const clientAddress =
    beneficiary?.contacts?.find((c) => c.type === "address")?.data || "";

  const clientStartY = yPosition;

  // LEFT SIDE: Client info
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

  // RIGHT SIDE: Request text (at same level as client name)
  page.drawText("Favor cotizarnos lo siguiente:", {
    x: width - margin - 240,
    y: clientStartY,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  yPosition -= 20;

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
    "Importe",
  ];
  const columnPositions = [
    margin,
    margin + 40,
    margin + 80,
    margin + 280,
    margin + 330,
    margin + 380,
    margin + 450,
  ];

  tableHeaders.forEach((header, index) => {
    page.drawText(header, {
      x: columnPositions[index],
      y: yPosition,
      size: 9,
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

  elements.forEach((element, index) => {
    const ref = (index + 1).toString();
    const code = element.resourceId?.toString() || "";
    const description =
      element.description.length > 30
        ? element.description.substring(0, 30) + "..."
        : element.description;
    const quantity = element.quantity.toString();
    const unit = element.unit;
    const price = element.price.toFixed(2);
    const importe = (element.quantity * element.price).toFixed(2);

    totalAmount += element.quantity * element.price;

    // Check if we need a new page
    if (yPosition < 100) {
      // Add new page
      const newPage = pdfDoc.addPage([612, 792]);
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

    page.drawText(description, {
      x: columnPositions[2],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
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

    page.drawText(importe, {
      x: columnPositions[6],
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;
  });

  // Draw FIN marker
  page.drawText(
    "-------------------------------------- FIN --------------------------------------",
    {
      x: margin + 80,
      y: yPosition,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    },
  );

  yPosition -= 40;

  // Total
  page.drawText("TOTAL RD$", {
    x: width - margin - 150,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    {
      x: width - margin - 80,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0),
    },
  );

  // Draw bottom line
  yPosition -= 10;
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: width - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

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
  link.download = `Cotizacion_${quoteNumber}_${clientName.replace(/\s+/g, "_")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
