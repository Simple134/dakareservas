import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role, para uso EXCLUSIVO en el servidor.
 *
 * Salta la RLS, así que nunca debe importarse desde un componente de cliente.
 * El nombre de la variable no lleva el prefijo NEXT_PUBLIC_ precisamente para
 * que Next no la incluya en el bundle del navegador; la comprobación de abajo
 * hace que un import accidental falle de inmediato en vez de degradar en
 * silencio a una clave ausente.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/supabase/admin.ts es solo de servidor: usa src/lib/supabase/client.ts en el cliente.",
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurado");
if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no está configurado (necesario con DATA_SOURCE=supabase)",
  );
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
