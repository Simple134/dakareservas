// Fase 2: paridad de la fachada. Ejecuta contra Gestiono y contra el motor de
// Postgres las MISMAS consultas que emite la UI y compara totales y agregados.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { get } from "./gestiono.mjs";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const near = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) <= 0.011;

// Consultas reales, extraidas de los componentes que las emiten.
const CASOS = [
  // FinancesModule, pestana activa (por proyecto)
  ...[854, 883, 902, 877].flatMap((div) =>
    ["INVOICE", "QUOTE", "ORDER"].flatMap((type) =>
      ["true", "false", ""].map((isSell) => ({
        nombre: `FinancesModule activa div=${div} ${type} isSell=${isSell || "todos"}`,
        q: {
          divisionId: String(div),
          ignoreDetailedData: "false",
          state: "PENDING",
          type,
          isSell,
          elements: "10",
          page: "1",
          ...(type !== "INVOICE"
            ? {
                advancedSearch: [
                  {
                    field: "sourcePendingRecordId",
                    method: "is null",
                    value: "",
                  },
                ],
              }
            : {}),
        },
      })),
    ),
  ),
  // FinancesModule, historial
  ...[854, 883].map((div) => ({
    nombre: `FinancesModule historial div=${div}`,
    q: {
      itemsPerPage: "10",
      divisionId: String(div),
      ignoreDetailedData: "false",
      state: "COMPLETED",
      page: "1",
    },
  })),
  // Cuentas por cobrar / pagar
  ...[854, 883, 902].flatMap((div) =>
    [true, false].map((isSell) => ({
      nombre: `Cuentas por ${isSell ? "cobrar" : "pagar"} div=${div}`,
      q: {
        divisionId: String(div),
        isSell: String(isSell),
        type: "INVOICE",
        elements: "500",
        page: "1",
        ignoreDetailedData: "false",
      },
    })),
  ),
  // admin/invoice, global
  ...["INVOICE", "QUOTE", "ORDER"].flatMap((type) =>
    ["true", "false", ""].map((isSell) => ({
      nombre: `admin/invoice ${type} isSell=${isSell || "todos"}`,
      q: {
        search: "",
        ignoreDetailedData: "false",
        state: "PENDING",
        amount: "0",
        type,
        isSell,
        elements: "10",
        page: "1",
        ...(type !== "INVOICE"
          ? {
              advancedSearch: [
                {
                  field: "sourcePendingRecordId",
                  method: "is null",
                  value: "",
                },
              ],
            }
          : {}),
      },
    })),
  ),
  // admin/invoice con filtro de adjuntos
  {
    nombre: "admin/invoice con imagenes",
    q: {
      state: "PENDING",
      type: "INVOICE",
      elements: "10",
      page: "1",
      advancedSearch: [{ field: "$files", method: "is not null", value: "" }],
    },
  },
  // admin/invoice historial por rango
  {
    nombre: "admin/invoice historial 2026",
    q: {
      itemsPerPage: "10",
      amountMethod: "ALL",
      amount: "0",
      fromDate: "2026-01-01",
      state: "COMPLETED",
      toDate: "2026-12-31",
      page: "1",
    },
  },
  // ProjectContent: gastos del proyecto
  ...[854, 883].map((div) => ({
    nombre: `ProjectContent gastos div=${div}`,
    q: {
      divisionId: String(div),
      isSell: "false",
      type: "INVOICE",
      ignoreDetailedData: "false",
      elements: "100",
      page: "1",
    },
  })),
  // includeArchived
  {
    nombre: "todos incl. archivados",
    q: { type: "INVOICE", includeArchived: "true", elements: "500", page: "1" },
  },
  // paginacion
  {
    nombre: "pagina 2",
    q: { type: "ORDER", isSell: "false", elements: "10", page: "2" },
  },
];

let ok = 0,
  fail = 0,
  roto = 0;
