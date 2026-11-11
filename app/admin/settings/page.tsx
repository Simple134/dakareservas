"use client";

import { useEffect, useState } from "react";
import { Check, Database, Receipt, Shield, User } from "lucide-react";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { TabsBar } from "@/src/components/ui/tabs-bar";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase/client";
import { shortDate } from "@/src/lib/format";
import { formatNcf } from "@/src/lib/ncf";
import type { FiscalNumeral, FiscalNumeralType } from "@/src/types/erp";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * Esta página era decorativa de principio a fin: el perfil traía «Darlin
 * Cepeda / darlin.cepeda@daka.com» escrito en el código, el botón «Guardar
 * cambios» no tenía manejador, y las pestañas de Notificaciones y Apariencia
 * ofrecían interruptores de idioma, tema y zona horaria que no se guardaban en
 * ningún sitio ni existían en el esquema.
 *
 * Quedan las tres cosas que sí se pueden hacer de verdad contra Supabase:
 * editar el nombre del propio perfil (`profiles.full_name`, con la política
 * «Users can update own profile»), cambiar la contraseña
 * (`supabase.auth.updateUser`) y consultar los datos de la sesión. Las que no
 * tienen dónde guardarse no se pintan: un interruptor que no persiste es peor
 * que su ausencia.
 */

