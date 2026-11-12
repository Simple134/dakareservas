import { NextRequest, NextResponse } from "next/server";
import { getAppData, getDivisions } from "@/src/lib/erp";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { sendAccountStatementEmail } from "@/src/lib/email";
import { estadoDeCuentaDeLocal, importe } from "@/src/lib/locales/statement";
import {
  construirEstadoCuentaLocalPDF,
  nombreArchivoEstado,
} from "@/lib/generateEstadoCuentaLocalPDF";

/** Devuelve la respuesta de rechazo, o `null` si quien llama es administrador. */
async function exigirAdmin(request: NextRequest): Promise<NextResponse | null> {
  const cabecera = request.headers.get("authorization");
  const token = cabecera?.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const { data: perfil } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede enviar estados de cuenta." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Envía al cliente el estado de cuenta de su local, en PDF adjunto.
 * Manda datos financieros por correo, así que comprueba la sesión por su
 * cuenta en vez de depender de `proxy.ts`, que está desactivado por defecto.
 * El destinatario y el nombre del proyecto salen de la base de datos, nunca
 * del cuerpo de la petición.
 */
export async function POST(request: NextRequest) {
  try {
    const rechazo = await exigirAdmin(request);
    if (rechazo) return rechazo;

    const { appId, localId } = (await request.json()) as {
      appId?: number | string;
      localId?: number;
    };
    if (!appId || !localId) {
      return NextResponse.json(
        { error: "Faltan appId y localId." },
        { status: 400 },
      );
    }

    const proyecto = (await getDivisions()).find(
      (d) => String(d.metadata?.unique_id) === String(appId),
    )?.name;

    const [locales, reservas, pagos, clientes] = await Promise.all(
      ["locales", "reservas", "payments", "User"].map(
        async (type) => (await getAppData(Number(appId), { type })).appData,
      ),
    );
    const local = locales.find((l) => Number(l.data?.id) === Number(localId));
    if (!local) {
      return NextResponse.json(
        { error: `No existe el local ${localId} en este proyecto.` },
        { status: 404 },
      );
    }

    const estado = estadoDeCuentaDeLocal(local, reservas, pagos, clientes);
    if (!estado.cliente?.email) {
      return NextResponse.json(
        {
          error:
            "El cliente de este local no tiene correo registrado. Descarga el PDF y envíalo por otra vía.",
        },
        { status: 422 },
      );
    }

    const logoRes = await fetch(
      new URL("/pdf/logo-daka.png", request.nextUrl.origin),
    );
    const pdf = await construirEstadoCuentaLocalPDF(estado, {
      proyecto,
      logo: logoRes.ok ? await logoRes.arrayBuffer() : undefined,
    });

    const envio = await sendAccountStatementEmail({
      email: estado.cliente.email,
      name: estado.cliente.nombre,
      local: estado.codigo,
      recibido: importe(estado.totalRecibido, estado.moneda),
      pendiente: importe(estado.pendiente, estado.moneda),
      pdf,
      filename: nombreArchivoEstado(estado),
    });
    if (!envio.success) {
      return NextResponse.json(
        { error: "El servicio de correo rechazó el envío. Intenta de nuevo." },
        { status: 502 },
      );
    }

    return NextResponse.json({ enviadoA: estado.cliente.email });
  } catch (error: unknown) {
    console.error("Error al enviar el estado de cuenta:", error);
    return NextResponse.json(
      { error: "No se pudo generar el estado de cuenta." },
      { status: 500 },
    );
  }
}
