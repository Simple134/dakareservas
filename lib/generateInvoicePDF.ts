import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  GestionoInvoiceItem,
  PendingRecordElement,
  GestionoBeneficiary,
  PaymentRecord,
} from "@/src/types/gestiono";
import { getTaxRateById } from "@/lib/taxRates";

interface InvoicePDFData {
  invoice: GestionoInvoiceItem;
  beneficiary: GestionoBeneficiary | null;
  elements: PendingRecordElement[];
  payments?: PaymentRecord[];
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
    payments = [],
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

  if (invoice.reference) {
    yPosition -= 15;
    page.drawText(`Nº Comprobante: ${invoice.reference}`, {
      x: margin,
      y: yPosition,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  }

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

  // Totals section (right-aligned) — consistent label/amount positions for all rows
  const rightColumnX = width - margin - 200;
  const amountColumnX = width - margin - 50;

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

  // ITBIS — hide for 2% retention (total is subtotal-only)
  const is2PercentRetention =
    applyRetention && retentionRate > 0 && retentionRate < 0.1;
  if (totalItbis > 0 && !is2PercentRetention) {
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

  let retentionAmount = 0;
  let itbisRetenido = 0;
  const retLabelX = rightColumnX;
  const retAmountX = amountColumnX;

  if (applyRetention && retentionRate > 0) {
    const is10Percent = retentionRate >= 0.1 && retentionRate < 0.3;
    const is30Percent = retentionRate >= 0.3;
    // is2Percent = retentionRate > 0 && retentionRate < 0.1

    if (is10Percent) {
      // 10%: Full retention — Total Facturado, Itbis Retenido, ISR Retenido
      const totalFacturado = subtotal + totalItbis;

      page.drawText("Total Facturado", {
        x: retLabelX,
        y: yPosition,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      page.drawText(
        `RD$${totalFacturado.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        {
          x: retAmountX,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 18;

      // Itbis Retenido (100% of ITBIS)
      itbisRetenido = totalItbis;

      page.drawText("Itbis Retenido", {
        x: retLabelX,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });

      page.drawText(
        `-RD$${itbisRetenido.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        {
          x: retAmountX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 18;

      // ISR Retenido (subtotal * retentionRate)
      retentionAmount = subtotal * retentionRate;

      page.drawText(`ISR Retenido (${(retentionRate * 100).toFixed(0)}%)`, {
        x: retLabelX,
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
          x: retAmountX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 20;
    } else if (is30Percent) {
      // 30%: ISR on ITBIS
      retentionAmount = totalItbis * retentionRate;

      page.drawText(`ISR Retenido (${(retentionRate * 100).toFixed(0)}%)`, {
        x: retLabelX,
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
          x: retAmountX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 20;
    } else {
      // 2%: ISR on subtotal only
      retentionAmount = subtotal * retentionRate;

      page.drawText(`ISR Retenido (${(retentionRate * 100).toFixed(0)}%)`, {
        x: retLabelX,
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
          x: retAmountX,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 20;
    }
  }

  drawDashedLine(yPosition);
  yPosition -= 20;

  // TOTAL
  let finalTotal: number;
  if (applyRetention && retentionRate > 0) {
    const is10Percent = retentionRate >= 0.1 && retentionRate < 0.3;
    const is2Percent = retentionRate > 0 && retentionRate < 0.1;
    if (is10Percent) {
      finalTotal = subtotal + totalItbis - itbisRetenido - retentionAmount;
    } else if (is2Percent) {
      finalTotal = subtotal - retentionAmount;
    } else {
      // 30%
      finalTotal = subtotal + totalItbis - retentionAmount;
    }
  } else {
    finalTotal = subtotal + totalItbis;
  }
  const is10ForLabel =
    applyRetention && retentionRate >= 0.1 && retentionRate < 0.3;
  page.drawText(is10ForLabel ? "TOTAL PAGO" : "TOTAL", {
    x: retLabelX,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    `RD$${finalTotal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    {
      x: retAmountX,
      y: yPosition,
      size: 11,
      font: fontBold,
      color: rgb(0, 0, 0),
    },
  );

  yPosition -= 15;

  if (invoice.paid > 0) {
    page.drawText("PAGADO", {
      x: retLabelX,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(
      `RD$${invoice.paid.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: retAmountX,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      },
    );

    yPosition -= 15;

    if (invoice.dueToPay > 0) {
      page.drawText("PENDIENTE", {
        x: retLabelX,
        y: yPosition,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      page.drawText(
        `RD$${invoice.dueToPay.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        {
          x: retAmountX,
          y: yPosition,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        },
      );

      yPosition -= 15;
    }
  }

  // Payment history detail
  if (payments.length > 0) {
    yPosition -= 5;
    drawDashedLine(yPosition);
    yPosition -= 15;

    page.drawText("DETALLE DE PAGOS", {
      x: margin,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 12;

    const payMethodLabel = (method: string) => {
      if (method === "CASH") return "Efectivo";
      if (method === "TRANSFER") return "Transferencia";
      if (method === "CARD") return "Tarjeta";
      return method;
    };

    payments.forEach((payment) => {
      if (yPosition < 80) {
        pdfDoc.addPage([612, 792]);
        yPosition = height - margin;
      }

      const payDate = new Date(payment.date).toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const method = payMethodLabel(payment.paymentMethod as string);
      const ref = payment.reference ? ` · ${payment.reference}` : "";
      const payLabel = `${payDate}  ${method}${ref}`;

      page.drawText(payLabel, {
        x: margin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(
        `RD$${payment.amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        {
          x: retAmountX,
          y: yPosition,
          size: 8,
          font,
          color: rgb(0.1, 0.5, 0.1),
        },
      );

      yPosition -= 12;
    });
  }

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
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
