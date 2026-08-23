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
