// Fase 1 del ETL: extrae TODO Gestiono a JSON crudo en scripts/etl/raw/.
// Idempotente: se puede re-ejecutar sin tocar Postgres. La importacion es un
// paso separado que solo lee estos ficheros.
import fs from "node:fs";
import path from "node:path";
import { get } from "./gestiono.mjs";

const RAW = path.join(import.meta.dirname, "raw");
fs.mkdirSync(RAW, { recursive: true });

const save = (name, data) => {
  fs.writeFileSync(
    path.join(RAW, `${name}.json`),
    JSON.stringify(data, null, 2),
  );
  const n = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`  -> ${name}.json (${n})`);
};

// --- divisiones ---
console.log("divisions");
const divisions = await get("/v1/division");
save("divisions", divisions);

// --- beneficiaries ---
// El listado NO devuelve `metadata` (donde vive isrTaxRetention, que gobierna
// toda la matematica de facturas de compra). Solo /v1/beneficiary/{id} lo trae,
// asi que hay que pedir cada uno individualmente.
console.log("beneficiaries");
const list = await get("/v1/beneficiary", {
  elementsPerPage: "1000",
  withContacts: "true",
  withTaxData: "true",
});
const beneficiaries = [];
for (const b of list) {
  const d = await get(`/v1/beneficiary/${b.id}`);
  beneficiaries.push({ ...b, ...(Array.isArray(d) ? d[0] : d) });
}
save("beneficiaries", beneficiaries);

// --- resources ---
console.log("resources");
const resources = [];
for (let page = 1; ; page++) {
  const r = await get("/v2/resource", {
    page,
    elementsPerPage: "200",
    archived: "true",
  });
  resources.push(...r.items);
  if (page >= r.totalPages || !r.items.length) break;
}
save("resources", resources);

// --- pending records (facturas/cotizaciones/ordenes) ---
// `elements` es el TAMANO DE PAGINA, no el numero de lineas a incluir.
console.log("pendingRecords");
const records = [];
const resumes = {};
for (const type of ["INVOICE", "QUOTE", "ORDER", "LOAN", "PAYROLL"]) {
  for (const isSell of [true, false]) {
    for (let page = 1; ; page++) {
      const r = await get("/v2/record/pending", {
        type,
        isSell,
        page,
        elements: 200,
        includeArchived: true,
        ignoreDetailedData: false,
        pendingRecordElements: true,
        pendingRecordPayments: true,
        pendingRecordCredits: true,
      });
      if (page === 1) {
        resumes[`${type}:${isSell}`] = {
          resume: r.resume,
          totalItems: r.totalItems,
        };
        if (r.totalItems)
          console.log(`  ${type} isSell=${isSell}: ${r.totalItems}`);
      }
      records.push(...r.items);
      if (page >= r.totalPages || !r.items.length) break;
    }
  }
}
save("pendingRecords", records);
save("resumes", resumes);

// --- appData por proyecto ---
// Espejo JSON del dominio que tambien vive en Supabase (locales, reservas,
// payments, User). Se extrae para conciliar ambas copias antes de colapsarlas.
console.log("appData");
const appData = {};
for (const d of divisions) {
  const appId = d.metadata?.unique_id;
  if (!appId) continue;
  try {
    const types = await get(`/v1/apps/data-types/${appId}`);
    appData[appId] = { divisionId: d.id, name: d.name, types, data: {} };
    for (const t of types) {
      const r = await get(`/v1/apps/data/explorer/${appId}`, { type: t });
      appData[appId].data[t] = r.appData ?? r;
    }
    console.log(`  appId ${appId} (${d.name}): ${types.join(", ")}`);
  } catch (e) {
    console.log(
      `  appId ${appId} (${d.name}): ERROR ${e.message.slice(0, 120)}`,
    );
  }
}
save("appData", appData);

// --- taxes ---
console.log("taxes");
save("taxes", await get("/v1/taxes/list"));

console.log("\nlisto.");