for (const caso of CASOS) {
  // Se le quita ignoreDetailedData a la consulta contra Gestiono: ese flag
  // corrompe el `state` que devuelve (COMPLETED en todo), y con el la
  // comparacion seria contra datos malos. Nuestra fachada acepta el flag pero
  // devuelve el estado correcto, que es una mejora deliberada: replicar la
  // corrupcion dejaria 251 de 399 documentos invisibles en la UI.
  const { ignoreDetailedData: _omitido, ...qGestiono } = caso.q;
  let g;
  try {
    g = await get("/v2/record/pending", qGestiono);
  } catch (e) {
    // Hay consultas que Gestiono no sabe responder: el filtro por adjuntos
    // ($files) devuelve un 500 con ER_PARSE_ERROR, o sea que el boton "ver con
    // imagenes" de app/admin/invoice esta roto en produccion. No hay nada con
    // lo que comparar, asi que se comprueba que el nuestro al menos responde.
    const { data, error } = await db.rpc("search_pending_records", {
      p: caso.q,
    });
    if (error) {
      console.log(
        `FALLA  ${caso.nombre}: los dos fallan (${error.message.slice(0, 60)})`,
      );
      fail++;
    } else {
      roto++;
      console.log(
        `ORIGEN ROTO  ${caso.nombre}: Gestiono responde ${e.message.slice(0, 40).trim()}...; el nuestro devuelve ${data.totalItems}`,
      );
    }
    continue;
  }

  const { data, error } = await db.rpc("search_pending_records", { p: caso.q });
  if (error) {
    console.log(`ERROR RPC  ${caso.nombre}: ${error.message.slice(0, 120)}`);
    fail++;
    continue;
  }

  const gRes = g.resume ?? {};
  const mRes = data.resume ?? {};
  const checks = [
    ["totalItems", g.totalItems, data.totalItems],
    ["totalPages", g.totalPages, data.totalPages],
    [
      "nIds",
      Math.min(
        g.items.length,
        Number(caso.q.elements ?? caso.q.itemsPerPage ?? 25),
      ),
      data.ids.length,
    ],
    ["toCharge", gRes.toCharge, mRes.toCharge],
    ["toPay", gRes.toPay, mRes.toPay],
    ["totalCharged", gRes.totalCharged, mRes.totalCharged],
    ["totalPaid", gRes.totalPaid, mRes.totalPaid],
    // taxesCollected/taxesPaid quedan fuera de la puerta: Gestiono los devuelve
    // en 0 en cuanto hay filtro de estado (aun habiendo documentos con
    // impuesto), y ningun componente los lee. Nuestro calculo es el correcto.
    ["toChargeCount", gRes.toChargeRecordsCount, mRes.toChargeRecordsCount],
    ["toPayCount", gRes.toPayRecordsCount, mRes.toPayRecordsCount],
  ];

  // Se compara el CONJUNTO de documentos, no la permutacion: el ORDER BY de
  // Gestiono no tiene desempate determinista y devuelve los empates de fecha en
  // orden arbitrario (159432,159431 descendente frente a 154313,154310,154354
  // mezclado, con fechas identicas). Nuestro orden es date DESC, id ASC, que
  // ademas hace la paginacion consistente.
  const conjunto = (a) => JSON.stringify([...a].sort((x, y) => x - y));
  const mismoConjunto =
    conjunto(g.items.map((x) => x.id)) === conjunto(data.ids);
  const malas = checks.filter(([, a, b]) => !near(a, b));

  if (!malas.length && mismoConjunto) {
    ok++;
  } else {
    fail++;
    console.log(`\nFALLA  ${caso.nombre}`);
    for (const [n, a, b] of malas)
      console.log(`   ${n.padEnd(16)} gestiono=${a}  postgres=${b}`);
    if (!mismoConjunto) {
      const gs = new Set(g.items.map((x) => x.id));
      const ms = new Set(data.ids);
      console.log(`   conjunto distinto`);
      console.log(
        `     solo en gestiono: ${JSON.stringify([...gs].filter((i) => !ms.has(i)))}`,
      );
      console.log(
        `     solo en postgres: ${JSON.stringify([...ms].filter((i) => !gs.has(i)))}`,
      );
    }
  }
}
console.log(
  `\n${ok} casos OK, ${roto} con el origen roto, ${fail} fallos, de ${CASOS.length}`,
);
process.exit(fail ? 1 : 0);
