// Segunda pasada del ETL sobre `state`.
//
// Gestiono no almacena `state`: lo deriva en cada consulta. Y pasar
// `ignoreDetailedData: false` -- que es lo que hace toda la UI -- lo corrompe:
// devuelve COMPLETED en todos los documentos. Sin ese flag el estado es
// correcto, pero entonces no vienen las lineas. No hay forma de obtener ambos
// en una sola llamada, asi que los estados se extraen aparte.
import fs from "node:fs";
import path from "node:path";
import { get } from "./gestiono.mjs";

const RAW = path.join(import.meta.dirname, "raw");
const estados = {};

for (const type of ["INVOICE", "QUOTE", "ORDER", "LOAN", "PAYROLL"]) {
  for (const isSell of [true, false]) {
    for (let page = 1; ; page++) {
      // Sin ignoreDetailedData y sin los flags de detalle: solo asi el estado
      // que devuelve es el real.
      const r = await get("/v2/record/pending", {
        type,
        isSell,
        page,
        elements: 200,
        includeArchived: true,
      });
      for (const x of r.items) estados[x.id] = x.state;
      if (page >= r.totalPages || !r.items.length) break;
    }
  }
}

fs.writeFileSync(
  path.join(RAW, "states.json"),
  JSON.stringify(estados, null, 2),
);

const dist = {};
for (const s of Object.values(estados)) dist[s] = (dist[s] || 0) + 1;
console.log(
  `estados autorizados de ${Object.keys(estados).length} documentos:`,
);
console.log(JSON.stringify(dist, null, 1));

// Comparacion con lo que trajo la primera pasada.
const records = JSON.parse(
  fs.readFileSync(path.join(RAW, "pendingRecords.json"), "utf8"),
);
let iguales = 0,
  distintos = 0;
const cambios = {};
for (const r of records) {
  const real = estados[r.id];
  if (!real) continue;
  if (real === r.state) iguales++;
  else {
    distintos++;
    const k = `${r.state} -> ${real}`;
    cambios[k] = (cambios[k] || 0) + 1;
  }
}
console.log(
  `\ncoinciden con la primera pasada: ${iguales}, difieren: ${distintos}`,
);
console.log(JSON.stringify(cambios, null, 1));
