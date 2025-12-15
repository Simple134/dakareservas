import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cleanUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash if present

    const { data, error } = await resend.emails.send({
      from: 'Daka <onboarding@resend.dev>', // Update this with your verified domain
      to: [email],
      subject: 'Invitación a Daka',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hola ${name},</h1>
          <p>Has sido invitado a registrarte en la plataforma de Dakabana.</p>
          <p>Tener una cuenta te permitirá gestionar tus inversiones y propiedades de manera segura.</p>
          <div style="margin: 30px 0;">
            <a href="${cleanUrl}/user" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Registrarse en Dakabana</a>
          </div>
          <p style="color: #666; font-size: 14px;">Si no esperabas este correo, puedes ignorarlo.</p>
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
