"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { NativeSelect } from "@/src/components/ui/native-select";
import { BANCOS } from "@/src/lib/locales/bancos";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { FieldError, Modal, ModalSection } from "@/src/components/ui/modal";
import type { AppData } from "@/src/types/erp";
import {
  TASA_USD_DOP,
  aplicadoEn,
  type Moneda,
} from "@/src/lib/locales/moneda";
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
import {
  archivarPagoDeReserva,
  editarPagoDeReserva,
} from "@/src/lib/locales/pagosReserva";

const METODOS_RESERVA = [
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
];

/** Qué pago está abierto en el formulario: uno manual o uno que vino de la reserva. */
type Edicion =
  { origen: "manual"; id: string } | { origen: "reserva"; id: number };

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
  /** Un pago de la reserva se editó: el padre actualiza su lista. */
  onPagoActualizado: (pago: AppData) => void;
  /** Un pago de la reserva se archivó: el padre lo saca de su lista. */
  onPagoEliminado: (id: number) => void;
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
  currency: "USD" as Moneda,
  // Un valor de METODOS_PAGO en pagos manuales, o de METODOS_RESERVA en los de la reserva.
  metodo: "deposito" as string,
  cuenta: "",
  tasa: String(TASA_USD_DOP),
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
  onPagoActualizado,
  onPagoEliminado,
}: LocalPaymentsModalProps) {
  const [payments, setPayments] = useState<LocalPayment[]>(
    (local.data?.payments as LocalPayment[] | undefined) ?? [],
  );
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
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

  // Al editar, el pago abierto no cuenta: su monto nuevo reemplaza al viejo.
  const base = useMemo(() => {
    if (!editando) return estado;
    return estadoDeCuentaDeLocal(
      editando.origen === "manual"
        ? {
            ...local,
            data: {
              ...local.data,
              payments: payments.filter((p) => p.id !== editando.id),
            },
          }
        : localActual,
      reservas,
      editando.origen === "reserva"
        ? pagos.filter((p) => p.id !== editando.id)
        : pagos,
      clientes,
    );
  }, [
    editando,
    estado,
    local,
    localActual,
    payments,
    reservas,
    pagos,
    clientes,
  ]);

  const esReserva = editando?.origen === "reserva";
  const otraMonedaPago = form.currency !== estado.moneda;
  const montoForm = Number(form.amount) || 0;
  // Los pagos de la reserva no guardan tasa: siempre van a la fija.
  const tasaForm = esReserva ? TASA_USD_DOP : Number(form.tasa) || 0;
  // Lo que este pago descuenta del local, ya en la moneda del local.
  const aplicadoForm = aplicadoEn(
    { amount: montoForm, currency: form.currency, tasa: tasaForm },
    estado.moneda,
  );
  const progresoDespues =
    base.valor > 0
      ? Math.min(100, ((base.totalRecibido + aplicadoForm) / base.valor) * 100)
      : 0;

  const ocupado = guardando || eliminando || enviando;
  const cambiar = (
    campo: keyof ReturnType<typeof formularioVacio>,
    v: string,
  ) => setForm((f) => ({ ...f, [campo]: v }));

  const abrirFormulario = () => {
    setEditando(null);
    setForm({
      ...formularioVacio(),
      documento: reciboSugerido,
      currency: estado.moneda,
    });
    setArchivo(null);
    setErrores({});
    setAviso(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (fila: FilaEstado) => {
    if (fila.pagoId) {
      const pago = payments.find((p) => p.id === fila.pagoId);
      if (!pago) return;
      setEditando({ origen: "manual", id: pago.id });
      setForm({
        documento: pago.documento ?? "",
        type: pago.type,
        cuotaNumber: pago.cuotaNumber ? String(pago.cuotaNumber) : "",
        date: pago.date,
        amount: String(pago.amount),
        currency: pago.currency ?? estado.moneda,
        metodo: pago.metodo ?? "deposito",
        cuenta: pago.cuenta ?? "",
        tasa: String(pago.tasa ?? TASA_USD_DOP),
        description: pago.description,
      });
    } else {
      const pago = pagos.find((p) => p.id === fila.appDataId);
      if (!pago) return;
      setEditando({ origen: "reserva", id: pago.id });
      setForm({
        ...formularioVacio(),
        date: String(pago.data?.created_at ?? "").slice(0, 10) || hoy(),
        amount: String(pago.data?.amount ?? ""),
        currency: fila.moneda,
        metodo: String(pago.data?.payment_method ?? "transfer"),
      });
    }
    setArchivo(null);
    setErrores({});
    setAviso(null);
    setFormAbierto(true);
  };

  const cerrarFormulario = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  // La fila editada puede estar muy abajo: el formulario queda sobre la tabla.
  useEffect(() => {
    if (editando) formRef.current?.scrollIntoView({ block: "nearest" });
  }, [editando]);

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
    else if (aplicadoForm > base.pendiente + 0.005)
      e.amount = `Equivale a ${importe(aplicadoForm, estado.moneda)} y supera el balance pendiente (${importe(base.pendiente, estado.moneda)}).`;
    if (!form.date) e.date = "Indica la fecha del pago.";
    if (!esReserva) {
      if (otraMonedaPago && !(Number(form.tasa) > 0))
        e.tasa = "Indica la tasa para convertir el pago a la moneda del local.";
      else if (form.tasa && !(Number(form.tasa) > 0))
        e.tasa = "La tasa debe ser un número mayor que cero.";
    }
    const doc = form.documento.trim();
    const idPropio = editando?.origen === "manual" ? editando.id : null;
    const repetido =
      !esReserva &&
      doc &&
      locales.some((l) =>
        (
          (l.id === local.id ? payments : l.data?.payments) as
            LocalPayment[] | undefined
        )?.some((p) => p.documento === doc && p.id !== idPropio),
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
      if (editando?.origen === "reserva") {
        const original = pagos.find((p) => p.id === editando.id);
        if (!original) throw new Error("pago");
        // La hora se conserva: solo cambia el día.
        const hora = String(original.data?.created_at ?? "").slice(10);
        const actualizado = await editarPagoDeReserva(original, {
          amount: Number(form.amount),
          currency: form.currency,
          payment_method: form.metodo,
          created_at: `${form.date}${hora || "T12:00:00.000Z"}`,
        });
        onPagoActualizado(actualizado);
        cerrarFormulario();
        setAviso({ tipo: "ok", texto: "Pago actualizado." });
        return;
      }

      const anterior =
        editando?.origen === "manual"
          ? payments.find((p) => p.id === editando.id)
          : undefined;
      let receipt_url: string | undefined = anterior?.receipt_url;
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
        id:
          anterior?.id ??
          `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ...(anterior?.beneficiario_id && {
          beneficiario_id: anterior.beneficiario_id,
        }),
        ...(anterior?.beneficiario_nombre && {
          beneficiario_nombre: anterior.beneficiario_nombre,
        }),
        amount: Number(form.amount),
        currency: form.currency,
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
        metodo: form.metodo as MetodoPago,
        ...(form.documento.trim() && { documento: form.documento.trim() }),
        ...(form.type === "cuota" && cuota && { cuotaNumber: cuota }),
        ...(form.cuenta.trim() && { cuenta: form.cuenta.trim() }),
        ...(otraMonedaPago && { tasa: Number(form.tasa) }),
        ...(receipt_url && { receipt_url }),
      };
      await guardarLista(
        anterior
          ? payments.map((p) => (p.id === anterior.id ? pago : p))
          : [...payments, pago],
      );
      const verbo = anterior ? "actualizado" : "registrado";
      cerrarFormulario();
      setAviso({
        tipo: "ok",
        texto: otraMonedaPago
          ? `Pago de ${importe(pago.amount, form.currency)} ${verbo} como ${importe(aplicadoForm, estado.moneda)} a tasa ${tasaForm.toFixed(2)}. El estado de cuenta ya lo incluye.`
          : `Pago de ${importe(pago.amount, estado.moneda)} ${verbo}. El estado de cuenta ya lo incluye.`,
      });
    } catch (error) {
      console.error("Error al guardar el pago:", error);
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
    if (!porEliminar) return;
    setEliminando(true);
    try {
      if (porEliminar.pagoId) {
        await guardarLista(payments.filter((p) => p.id !== porEliminar.pagoId));
      } else {
        const pago = pagos.find((p) => p.id === porEliminar.appDataId);
        if (!pago) throw new Error("pago");
        await archivarPagoDeReserva(pago);
        onPagoEliminado(pago.id);
      }
      if (
        editando &&
        (editando.origen === "manual"
          ? editando.id === porEliminar.pagoId
          : editando.id === porEliminar.appDataId)
      )
        cerrarFormulario();
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
        // Con la confirmación abierta, Escape debe cerrar solo a ella.
        busy={ocupado || porEliminar !== null}
        size="xl"
        title={`Estado de cuenta, ${estado.nombre}`}
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

          <div>
            <div className="mb-1 flex flex-wrap justify-between gap-x-4 text-[0.75rem] text-ink-2">
              <span className="tabular">
                Recibido:{" "}
                {[
                  estado.recibido.USD > 0 &&
                    importe(estado.recibido.USD, "USD"),
                  estado.recibido.DOP > 0 &&
                    importe(estado.recibido.DOP, "DOP"),
                ]
                  .filter(Boolean)
                  .join(" + ") || "nada todavía"}
              </span>
              <span className="tabular">
                Progreso en {estado.moneda === "USD" ? "dólares" : "pesos"}:{" "}
                {estado.progreso.toFixed(1)} %
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso del cobro"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(estado.progreso)}
              className="h-1.5 overflow-hidden rounded-full bg-paper-3"
            >
              <div
                className="h-full bg-success"
                style={{ width: `${estado.progreso}%` }}
              />
            </div>
          </div>

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
              ref={formRef}
              onSubmit={registrarPago}
              noValidate
              className="rounded-[8px] border border-rule bg-paper-2 p-4"
            >
              <ModalSection title={editando ? "Editar pago" : "Nuevo pago"}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {!esReserva && (
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
                  )}
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
                  <Campo label="Moneda del pago">
                    {(id) => (
                      <NativeSelect
                        id={id}
                        value={form.currency}
                        onChange={(e) => cambiar("currency", e.target.value)}
                      >
                        <option value="USD">Dólares (US$)</option>
                        <option value="DOP">Pesos (RD$)</option>
                      </NativeSelect>
                    )}
                  </Campo>
                  <Campo
                    label={`Monto recibido (${form.currency === "USD" ? "US$" : "RD$"})`}
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
                  {otraMonedaPago && !esReserva && (
                    <Campo label="Tasa (RD$ por US$1)" error={errores.tasa}>
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
                  )}
                  {!esReserva && (
                    <>
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
                    </>
                  )}
                  <Campo label="Método de pago">
                    {(id) => (
                      <NativeSelect
                        id={id}
                        value={form.metodo}
                        onChange={(e) => {
                          const metodo = e.target.value;
                          setForm((f) => ({
                            ...f,
                            metodo,
                            // Un nombre de persona no es un banco, ni al revés.
                            cuenta:
                              (metodo === "efectivo") ===
                              (f.metodo === "efectivo")
                                ? f.cuenta
                                : "",
                          }));
                        }}
                      >
                        {(esReserva ? METODOS_RESERVA : METODOS_PAGO).map(
                          (m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ),
                        )}
                      </NativeSelect>
                    )}
                  </Campo>
                  {!esReserva && (
                    <Campo
                      label={
                        form.metodo === "efectivo"
                          ? "Recibido por (opcional)"
                          : "Cuenta que recibió (opcional)"
                      }
                    >
                      {(id) =>
                        form.metodo === "efectivo" ? (
                          <Input
                            id={id}
                            value={form.cuenta}
                            placeholder="Nombre de quien recibió"
                            maxLength={80}
                            onChange={(e) => cambiar("cuenta", e.target.value)}
                          />
                        ) : (
                          <NativeSelect
                            id={id}
                            value={form.cuenta}
                            onChange={(e) => cambiar("cuenta", e.target.value)}
                          >
                            <option value="">Sin especificar</option>
                            {form.cuenta &&
                              !BANCOS.some((b) => b === form.cuenta) && (
                                <option value={form.cuenta}>
                                  {form.cuenta}
                                </option>
                              )}
                            {BANCOS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </NativeSelect>
                        )
                      }
                    </Campo>
                  )}
                  {!esReserva && (
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
                          onChange={(e) =>
                            cambiar("description", e.target.value)
                          }
                        />
                      )}
                    </Campo>
                  )}
                  {!esReserva && (
                    <Campo
                      label={
                        editando &&
                        payments.find((p) => p.id === editando.id)?.receipt_url
                          ? "Reemplazar comprobante (opcional)"
                          : "Comprobante (opcional)"
                      }
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
                  )}
                </div>
                <div
                  aria-live="polite"
                  className="rounded-[8px] border border-rule bg-paper px-3 py-2.5 text-[0.8125rem]"
                >
                  <p className="eyebrow mb-1">Calculadora</p>
                  {montoForm > 0 ? (
                    <>
                      <p className="tabular text-ink">
                        {otraMonedaPago
                          ? tasaForm > 0
                            ? `${importe(montoForm, form.currency)} ${form.currency === "DOP" ? "÷" : "×"} ${tasaForm.toFixed(2)} = ${importe(aplicadoForm, estado.moneda)} aplicado al local`
                            : "Escribe la tasa para ver el equivalente."
                          : `${importe(montoForm, form.currency)} se aplican directo, sin conversión.`}
                      </p>
                      <p className="tabular mt-0.5 text-ink-2">
                        {tasaForm > 0 || !otraMonedaPago
                          ? `Progreso del cobro: ${base.progreso.toFixed(1)} % → ${progresoDespues.toFixed(1)} %`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-ink-2">
                      Escribe el monto recibido para ver cuánto equivale en{" "}
                      {estado.moneda === "USD" ? "dólares" : "pesos"} y cómo
                      avanza el cobro.
                    </p>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={guardando}>
                    {editando ? "Guardar cambios" : "Guardar pago"}
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
              <table className="w-full min-w-[820px] text-[0.8125rem]">
                <thead className="bg-paper-2 text-left">
                  <tr>
                    {[
                      "Recibo",
                      "Fecha",
                      "Descripción",
                      "Tasa",
                      "Recibido",
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
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right text-ink-2">
                        {importe(f.monto, f.moneda)}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right text-ink">
                        {importe(f.montoAplicado, estado.moneda)}
                      </td>
                      <td className="tabular whitespace-nowrap px-3 py-2 text-right font-semibold text-ink">
                        {importe(f.balance, estado.moneda)}
                      </td>
                      <td className="whitespace-nowrap px-1 py-1 text-right">
                        {(f.pagoId || f.appDataId) && (
                          <>
                            <Button
                              variant="ghost"
                              size="iconSm"
                              aria-label={`Editar el pago del ${fechaCorta(f.fecha)}`}
                              onClick={() => abrirEdicion(f)}
                              disabled={ocupado}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="iconSm"
                              aria-label={`Eliminar el pago del ${fechaCorta(f.fecha)}`}
                              onClick={() => setPorEliminar(f)}
                              disabled={ocupado}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dentro del Dialog: fuera de él lo tapa el overlay de Radix y un clic ahí cerraría el modal. */}
          <ConfirmDialog
            open={porEliminar !== null}
            title="Eliminar pago"
            description={
              porEliminar
                ? `Se quita del estado de cuenta el pago de ${importe(porEliminar.monto, porEliminar.moneda)} del ${fechaCorta(porEliminar.fecha)}${porEliminar.documento ? ` (${porEliminar.documento})` : ""}. El balance pendiente sube en ese monto.${porEliminar.appDataId ? " El registro se conserva en la base, marcado como eliminado." : ""}`
                : ""
            }
            confirmLabel="Eliminar pago"
            pendingLabel="Eliminando…"
            pending={eliminando}
            onConfirm={eliminarPago}
            onCancel={() => setPorEliminar(null)}
          />
        </div>
      </Modal>
    </>
  );
}
