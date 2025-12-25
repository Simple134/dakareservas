"use server";

import { sendInvitationEmail } from "@/src/lib/email";

export async function inviteUserAction(email: string, name: string) {
  try {
    const result = await sendInvitationEmail(email, name);
    if (result.success) {
      return { success: true, message: "Invitación enviada correctamente" };
    } else {
      return {
        success: false,
        message: "Error enviando el correo: " + JSON.stringify(result.error),
      };
    }
  } catch (e: any) {
    return { success: false, message: "Error inesperado: " + e.message };
  }
}
