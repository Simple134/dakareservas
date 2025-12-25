"use server";

import { sendPaymentNotificationEmail } from "@/src/lib/email";

export async function sendPaymentNotificationAction(
  userName: string,
  amount: string,
  currency: string,
) {
  try {
    const result = await sendPaymentNotificationEmail(
      userName,
      amount,
      currency,
    );
    if (result.success) {
      return {
        success: true,
        message: "Notificación de pago enviada correctamente",
      };
    } else {
      return {
        success: false,
        message: "Error enviando notificación: " + JSON.stringify(result.error),
      };
    }
  } catch (e: any) {
    return { success: false, message: "Error inesperado: " + e.message };
  }
}
