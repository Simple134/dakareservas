// Los listados de divisiones y beneficiarios no incluyen los archivados, pero
// las facturas historicas los referencian (67 registros apuntan a 10
// divisiones ausentes). Se piden uno a uno y se anexan al raw.
import fs from "node:fs";
import path from "node:path";
import { get } from "./gestiono.mjs";

const RAW = path.join(import.meta.dirname, "raw");
const read = (n) =>
  JSON.parse(fs.readFileSync(path.join(RAW, `${n}.json`), "utf8"));
const write = (n, d) =>
  fs.writeFileSync(path.join(RAW, `${n}.json`), JSON.stringify(d, null, 2));

const records = read("pendingRecords");
const divisions = read("divisions");
const beneficiaries = read("beneficiaries");
const unwrap = (x) => (Array.isArray(x) ? x[0] : x);

const missingDiv = [...new Set(records.map((r) => r.divisionId))].filter(
  (id) => id && !divisions.some((d) => d.id === id),
);
for (const id of missingDiv) {
  try {
    const d = unwrap(await get(`/v1/division/${id}`));
    if (d?.id) {
      divisions.push(d);
      console.log(`division ${id}: ${d.name}`);
    } else console.log(`division ${id}: respuesta vacia`);
  } catch (e) {
    console.log(`division ${id}: ERROR ${e.message.slice(0, 100)}`);
  }
}
write("divisions", divisions);

const missingBen = [...new Set(records.map((r) => r.beneficiaryId))].filter(
  (id) => id && !beneficiaries.some((b) => b.id === id),
);
for (const id of missingBen) {
  try {
    const b = unwrap(await get(`/v1/beneficiary/${id}`));
    if (b?.id) {
      beneficiaries.push(b);
      console.log(`beneficiario ${id}: ${b.name}`);
    } else console.log(`beneficiario ${id}: respuesta vacia`);
  } catch (e) {
    console.log(`beneficiario ${id}: ERROR ${e.message.slice(0, 100)}`);
  }
}
write("beneficiaries", beneficiaries);
console.log(
  `\ndivisions: ${divisions.length}, beneficiaries: ${beneficiaries.length}`,
);
