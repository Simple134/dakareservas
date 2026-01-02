"use server";

import { sendQuotationEmail } from "@/src/lib/email";

export async function sendQuotationAction(
  email: string,
  name: string,
  quotationUrl: string,
) {
  try {
    const result = await sendQuotationEmail(email, name, quotationUrl);
    if (result.success) {
      return { success: true, message: "Cotización enviada correctaente" };
    } else {
      return {
        success: false,
        message: "Error enviando el correo: " + JSON.stringify(result.error),
      };
    }
  } catch (e: unknown) {
    return {
      success: false,
      message:
        "Error inesperado: " +
        (e instanceof Error ? e.message : "Error inesperado"),
    };
  }
}
