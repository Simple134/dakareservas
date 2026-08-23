// Prueba funcional de las operaciones de escritura. Crea documentos de prueba
// en la base real (las tablas del ERP aun no las usa la app), verifica y BORRA,
// comprobando que los conteos vuelven al valor de partida.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const creados = [];
let fallos = 0;
const check = (nombre, cond, detalle = "") => {
  console.log(
    `${cond ? "  OK  " : "  MAL "} ${nombre}${detalle ? " :: " + detalle : ""}`,
  );
  if (!cond) fallos++;
};
const contar = async (t) =>
  (await db.from(t).select("*", { count: "exact", head: true })).count;

const antes = {};
for (const t of [
  "pending_records",
  "pending_record_elements",
  "pending_record_element_taxes",
  "payment_records",
  "record_events",
]) {
  antes[t] = await contar(t);
}

// Un proveedor con retencion del 30% para ejercitar el tramo alto.
const { data: prov } = await db
  .from("beneficiaries")
  .select("id,name,metadata")
  .eq("type", "PROVIDER")
  .filter("metadata->>isrTaxRetention", "eq", "0.3")
  .limit(1)
  .single();
console.log(
  `proveedor de prueba: ${prov.name} (tasa ${prov.metadata.isrTaxRetention})\n`,
);

// --- 1. alta de factura de COMPRA con ITBIS 18% -------------------------
console.log("1. crear factura de compra");
const { data: creada, error: e1 } = await db.rpc("create_pending_record", {
  p: {
    type: "INVOICE",
    isSell: false,
    divisionId: 854,
    beneficiaryId: prov.id,
    currency: "DOP",
    isInstantDelivery: true,
    date: "2026-08-22T00:00:00.000Z",
    dueDate: "2026-09-21T00:00:00.000Z",
    reference: "SMOKE-TEST",
    notes: "prueba automatica",
    elements: [
      {
        description: "Servicio A",
        quantity: 2,
        price: 1000,
        unit: "UND",
        variation: 0,
        taxes: [{ taxRateId: 1 }],
      },
      {
        description: "Servicio B",
        quantity: 1,
        price: 500,
        unit: "UND",
        variation: 0,
        taxes: [],
      },
    ],
  },
});
if (e1) {
  console.error("  ERROR:", e1.message);
  process.exit(1);
}
creados.push(creada.id);
// subtotal 2500, ITBIS 18% solo sobre 2000 = 360, total 2860
// retencion ISR 30% sobre el subtotal = 750
check(
  "subtotal + impuestos = 2860",
  Number(creada.amount) === 2860,
  `amount=${creada.amount}`,
);
check("estado inicial PENDING", creada.state === "PENDING", creada.state);

const { data: v1 } = await db
  .from("pending_records_computed")
  .select(
    "subtotal,taxes_amount,amount,paid,due_to_pay,isr_retention_amount,net_payable,state,isr_retention_rate",
  )
  .eq("id", creada.id)
  .single();
check("subtotal 2500", Number(v1.subtotal) === 2500, String(v1.subtotal));
check(
  "ITBIS 360 (solo la linea con impuesto)",
  Number(v1.taxes_amount) === 360,
  String(v1.taxes_amount),
);
check(
  "tasa ISR congelada 0.3",
  Number(v1.isr_retention_rate) === 0.3,
  String(v1.isr_retention_rate),
);
check(
  "retencion ISR 750 (= subtotal x tasa)",
  Number(v1.isr_retention_amount) === 750,
  String(v1.isr_retention_amount),
);
check(
  "paid = 750 (la retencion cuenta como liquidada)",
  Number(v1.paid) === 750,
  String(v1.paid),
);
check("pendiente 2110", Number(v1.due_to_pay) === 2110, String(v1.due_to_pay));
check(
  "neto al proveedor 2110",
  Number(v1.net_payable) === 2110,
  String(v1.net_payable),
);

// --- 2. pago parcial y total ------------------------------------------
console.log("\n2. pagos");
const { error: e2 } = await db.rpc("pay_pending_record", {
  p: {
    pendingRecordId: creada.id,
    paymentMethod: "TRANSFER",
    accountId: 165,
    amount: 1000,
    reference: "SMOKE-PAGO-1",
  },
});
check("pago parcial aceptado", !e2, e2?.message);
const { data: v2 } = await db
  .from("pending_records_computed")
  .select("paid,due_to_pay,state,display_state")
  .eq("id", creada.id)
  .single();
