import { NextRequest, NextResponse } from "next/server";

/**
 * Protección de las rutas de datos del ERP.
 *
 * Va en `proxy.ts`, no en `middleware.ts`: en Next 16 esa convención está
 * deprecada y, además de avisarlo, DESCARTA las peticiones POST en silencio
 * (devuelven 200 con cuerpo vacío y no llegan al route handler). Con
 * middleware.ts presente, toda la escritura de la aplicación quedaba muerta.
 *
 * PROBLEMA QUE RESUELVE: hoy `GET /api/erp/pendingRecord` devuelve todas
 * las facturas con importes y nombres de proveedores a cualquiera que la pida,
 * sin sesión. Era así también antes de la migración (los handlers siempre
 * fueron passthrough), pero ahora los datos son nuestros y el cliente de
 * servidor usa la service_role, que salta la RLS.
 *
 * POR QUÉ ESTÁ DESACTIVADA POR DEFECTO: el cliente del navegador
 * (src/lib/supabase/client.ts) usa el almacenamiento por defecto de
 * supabase-js, que es localStorage, así que las peticiones de la UI NO llevan
 * cookie de sesión ni cabecera Authorization. Activar esto sin cambiar antes
 * ese almacenamiento a cookies (o sin añadir el token a los ~30 `fetch` de la
 * UI) bloquearía la aplicación entera.
 *
 * PARA ACTIVARLA hacen falta dos cosas, en este orden:
 *   1. Que la sesión viaje al servidor: instalar `@supabase/ssr` y usar
 *      `createBrowserClient` en src/lib/supabase/client.ts, que guarda la
 *      sesión en cookies. Es un cambio central, sin tocar componentes, pero
 *      cierra la sesión activa de todos los usuarios una vez.
 *   2. Poner API_AUTH_REQUIRED=true y comprobar con un inicio de sesión real
 *      que el panel sigue cargando.
 */
const AUTH_REQUIRED = process.env.API_AUTH_REQUIRED === "true";

const PROTEGIDAS = ["/api/erp"];

export default async function proxy(request: NextRequest) {
  if (!AUTH_REQUIRED) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!PROTEGIDAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = extraerToken(request);
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // La validación se delega en el endpoint de Auth de Supabase: comprobar la
  // firma aquí exigiría el secreto del JWT, que no está disponible en el Edge.
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
    },
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  return NextResponse.next();
}

function extraerToken(request: NextRequest): string | null {
  const cabecera = request.headers.get("authorization");
  if (cabecera?.startsWith("Bearer ")) return cabecera.slice(7);

  // Cookie de @supabase/ssr: sb-<ref>-auth-token, con el JSON de la sesión.
  for (const cookie of request.cookies.getAll()) {
    if (!/^sb-.*-auth-token(\.\d+)?$/.test(cookie.name)) continue;
    try {
      const valor = cookie.value.startsWith("base64-")
        ? atob(cookie.value.slice(7))
        : cookie.value;
      const sesion = JSON.parse(valor);
      if (sesion?.access_token) return sesion.access_token;
    } catch {
      // Cookie partida en varios trozos: se ignora y se prueba la siguiente.
    }
  }
  return null;
}

export const config = {
  matcher: ["/api/erp/:path*"],
};
