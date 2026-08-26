# Migraciones

Las funciones y vistas de Postgres se crearon durante la migración a Supabase y
hasta ahora vivían **solo en el servidor**, sin copia en el repo. Este directorio
existe para que un cambio en ellas quede versionado.

Aplicadas fuera de aquí (ya en producción): `pending_records_computed`,
`create_pending_record`, `pay_pending_record`, `create_from_pending_record`,
`next_fiscal_numeral`. Volcarlas con:

    select pg_get_functiondef(oid) from pg_proc where proname = '<nombre>';

## Aplicadas desde esta sesión

- `search_pending_records_devuelve_items` (2026-08-22) — la función devuelve las
  filas anidadas además de `ids`, para que `/api/erp/pendingRecord` resuelva en
  un solo viaje en vez de dos. Registrada en `supabase_migrations.schema_migrations`.
- `sanitize_invisible_chars` + `clean_text_no_null_coercion` (2026-08-26) —
  `public.clean_text(text)` quita caracteres invisibles (bidi `U+202A..U+202E`,
  ZWSP, BOM) y normaliza espacios duros y guiones no-ASCII; `public.tg_clean_text()`
  es un trigger genérico que recibe los nombres de columna en `TG_ARGV` y se aplica
  a `beneficiary_contacts`, `beneficiaries`, `pending_records`,
  `pending_record_elements`, `divisions`, `resources` y `payment_records`.
  Motivo: un teléfono pegado desde iPhone traía `U+202A`, y las fuentes WinAnsi de
  pdf-lib no lo pueden codificar — la generación de PDF lanzaba. La defensa en el
  renderizado vive en `lib/pdfText.ts`; esto limpia el origen. `clean_text` **no**
  hace `btrim` ni convierte `''` en `NULL`, para no violar restricciones `NOT NULL`.
