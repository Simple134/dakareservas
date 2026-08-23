// Fase 1 del ETL, paso 3: verificacion BLOQUEANTE antes de tocar la fachada.
// Compara, documento a documento, los totales que dio Gestiono
// (pending_records.imported_totals) contra los que recalcula Postgres
// (pending_records_computed), y los agregados `resume` por tipo.
// Tolerancia: 1 centavo, para absorber el redondeo binario del origen.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
  auth: { persistSession: false },
});

const TOL = 0.01;
const near = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) <= TOL;
const RAW = path.join(import.meta.dirname, "raw");

// Paginado: PostgREST tope a 1000 filas por respuesta.
const all = async (table, cols) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select(cols)
      .range(from, from + 999);
    if (error) {
      console.error(`${table}: ${error.message}`);
      process.exit(1);
    }
    out.push(...data);
    if (data.length < 1000) return out;
  }
};

const rows = await all(
  "pending_records_computed",
  "id,type,is_sell,state,division_id,subtotal,taxes_amount,amount,paid,due_to_pay," +
    "isr_retention_amount,state,display_state,imported_totals",
);

console.log(`documentos en Postgres: ${rows.length}`);

const fields = [
  ["subTotal", "subtotal"],
  ["taxes", "taxes_amount"],
  ["amount", "amount"],
  ["paid", "paid"],
  ["dueToPay", "due_to_pay"],
  ["isrTaxRetention", "isr_retention_amount"],
];

const problems = [];
for (const r of rows) {
  const g = r.imported_totals ?? {};
  for (const [gk, pk] of fields) {
    if (!near(g[gk], r[pk])) {
      problems.push({
        id: r.id,
        type: r.type,
        campo: gk,
        gestiono: g[gk],
        postgres: r[pk],
        delta: Number(((r[pk] ?? 0) - (g[gk] ?? 0)).toFixed(4)),
      });
    }
  }
}

console.log(`\n=== conciliacion por documento ===`);
if (!problems.length) {
  console.log("OK: los 6 campos coinciden en todos los documentos.");
} else {
  const porCampo = {};
  problems.forEach((p) => (porCampo[p.campo] = (porCampo[p.campo] || 0) + 1));
  console.log(`DIFERENCIAS: ${problems.length}`);
  console.log(`por campo: ${JSON.stringify(porCampo)}`);
  console.table(problems.slice(0, 25));
}

// --- agregados -----------------------------------------------------------
// La comparacion valida es contra la suma de los campos POR DOCUMENTO de
// Gestiono, que es la fuente autorizada. Su objeto `resume` se reporta solo a
// titulo informativo porque se contradice con sus propias filas: en
// ORDER/compras el resume declara 1047628.01 cobrado mientras la suma de los
// `paid` de sus 111 documentos da 1055021.38 (delta 7393.37, no atribuible a
// ningun documento ni pago concreto). Medir contra ese numero seria medir
// contra un error del origen.
console.log(`\n=== agregados ===`);
const raw = JSON.parse(
  fs.readFileSync(path.join(RAW, "pendingRecords.json"), "utf8"),
);
const resumes = JSON.parse(
  fs.readFileSync(path.join(RAW, "resumes.json"), "utf8"),
);
const sum = (a) => Number(a.reduce((s, v) => s + (v ?? 0), 0).toFixed(2));

let mismatches = 0;
for (const [clave, exp] of Object.entries(resumes)) {
  const [type, isSellStr] = clave.split(":");
  const isSell = isSellStr === "true";
  const suyos = raw.filter((x) => x.type === type && !!x.isSell === isSell);
  const mios = rows.filter((r) => r.type === type && r.is_sell === isSell);
  if (!suyos.length && !mios.length) continue;

  const filas = [
    ["documentos", suyos.length, mios.length],
    [
      "dueToPay",
      sum(suyos.map((x) => x.dueToPay)),
      sum(mios.map((r) => r.due_to_pay)),
    ],
    ["paid", sum(suyos.map((x) => x.paid)), sum(mios.map((r) => r.paid))],
    ["amount", sum(suyos.map((x) => x.amount)), sum(mios.map((r) => r.amount))],
  ];
  const malas = filas.filter(([, a, b]) => !near(a, b));
  if (malas.length) mismatches++;
  console.log(`\n${clave}${malas.length ? "  <-- REVISAR" : "  OK"}`);
  for (const [n, a, b] of filas) {
    console.log(
      `  ${n.padEnd(11)} gestiono=${String(a).padEnd(16)} postgres=${String(b).padEnd(16)}${near(a, b) ? "" : "  DIFERENCIA"}`,
    );
  }
  // Informativo: el resume de Gestiono frente a sus propias filas.
  const g = exp.resume ?? {};
  const decl = isSell ? g.totalCharged : g.totalPaid;
  const propio = sum(suyos.map((x) => x.paid));
  if (!near(decl, propio)) {
    console.log(
      `  nota: el resume de Gestiono declara ${decl} cobrado, pero la suma de sus propios documentos da ${propio} (inconsistencia del origen, no de la migracion).`,
    );
  }
}

// --- estado derivado ------------------------------------------------------
// Gestiono derivaba `state` en cada consulta y lo corrompia cuando se le pasaba
// ignoreDetailedData=false. states.json trae los estados autorizados,
// extraidos sin ese flag; aqui se comprueba que nuestra derivacion los
// reproduce documento a documento.
console.log(`\n=== estado derivado ===`);
const autorizados = JSON.parse(
  fs.readFileSync(path.join(RAW, "states.json"), "utf8"),
);
const malEstado = rows
  .filter((r) => autorizados[r.id] && autorizados[r.id] !== r.state)
  .map((r) => ({ id: r.id, gestiono: autorizados[r.id], postgres: r.state }));
if (!malEstado.length) {
  console.log(
    `OK: la derivacion reproduce los ${Object.keys(autorizados).length} estados autorizados.`,
  );
} else {
  console.log(`DIFERENCIAS: ${malEstado.length}`);
  console.table(malEstado.slice(0, 20));
}

// --- integridad referencial -------------------------------------------
console.log(`\n=== conteos ===`);
for (const t of [
  "divisions",
  "beneficiaries",
  "beneficiary_contacts",
  "resources",
  "pending_records",
  "pending_record_elements",
  "pending_record_element_taxes",
  "payment_records",
  "app_data",
]) {
  const { count, error } = await db
    .from(t)
    .select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(30)} ${error ? "ERROR " + error.message : count}`);
}

const fatal = problems.length > 0 || mismatches > 0 || malEstado.length > 0;
console.log(
  `\n${fatal ? "CONCILIACION FALLIDA -- no continuar a la fase 2." : "CONCILIACION OK."}`,
);
process.exit(fatal ? 1 : 0);
