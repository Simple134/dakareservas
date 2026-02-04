import { GestionoBeneficiary } from "@/src/types/gestiono";

interface LocalData {
  id: number;
  level: number;
  area_mt2: number;
  price_per_mt2: number;
  total_value: number;
  separation_10?: number;
  separation_45?: number;
  status: string;
}

interface PaymentPlan {
  separation10: number;
  separation45: number;
  remainingCapital: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installments: {
    number: number;
    dueDate: string;
    amount: number;
    description: string;
  }[];
}

interface GenerateLocalQuotePDFParams {
  localData: LocalData;
  beneficiary: GestionoBeneficiary | null;
  projectName: string;
  paymentPlan: PaymentPlan;
  quotationDate?: string; // Optional, can default to now if not provided, but usually passed
}

export const generateLocalQuotePDF = async ({
  localData,
  beneficiary,
  projectName,
  paymentPlan,
  quotationDate = new Date().toISOString(),
}: GenerateLocalQuotePDFParams) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Colors
  const primaryBlue: [number, number, number] = [7, 35, 75]; // #07234B
  const lightGray: [number, number, number] = [240, 240, 240];
  const darkGray: [number, number, number] = [64, 64, 64];

  // Logo and Header
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, 210, 40, "F");

  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("DAKA", 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DAKA DOMINICANA LTD.", 15, 27);
  doc.text("Av. 33 Guerrero 1102 Plaza", 15, 32);
  doc.text("Teléfono: 849-804-3500 y", 15, 37);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(projectName.toUpperCase(), 150, 25);

  // Cotización de Local
  doc.setFillColor(...primaryBlue);
  doc.rect(15, 45, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`COTIZACIÓN DE LOCAL ${localData.id}`, 20, 50);

  // Cliente Info
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 20, 60);
  doc.setFont("helvetica", "normal");
  doc.text(beneficiary?.name || "", 45, 60);

  if (beneficiary?.taxId) {
    doc.text("CÉDULA:", 20, 66);
    doc.text(beneficiary.taxId, 45, 66);
  }

  doc.text("COTIZADO:", 20, 72);
  doc.text(new Date(quotationDate).toLocaleDateString("es-DO"), 45, 72);

  // Actividad de Local
  doc.setFont("helvetica", "bold");
  doc.text("ACTIVIDAD DE LOCAL:", 20, 80);
  doc.setFont("helvetica", "normal");
  doc.text("PRECIO M/2:", 20, 92);
  doc.text(formatCurrency(localData.price_per_mt2), 70, 92);
  doc.text("M/2:", 20, 98);
  doc.text(localData.area_mt2.toFixed(2), 70, 98);
  doc.text("VALOR EN US$:", 20, 104);
  doc.text(formatCurrency(localData.total_value), 70, 104);

  // Método de Pago para Capital
  doc.setFillColor(...primaryBlue);
  doc.rect(15, 110, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("MÉTODO DE PAGO PARA CAPITAL: US$", 20, 115);

  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "normal");
  let yPos = 125;
  doc.text(`SEPARACIÓN (10%):`, 20, yPos);
  doc.text(formatCurrency(paymentPlan.separation10), 80, yPos);

  yPos += 6;
  doc.text(`COMPLETIVO (45%):`, 20, yPos);
  doc.text(formatCurrency(paymentPlan.separation45), 80, yPos);

  // Tabla de Cuotas
  yPos += 10;
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, 180, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("FECHA DE PAGO", 20, yPos + 5);
  doc.text("ESPECIFICACION", 80, yPos + 5);
  doc.text("CUOTA", 150, yPos + 5);
  doc.text("TOTAL US$", 170, yPos + 5);

  yPos += 10;
  doc.setFont("helvetica", "normal");

  paymentPlan.installments.forEach((installment, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(installment.dueDate, 20, yPos);
    doc.text(`CUOTA`, 80, yPos);
    doc.text(`${installment.number}`, 155, yPos);
    doc.text(formatCurrency(installment.amount), 170, yPos);

    yPos += 6;
  });

  // Total
  yPos += 5;
  doc.setFillColor(...primaryBlue);
  doc.rect(15, yPos, 180, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 150, yPos + 5);
  doc.text(formatCurrency(localData.total_value), 170, yPos + 5);

  // Save PDF
  doc.save(
    `Cotizacion_Local_${localData.id}_${beneficiary?.name || "Cliente"}.pdf`,
  );
};
