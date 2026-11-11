import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase/admin";

/**
 * Exige un administrador con sesión válida. Devuelve la respuesta de rechazo,
 * o null si la petición puede seguir.
 *
 * La sesión del navegador vive en localStorage, no en cookies, así que el
 * cliente tiene que mandar el token en la cabecera Authorization.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const cabecera = request.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { data: perfil } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar los comprobantes" },
      { status: 403 },
    );
  }
  return null;
}
