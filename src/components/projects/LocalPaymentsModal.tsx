"use client";

import { useId, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { NativeSelect } from "@/src/components/ui/native-select";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { FieldError, Modal, ModalSection } from "@/src/components/ui/modal";
import type { AppData } from "@/src/types/erp";
import { supabase } from "@/src/lib/supabase/client";
import {
  METODOS_PAGO,
  TIPOS_PAGO,
  describirPago,
  estadoDeCuentaDeLocal,
  fechaCorta,
  importe,
  siguienteRecibo,
  type FilaEstado,
  type LocalPayment,
  type MetodoPago,
  type TipoPago,
} from "@/src/lib/locales/statement";
import { descargarEstadoCuentaLocalPDF } from "@/lib/generateEstadoCuentaLocalPDF";

interface LocalPaymentsModalProps {
  local: AppData;
  /** Todos los locales del proyecto: de ahí sale el siguiente número de recibo. */
  locales: AppData[];
  reservas: AppData[];
  pagos: AppData[];
  clientes: AppData[];
  projectName: string;
  appId: string;
  onClose: () => void;
  onSaved: (local: AppData) => void;
}

const hoy = () => {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

const formularioVacio = () => ({
  documento: "",
  type: "cuota" as TipoPago,
  cuotaNumber: "",
  date: hoy(),
  amount: "",
  metodo: "deposito" as MetodoPago,
  cuenta: "",
  tasa: "",
  description: "",
});

function Campo({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow mb-1.5 block">
        {label}
      </label>
      {children(id)}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function LocalPaymentsModal({
  local,
  locales,
  reservas,
  pagos,
  clientes,
  projectName,
  appId,
  onClose,
  onSaved,
}: LocalPaymentsModalProps) {
  const [payments, setPayments] = useState<LocalPayment[]>(
    (local.data?.payments as LocalPayment[] | undefined) ?? [],
  );
  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState(formularioVacio);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<FilaEstado | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  const localActual = useMemo(
    () => ({ ...local, data: { ...local.data, payments } }),
    [local, payments],
  );
  const estado = useMemo(
    () => estadoDeCuentaDeLocal(localActual, reservas, pagos, clientes),
    [localActual, reservas, pagos, clientes],
  );
  const reciboSugerido = useMemo(
    () =>
      siguienteRecibo(
        locales.map((l) => (l.id === local.id ? localActual : l)),
      ),
    [locales, local.id, localActual],
  );

  const ocupado = guardando || eliminando || enviando;
  const cambiar = (
    campo: keyof ReturnType<typeof formularioVacio>,
    v: string,
  ) => setForm((f) => ({ ...f, [campo]: v }));

  const abrirFormulario = () => {
    setForm({ ...formularioVacio(), documento: reciboSugerido });
    setArchivo(null);
    setErrores({});
    setAviso(null);
    setFormAbierto(true);
  };

  const guardarLista = async (lista: LocalPayment[]) => {
    const res = await fetch("/api/erp/appData", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: local.id,
        appId: local.appId,
        type: local.type,
        data: { payments: lista },
        strategy: "merge",
      }),
    });
    if (!res.ok) throw new Error(`appData ${res.status}`);
    setPayments(lista);
    onSaved({ ...local, data: { ...local.data, payments: lista } });
  };

  const validar = () => {
    const e: Record<string, string> = {};
    const monto = Number(form.amount);
    if (!(monto > 0)) e.amount = "Escribe un monto mayor que cero.";
    else if (monto > estado.pendiente + 0.005)
      e.amount = `Supera el balance pendiente (${importe(estado.pendiente, estado.moneda)}).`;
    if (!form.date) e.date = "Indica la fecha del pago.";
    if (form.tasa && !(Number(form.tasa) > 0))
      e.tasa = "La tasa debe ser un número mayor que cero.";
    const doc = form.documento.trim();
    const repetido =
      doc &&
      locales.some((l) =>
        (
          (l.id === local.id ? payments : l.data?.payments) as
            LocalPayment[] | undefined
        )?.some((p) => p.documento === doc),
      );
    if (repetido) e.documento = `El recibo ${doc} ya está en uso.`;
    return e;
  };

  const registrarPago = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    setAviso(null);
    try {
      let receipt_url: string | undefined;
      if (archivo) {
        const cuerpo = new FormData();
        cuerpo.append("file", archivo);
        const subida = await fetch("/api/erp/uploadFile", {
          method: "POST",
          body: cuerpo,
        });
        if (!subida.ok) throw new Error("comprobante");
        const datos = await subida.json();
        receipt_url = datos.file?.public || datos.file?.url;
      }

      const cuota = Number(form.cuotaNumber) || undefined;
      const pago: LocalPayment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        amount: Number(form.amount),
        date: form.date,
        type: form.type,
        description:
          form.description.trim() ||
          describirPago({
            type: form.type,
            cuotaNumber: cuota,
            date: form.date,
            localId: estado.localId,
            cliente: estado.cliente?.nombre,
          }),
        metodo: form.metodo,
        ...(form.documento.trim() && { documento: form.documento.trim() }),
        ...(form.type === "cuota" && cuota && { cuotaNumber: cuota }),
        ...(form.cuenta.trim() && { cuenta: form.cuenta.trim() }),
        ...(form.tasa && { tasa: Number(form.tasa) }),
        ...(receipt_url && { receipt_url }),
      };
      await guardarLista([...payments, pago]);
      setFormAbierto(false);
      setAviso({
        tipo: "ok",
        texto: `Pago de ${importe(pago.amount, estado.moneda)} registrado. El estado de cuenta ya lo incluye.`,
      });
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      setAviso({
        tipo: "error",
        texto:
          error instanceof Error && error.message === "comprobante"
            ? "No se pudo subir el comprobante. El pago no se guardó; intenta de nuevo o guárdalo sin archivo."
            : "No se pudo guardar el pago. Revisa la conexión e intenta de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPago = async () => {
    if (!porEliminar?.pagoId) return;
    setEliminando(true);
    try {
      await guardarLista(payments.filter((p) => p.id !== porEliminar.pagoId));
      setAviso({ tipo: "ok", texto: "Pago eliminado." });
    } catch (error) {
      console.error("Error al eliminar el pago:", error);
      setAviso({
        tipo: "error",
        texto: "No se pudo eliminar el pago. Intenta de nuevo.",
      });
    } finally {
      setEliminando(false);
      setPorEliminar(null);
    }
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarEstadoCuentaLocalPDF(estado, projectName);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      setAviso({ tipo: "error", texto: "No se pudo generar el PDF." });
    } finally {
      setDescargando(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const res = await fetch("/api/erp/localStatement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sesion.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ appId, localId: estado.localId }),
      });
      const datos = await res.json();
      setAviso(
        res.ok
          ? {
              tipo: "ok",
              texto: `Estado de cuenta enviado a ${datos.enviadoA}.`,
            }
          : {
              tipo: "error",
              texto: datos.error ?? "No se pudo enviar el correo.",
            },
      );
    } catch (error) {
      console.error("Error al enviar el estado de cuenta:", error);
      setAviso({
        tipo: "error",
        texto: "No se pudo enviar el correo. Revisa la conexión.",
      });
    } finally {
      setEnviando(false);
    }
  };

  const correo = estado.cliente?.email;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        busy={ocupado}
        size="xl"
        title={`Estado de cuenta, local ${estado.localId}`}
        description={[
          `Nivel ${estado.nivel}`,
          `${estado.area.toFixed(2)} m²`,
          estado.cliente?.nombre,
        ]
          .filter(Boolean)
          .join(" · ")}
        footer={
          <>
            <p className="text-[0.75rem] text-ink-2 sm:mr-auto">
              {correo
                ? `El correo va a ${correo}.`
                : "Sin correo del cliente: descarga el PDF para enviarlo tú."}
            </p>
            <Button variant="outline" onClick={descargar} loading={descargando}>
              Descargar PDF
            </Button>
            <Button
              variant="outline"
              onClick={enviar}
              loading={enviando}
              disabled={!correo || estado.filas.length === 0 || ocupado}
            >
              Enviar al cliente
            </Button>
            {!formAbierto && (
              <Button
                onClick={abrirFormulario}
                disabled={estado.pendiente <= 0 || ocupado}
              >
                Registrar pago
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          <dl className="grid grid-cols-1 divide-y divide-rule rounded-[8px] border border-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {(
              [
                ["Valor del local", estado.valor],
                ["Total recibido", estado.totalRecibido],
                ["Balance pendiente", estado.pendiente],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="px-4 py-3">
                <dt className="eyebrow">{etiqueta}</dt>
                <dd className="tabular mt-1 font-display text-[1.125rem] font-semibold text-ink">
                  {importe(valor, estado.moneda)}
                </dd>
              </div>
            ))}
          </dl>

          {aviso && (
            <p
              role={aviso.tipo === "error" ? "alert" : "status"}
              className={
                aviso.tipo === "error"
                  ? "rounded-[8px] bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
                  : "rounded-[8px] bg-success-soft px-3 py-2 text-[0.8125rem] text-success"
              }
            >
              {aviso.texto}
            </p>
          )}

          {formAbierto && (
            <form
              onSubmit={registrarPago}
              noValidate
              className="rounded-[8px] border border-rule bg-paper-2 p-4"
            >
              <ModalSection title="Nuevo pago">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Campo label="Recibo" error={errores.documento}>
                    {(id) => (
                      <Input
                        id={id}
                        value={form.documento}
                        onChange={(e) => cambiar("documento", e.target.value)}
                        state={errores.documento ? "error" : "idle"}
                      />
                    )}
                  </Campo>
                  <Campo label="Fecha del pago" error={errores.date}>
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        value={form.date}
                        onChange={(e) => cambiar("date", e.target.value)}
                        state={errores.date ? "error" : "idle"}
                      />
                    )}
                  </Campo>
                  <Campo
                    label={`Monto (${estado.moneda})`}
                    error={errores.amount}
                  >
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        numeric
                        value={form.amount}
                        onChange={(e) => cambiar("amount", e.target.value)}
                        state={errores.amount ? "error" : "idle"}
                      />
                    )}
                  </Campo>
                  <Campo label="Tasa del día (opcional)" error={errores.tasa}>
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        numeric
                        value={form.tasa}
                        onChange={(e) => cambiar("tasa", e.target.value)}
                        state={errores.tasa ? "error" : "idle"}
                      />
                    )}
                  </Campo>
                  <Campo label="Concepto">
                    {(id) => (
                      <NativeSelect
                        id={id}
                        value={form.type}
                        onChange={(e) => cambiar("type", e.target.value)}
                      >
                        {TIPOS_PAGO.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </Campo>
                  {form.type === "cuota" && (
                    <Campo label="Número de cuota">
                      {(id) => (
                        <Input
                          id={id}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          numeric
                          value={form.cuotaNumber}
                          onChange={(e) =>
                            cambiar("cuotaNumber", e.target.value)
                          }
                        />
                      )}
                    </Campo>
                  )}
                  <Campo label="Método de pago">
                    {(id) => (
                      <NativeSelect
                        id={id}
                        value={form.metodo}
                        onChange={(e) => cambiar("metodo", e.target.value)}
                      >
                        {METODOS_PAGO.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </Campo>
                  <Campo label="Cuenta que recibió (opcional)">
                    {(id) => (
                      <Input
                        id={id}
                        inputMode="numeric"
                        value={form.cuenta}
                        onChange={(e) => cambiar("cuenta", e.target.value)}
                      />
                    )}
                  </Campo>
                  <Campo
                    label="Descripción (opcional)"
                    className="sm:col-span-2"
                  >
                    {(id) => (
                      <Input
                        id={id}
                        value={form.description}
                        placeholder={describirPago({
                          type: form.type,
                          cuotaNumber: Number(form.cuotaNumber) || undefined,
                          date: form.date || hoy(),
                          localId: estado.localId,
                          cliente: estado.cliente?.nombre,
                        })}
                        onChange={(e) => cambiar("description", e.target.value)}
                      />
                    )}
                  </Campo>
                  <Campo
                    label="Comprobante (opcional)"
                    className="sm:col-span-2"
                  >
                    {(id) => (
                      <Input
                        id={id}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setArchivo(e.target.files?.[0] ?? null)
                        }
                      />
                    )}
                  </Campo>
                </div>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormAbierto(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={guardando}>
                    Guardar pago
                  </Button>
                </div>
              </ModalSection>
            </form>
          )}

          {estado.filas.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-rule-strong px-4 py-8 text-center text-[0.8125rem] text-ink-2">
              Este local no tiene pagos todavía. Registra el primero y el estado
              de cuenta se arma solo.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[8px] border border-rule">
              <table className="w-full min-w-[720px] text-[0.8125rem]">
                <thead className="bg-paper-2 text-left">
                  <tr>
                    {[
                      "Recibo",
                      "Fecha",
                      "Descripción",
                      "Tasa",
                      "Aplicado",
                      "Balance",
                    ].map((c, i) => (
                      <th
                        key={c}
                        scope="col"
                        className={`eyebrow px-3 py-2 ${i > 2 ? "text-right" : ""}`}
                      >
                        {c}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {estado.filas.map((f, i) => (
                    <tr key={f.pagoId ?? `reserva-${i}`}>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-ink">
                        {f.documento || "Sin recibo"}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-ink-2">
                        {fechaCorta(f.fecha)}
                      </td>
                      <td className="px-3 py-2 text-ink">
                        {f.descripcion}
                        {f.metodo && (
                          <span className="block text-[0.75rem] text-ink-2">
                            {f.metodo}
                          </span>
                        )}
                        {f.comprobante && (
                          <a
                            href={f.comprobante}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.75rem] text-gold underline underline-offset-2 hover:text-gold-strong"
                          >
                            Ver comprobante
                          </a>
                        )}
                      </td>
                      <td className="tabular px-3 py-2 text-right text-ink-2">
                        {f.tasa ? f.tasa.toFixed(2) : ""}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right text-ink">
                        {importe(f.montoAplicado, estado.moneda)}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">
                        {importe(f.balance, estado.moneda)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        {f.pagoId && (
                          <Button
                            variant="ghost"
                            size="iconSm"
                            aria-label={`Eliminar el pago del ${fechaCorta(f.fecha)}`}
                            onClick={() => setPorEliminar(f)}
                            disabled={ocupado}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={porEliminar !== null}
        title="Eliminar pago"
        description={
          porEliminar
            ? `Se quita del estado de cuenta el pago de ${importe(porEliminar.montoAplicado, estado.moneda)} del ${fechaCorta(porEliminar.fecha)}${porEliminar.documento ? ` (${porEliminar.documento})` : ""}. El balance pendiente sube en ese monto.`
            : ""
        }
        confirmLabel="Eliminar pago"
        pendingLabel="Eliminando…"
        pending={eliminando}
        onConfirm={eliminarPago}
        onCancel={() => setPorEliminar(null)}
      />
    </>
  );
}