const TABS = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "seguridad", label: "Seguridad", icon: Shield },
  { id: "comprobantes", label: "Comprobantes", icon: Receipt },
  { id: "sistema", label: "Sistema", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

function Aviso({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-[0.8125rem] ${
        aviso.tipo === "ok" ? "text-success" : "text-danger"
      }`}
    >
      {aviso.tipo === "ok" && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
      {aviso.texto}
    </p>
  );
}

function Panel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-rule bg-paper">
      <header className="border-b border-rule px-5 py-4">
        <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 max-w-[65ch] text-[0.8125rem] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-rule px-5 py-3.5">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Fila de dato en sólo lectura. */
function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-2.5 last:border-0">
      <span className="text-[0.8125rem] text-ink-2">{label}</span>
      <span className="text-[0.8125rem] font-medium text-ink">{value}</span>
    </div>
  );
}

const NOMBRE_COMPROBANTE: Record<FiscalNumeralType, string> = {
  TAX_CREDIT: "Crédito fiscal",
  CONSUMER: "Consumo",
  CREDIT_NOTE: "Nota de crédito",
  SPECIAL_REGIME: "Regímenes especiales",
  GOVERNMENT: "Gubernamental",
  TAX_CREDIT_ELECTRONIC: "Crédito fiscal electrónico",
};

/** La API de comprobantes exige el token de la sesión: no viaja en cookies. */
async function cabeceraSesion(): Promise<Record<string, string>> {
  const sesion = await Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, rechazar) =>
      setTimeout(
        () =>
          rechazar(
            new Error(
              "La sesión no respondió. Recarga la página e intenta de nuevo.",
            ),
          ),
        8000,
      ),
    ),
  ]);
  const token = sesion.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

function SecuenciaFiscal({
  numeral,
  onSaved,
}: {
  numeral: FiscalNumeral;
  onSaved: (n: FiscalNumeral) => void;
}) {
  const [proximo, setProximo] = useState(String(numeral.nextValue));
  const [ultimo, setUltimo] = useState(
    numeral.maxValue === null ? "" : String(numeral.maxValue),
  );
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const nextValue = Number(proximo);
  const maxValue = ultimo === "" ? null : Number(ultimo);
  const proximoValido = proximo !== "" && nextValue >= 1;
  // Igual que en el servidor: max + 1 es una secuencia consumida entera.
  const ultimoValido = maxValue === null || nextValue <= maxValue + 1;
  const agotada = maxValue !== null && nextValue > maxValue;
  const cambiado =
    nextValue !== numeral.nextValue || maxValue !== numeral.maxValue;
  const idProximo = `ncf-proximo-${numeral.type}`;
  const idUltimo = `ncf-ultimo-${numeral.type}`;

  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/erp/fiscalNumerals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(await cabeceraSesion()),
        },
        body: JSON.stringify({ type: numeral.type, nextValue, maxValue }),
      });
      const cuerpo = await res.json();
      if (!res.ok) throw new Error(cuerpo.details || cuerpo.error);
      onSaved(cuerpo as FiscalNumeral);
      setAviso({ tipo: "ok", texto: "Secuencia guardada" });
    } catch (error) {
      setAviso({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la secuencia.",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      className="border-b border-rule py-4 first:pt-0 last:border-0 last:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (cambiado && proximoValido && ultimoValido) guardar();
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[0.875rem] font-semibold text-ink">
          <span className="tabular font-mono">{numeral.prefix}</span>
          {" · "}
          {NOMBRE_COMPROBANTE[numeral.type] ?? numeral.type}
        </h3>
        <p className="text-[0.8125rem] text-ink-2">
          {agotada ? (
            <span className="text-danger">Secuencia agotada</span>
          ) : proximoValido ? (
            <>
              Próximo comprobante:{" "}
              <span className="tabular font-mono font-medium text-ink">
                {formatNcf(numeral.prefix, nextValue)}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={idProximo}>Próximo número a emitir</Label>
          <Input
            id={idProximo}
            className="mt-1.5"
            inputMode="numeric"
            numeric
            state={proximo !== "" && !proximoValido ? "error" : "idle"}
            value={proximo}
            onChange={(e) => setProximo(soloDigitos(e.target.value))}
          />
          {!proximoValido && (
            <p className="mt-1.5 text-[0.75rem] text-danger">
              Escribe un número desde 1.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={idUltimo}>Último número autorizado</Label>
          <Input
            id={idUltimo}
            className="mt-1.5"
            inputMode="numeric"
            numeric
            placeholder="Sin tope"
            state={ultimoValido ? "idle" : "error"}
            value={ultimo}
            onChange={(e) => setUltimo(soloDigitos(e.target.value))}
          />
          {!ultimoValido && (
            <p className="mt-1.5 text-[0.75rem] text-danger">
              El próximo número ya pasa de este tope.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <Aviso aviso={aviso} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!cambiado || !proximoValido || !ultimoValido || guardando}
          loading={guardando}
        >
          Guardar secuencia {numeral.prefix}
        </Button>
      </div>
    </form>
  );
}

function ComprobantesPanel() {
  const [numerales, setNumerales] = useState<FiscalNumeral[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/erp/fiscalNumerals", {
          headers: await cabeceraSesion(),
        });
        const cuerpo = await res.json();
        if (!res.ok) throw new Error(cuerpo.details || cuerpo.error);
        if (!vivo) return;
        setNumerales(cuerpo as FiscalNumeral[]);
        setError(null);
      } catch (e) {
        if (!vivo) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [intento]);

  return (
    <Panel
      title="Comprobantes fiscales"
      description="Secuencias de NCF autorizadas por la DGII. Toda factura de venta, al contado o a crédito, toma el siguiente número de la secuencia B01 y se imprime como válida para crédito fiscal."
    >
      {error ? (
        <div className="space-y-3">
          <p role="alert" className="text-[0.8125rem] text-danger">
            No se pudieron cargar las secuencias: {error}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setNumerales(null);
              setIntento((n) => n + 1);
            }}
          >
            Reintentar la carga
          </Button>
        </div>
      ) : numerales === null ? (
        <p role="status" className="text-[0.8125rem] text-ink-2">
          Cargando secuencias…
        </p>
      ) : numerales.length === 0 ? (
        <p className="text-[0.8125rem] text-ink-2">
          No hay secuencias en la tabla fiscal_numerals. Hay que crearlas en la
          base de datos antes de poder emitir facturas con NCF.
        </p>
      ) : (
        <div>
          {numerales.map((n) => (
            <SecuenciaFiscal
              key={n.type}
              numeral={n}
              onSaved={(guardado) =>
                setNumerales((lista) =>
                  (lista ?? []).map((x) =>
                    x.type === guardado.type ? guardado : x,
                  ),
                )
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function SettingsPage() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("perfil");

  // Perfil
  const [fullName, setFullName] = useState("");
  const [nombreOriginal, setNombreOriginal] = useState("");
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState<Aviso>(null);

  // Contraseña
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [avisoPass, setAvisoPass] = useState<Aviso>(null);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    // El estado se escribe tras el await: hacerlo en el cuerpo del efecto
    // dispara un render en cascada.
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!vivo) return;
      if (!error && data) {
        setFullName(data.full_name ?? "");
        setNombreOriginal(data.full_name ?? "");
      }
      setCargandoPerfil(false);
    })();
    return () => {
      vivo = false;
    };
  }, [user]);

  const guardarPerfil = async () => {
    if (!user) return;
    setGuardandoPerfil(true);
    setAvisoPerfil(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setGuardandoPerfil(false);
    if (error) {
      setAvisoPerfil({ tipo: "error", texto: error.message });
      return;
    }
    setNombreOriginal(fullName.trim());
    setAvisoPerfil({ tipo: "ok", texto: "Nombre actualizado" });
  };

  const cambiarPassword = async () => {
    setAvisoPass(null);
    if (password.length < 8) {
      setAvisoPass({
        tipo: "error",
        texto: "La contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (password !== password2) {
      setAvisoPass({
        tipo: "error",
        texto: "Las dos contraseñas no coinciden.",
      });
      return;
    }
    setGuardandoPass(true);
    const { error } = await supabase.auth.updateUser({ password });
    setGuardandoPass(false);
    if (error) {
      setAvisoPass({ tipo: "error", texto: error.message });
      return;
    }
    setPassword("");
    setPassword2("");
    setAvisoPass({ tipo: "ok", texto: "Contraseña actualizada" });
  };

  const nombreCambiado = fullName.trim() !== nombreOriginal;

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Tu perfil, tu acceso, los comprobantes fiscales y los datos de la sesión."
      />

      <PageBody className="max-w-3xl space-y-5">
        <TabsBar
          tabs={TABS}
          value={activeTab}
          onChange={setActiveTab}
          aria-label="Secciones de configuración"
        />

        {activeTab === "perfil" && (
          <Panel
            title="Perfil"
            description="El nombre es el único campo editable: el correo y el rol los gestiona el administrador del sistema."
            footer={
              <>
                <Aviso aviso={avisoPerfil} />
                <Button
                  size="sm"
                  onClick={guardarPerfil}
                  disabled={
                    !nombreCambiado || guardandoPerfil || cargandoPerfil
                  }
                  loading={guardandoPerfil}
                >
                  Guardar nombre
                </Button>
              </>
            }
          >
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                className="mt-1.5"
                value={fullName}
                disabled={cargandoPerfil}
                placeholder={cargandoPerfil ? "Cargando…" : "Tu nombre"}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="pt-1">
              <Dato label="Correo electrónico" value={user?.email ?? "—"} />
              <Dato
                label="Rol"
                value={
                  <Badge variant={role === "admin" ? "brand" : "default"}>
                    {role === "admin" ? "Administrador" : "Usuario"}
                  </Badge>
                }
              />
            </div>
          </Panel>
        )}

        {activeTab === "seguridad" && (
          <Panel
            title="Cambiar contraseña"
            description="Se aplica de inmediato a esta cuenta. No hace falta la contraseña actual porque la sesión ya está verificada."
            footer={
              <>
                <Aviso aviso={avisoPass} />
                <Button
                  size="sm"
                  onClick={cambiarPassword}
                  disabled={!password || !password2 || guardandoPass}
                  loading={guardandoPass}
                >
                  Cambiar contraseña
                </Button>
              </>
            }
          >
            <div>
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1.5 text-[0.75rem] text-ink-3">
                Mínimo 8 caracteres.
              </p>
            </div>
            <div>
              <Label htmlFor="password2">Repetir contraseña</Label>
              <Input
                id="password2"
                type="password"
                autoComplete="new-password"
                className="mt-1.5"
                state={password2 && password !== password2 ? "error" : "idle"}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              {password2 && password !== password2 && (
                <p className="mt-1.5 text-[0.75rem] text-danger">
                  Las dos contraseñas no coinciden.
                </p>
              )}
            </div>
          </Panel>
        )}

        {activeTab === "comprobantes" && <ComprobantesPanel />}

        {activeTab === "sistema" && (
          <Panel
            title="Sesión y sistema"
            description="Datos de sólo lectura, útiles al reportar una incidencia."
          >
            <div>
              <Dato
                label="Identificador de usuario"
                value={
                  <span className="tabular font-mono text-[0.75rem]">
                    {user?.id ?? "—"}
                  </span>
                }
              />
              <Dato
                label="Sesión iniciada"
                value={shortDate(user?.last_sign_in_at ?? null)}
              />
              <Dato
                label="Cuenta creada"
                value={shortDate(user?.created_at ?? null)}
              />
              <Dato
                label="Correo verificado"
                value={
                  user?.email_confirmed_at ? (
                    <Badge variant="success" dot>
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="warning" dot>
                      Sin verificar
                    </Badge>
                  )
                }
              />
              <Dato label="Base de datos" value="Supabase · Postgres" />
            </div>
          </Panel>
        )}
      </PageBody>
    </>
  );
}
