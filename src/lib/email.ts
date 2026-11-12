import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const cleanUrl = siteUrl.replace(/\/$/, ""); // Remove trailing slash if present

    const { data, error } = await resend.emails.send({
      from: "Daka <noreply@reservas.dakadominicana.com>",
      to: [email],
      subject: "Invitación a Daka - Crea tu cuenta",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #131E29;">¡Hola ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">Has sido registrado en la plataforma de Daka.</p>
          <p style="font-size: 16px; line-height: 1.6;">Para acceder a tu cuenta y gestionar tus inversiones, necesitas crear tu contraseña.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${cleanUrl}/login" style="background-color: #A9780F; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Crear mi cuenta</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Tu correo de acceso es: <strong>${email}</strong><br>
            Solo necesitas crear una contraseña para acceder.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Si no solicitaste esta invitación, puedes ignorar este correo.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending email:", error);
    return { success: false, error };
  }
}

export async function sendQuotationEmail(
  email: string,
  name: string,
  quotationUrl: string,
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Daka <noreply@reservas.dakadominicana.com>",
      to: [email],
      subject: "Nueva Cotización - Daka",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #131E29;">¡Hola ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">Se ha generado una nueva cotización para tu reserva.</p>
          <p style="font-size: 16px; line-height: 1.6;">Puedes verla y descargarla haciendo clic en el siguiente botón:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${quotationUrl}" style="background-color: #A9780F; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ver Cotización PDF</a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:<br>
            <a href="${quotationUrl}" style="color: #A9780F;">${quotationUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Este es un mensaje automático, por favor no respondas a este correo.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending quotation email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending quotation email:", error);
    return { success: false, error };
  }
}

export async function sendPaymentNotificationEmail(
  userName: string,
  amount: string,
  currency: string,
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Daka <noreply@reservas.dakadominicana.com>",
      to: ["Daka.dominicana@gmail.com"],
      subject: "Nuevo Pago Recibido - Daka Reservas",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #131E29;">Nuevo Pago Registrado</h1>
          <p style="font-size: 16px; line-height: 1.6;">El usuario <strong>${userName}</strong> ha subido un nuevo comprobante de pago.</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #A9780F; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px;">Monto: <strong>${amount} ${currency}</strong></p>
          </div>
          <p style="font-size: 14px; color: #666;">
            Por favor ingresa al panel administrativo para verificar el comprobante y aprobar el pago.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Notificación automática del sistema de reservas.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending payment notification:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending payment notification:", error);
    return { success: false, error };
  }
}

const escaparHtml = (texto: string) =>
  texto.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export async function sendAccountStatementEmail(params: {
  email: string;
  name: string;
  local: string;
  recibido: string;
  pendiente: string;
  pdf: Uint8Array;
  filename: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Daka <noreply@reservas.dakadominicana.com>",
      to: [params.email],
      subject: `Estado de cuenta de tu local ${params.local}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #131E29;">Hola, ${escaparHtml(params.name)}</h1>
          <p style="font-size: 16px; line-height: 1.6;">Registramos tu pago. Adjunto va el estado de cuenta actualizado de tu local ${escaparHtml(params.local)}.</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #A9780F; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 16px;">Total recibido: <strong>${params.recibido}</strong></p>
            <p style="margin: 0; font-size: 16px;">Balance pendiente: <strong>${params.pendiente}</strong></p>
          </div>
          <p style="color: #666; font-size: 14px;">
            Si algún pago no aparece o un monto no coincide, llámanos al 829-885-2555 o al 829-573-6200.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Daka Dominicana SRL. Este correo se envía desde una dirección que no recibe respuestas.
          </p>
        </div>
      `,
      attachments: [
        { filename: params.filename, content: Buffer.from(params.pdf) },
      ],
    });

    if (error) {
      console.error("Error sending account statement:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending account statement:", error);
    return { success: false, error };
  }
}