check("paid 1750", Number(v2.paid) === 1750, String(v2.paid));
check("pendiente 1110", Number(v2.due_to_pay) === 1110, String(v2.due_to_pay));
check("estado sigue PENDING", v2.state === "PENDING", v2.state);
check(
  "presentacion parcialmente pagado",
  v2.display_state === "partially_paid",
  v2.display_state,
);

const { error: eSobre } = await db.rpc("pay_pending_record", {
  p: {
    pendingRecordId: creada.id,
    paymentMethod: "CASH",
    accountId: 165,
    amount: 99999,
  },
});
check(
  "un pago que excede el saldo se rechaza",
  !!eSobre,
  eSobre?.message.slice(0, 70),
);

const { error: e3 } = await db.rpc("pay_pending_record", {
  p: { pendingRecordId: creada.id, paymentMethod: "CASH", accountId: 165 },
});
check("pago del resto sin importe explicito", !e3, e3?.message);
const { data: v3 } = await db
  .from("pending_records_computed")
  .select("paid,due_to_pay,state,display_state")
  .eq("id", creada.id)
  .single();
check("pendiente 0", Number(v3.due_to_pay) === 0, String(v3.due_to_pay));
check("estado pasa a COMPLETED solo", v3.state === "COMPLETED", v3.state);

// --- 3. conversion ----------------------------------------------------
console.log("\n3. conversion cotizacion -> orden");
const { data: cot } = await db.rpc("create_pending_record", {
  p: {
    type: "QUOTE",
    isSell: true,
    divisionId: 854,
    beneficiaryId: prov.id,
    currency: "DOP",
    date: "2026-08-22T00:00:00.000Z",
    dueDate: "2026-09-21T00:00:00.000Z",
    reference: "SMOKE-COT",
    elements: [
      {
        description: "Partida",
        quantity: 3,
        price: 100,
        unit: "UND",
        variation: 0,
        comment: "Categoria X",
        taxes: [{ taxRateId: 1 }],
      },
    ],
  },
});
creados.push(cot.id);
const { data: orden, error: e4 } = await db.rpc("create_from_pending_record", {
  p_source_id: cot.id,
  p_type: "ORDER",
});
if (e4) {
  console.error("  ERROR:", e4.message);
  fallos++;
} else {
  creados.push(orden.id);
  check(
    "la orden hereda el importe",
    Number(orden.amount) === Number(cot.amount),
    `${cot.amount} -> ${orden.amount}`,
  );
  const { data: clon } = await db
    .from("pending_records")
    .select(
      "source_pending_record_id, pending_record_elements(description,comment,position,pending_record_element_taxes(tax_rate_id))",
    )
    .eq("id", orden.id)
    .single();
  check("queda enlazada al origen", clon.source_pending_record_id === cot.id);
  check("clona la linea", clon.pending_record_elements.length === 1);
  check(
    "clona el comentario de categoria",
    clon.pending_record_elements[0].comment === "Categoria X",
  );
  check(
    "clona el impuesto de la linea",
    clon.pending_record_elements[0].pending_record_element_taxes.length === 1,
  );
  check(
    "tipo ORDER no admite conversion a QUOTE",
    !!(
      await db.rpc("create_from_pending_record", {
        p_source_id: cot.id,
        p_type: "QUOTE",
      })
    ).error,
  );
}

// --- 4. el motor de busqueda ve el documento nuevo --------------------
console.log("\n4. busqueda");
const { data: b } = await db.rpc("search_pending_records", {
  p: {
    type: "INVOICE",
    divisionId: "854",
    state: "COMPLETED",
    elements: "500",
    page: "1",
  },
});
check("la factura pagada aparece como COMPLETED", b.ids.includes(creada.id));

// --- limpieza ---------------------------------------------------------
console.log("\nlimpieza");
// En orden inverso al de creacion: aunque la clave ajena al documento de
// origen esta en ON DELETE SET NULL, borrar primero lo derivado deja la
// comprobacion de conteos limpia sin depender de ese comportamiento.
for (const id of [...creados].reverse()) {
  const { error } = await db.from("pending_records").delete().eq("id", id);
  if (error) {
    console.error(`  no se pudo borrar ${id}: ${error.message}`);
    fallos++;
  }
}
let limpio = true;
for (const [t, n] of Object.entries(antes)) {
  const ahora = await contar(t);
  if (ahora !== n) {
    limpio = false;
    console.log(`  ${t}: ${n} -> ${ahora} (quedan restos)`);
  }
}
check("los conteos vuelven al valor inicial (cascada correcta)", limpio);

console.log(
  `\n${fallos ? `${fallos} COMPROBACIONES FALLIDAS` : "TODAS LAS COMPROBACIONES OK"}`,
);
process.exit(fallos ? 1 : 0);
