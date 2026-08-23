# Design — Daka ERP

Sistema de diseño bloqueado para `reservas.dakadominicana.com`. Toda pantalla nueva
o rediseñada lee este archivo antes de emitir código. No se regenera por página: se
extiende o se enmienda aquí cuando el sistema necesita crecer.

Los valores viven en `app/globals.css` como custom properties y como `@theme` de
Tailwind v4. **Ningún componente declara un color, una fuente o un espaciado en
crudo.** Si hace falta un valor que no existe, se sube a `globals.css` con nombre y
después se referencia.

---

## Contexto

Herramienta interna de facturación y control de obra para Daka Dominicana,
desarrolladora de plaza comercial de lujo en La Vega. Los usuarios son personal
administrativo que pasa jornadas completas en tablas de facturas, cuentas por cobrar
y presupuestos de obra.

La marca es lujo institucional: blanco amplio, negro carbón, mayúsculas espaciadas,
render arquitectónico, cero decoración. El lujo lo carga el aire y el contraste, no
el adorno. El ERP hereda ese carácter pero lo somete a la densidad que exige una
tabla de 200 facturas.

## Genre

`modern-minimal`. Diales: `VARIANCE 4 · MOTION 3 · DENSITY 7`.

Deliberadamente por debajo del baseline de landing (`8/6/4`): esto es una
herramienta de trabajo, no una página de venta. La varianza estructural es enemiga
de la memoria muscular del operario.

## Familias de macroestructura

| Familia           | Rutas                                                                     | Forma                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Workbench**     | `app/admin/**`                                                            | Side-rail fijo + barra de página con título y acciones + lienzo de contenido. Filtros arriba, densidad alta, sin enriquecimiento. |
| **Long Document** | `app/formulario`, `app/confirmacion/[id]`, `app/user/[id]`                | Columna única centrada, medida ≤ 65ch en prosa, secciones separadas por regla hairline.                                           |
| **Marquee Hero**  | `app/login`, `app/welcome`, `app/seleccion-producto`, `app/page` (kiosco) | Una afirmación grande, una acción. Aire generoso. Único lugar donde se permite enriquecimiento.                                   |

Nav: **N3 side-rail** (`AppSidebar`). Footer: **Ft1 mínimo** — el ERP no lleva footer;
las rutas públicas llevan una sola línea de identificación.

## Tema

Marina + oro, claro. Un solo acento en toda la aplicación.

```
--color-paper         oklch(99%   0.002 250)   lienzo de tarjeta
--color-paper-2       oklch(97%   0.004 250)   fondo de aplicación
--color-paper-3       oklch(94.5% 0.005 250)   hover de fila, zebra, campos deshabilitados
--color-ink           oklch(23%   0.072 262)   texto principal · ≈ #07234B unificado
--color-ink-2         oklch(52%   0.030 258)   texto secundario, etiquetas
--color-ink-3         oklch(64%   0.022 258)   placeholder, texto deshabilitado
--color-rule          oklch(92%   0.006 255)   borde hairline
--color-rule-strong   oklch(85%   0.009 255)   borde de input, separador con peso
--color-gold          oklch(56%   0.110  72)   oro Daka · ≈ #A9780F · bordes, iconos, énfasis
--color-gold-strong   oklch(47%   0.098  72)   relleno sólido con texto blanco (AA 5.4:1)
--color-gold-soft     oklch(96%   0.028  80)   fondo tenue de badge / estado activo
--color-gold-ink      oklch(99%   0       0)   texto sobre relleno de oro

--color-shell         oklch(21%   0.018 248)   side-rail, kiosco · ≈ #131E29
--color-shell-2       oklch(26%   0.020 248)
--color-shell-3       oklch(32%   0.020 248)   borde sobre superficie oscura
```

**El croma importa.** `ink` a croma 0.02 sale gris carbón, no marina: la primera
versión de este sistema cometió ese error y perdió el azul de la marca. `ink` lleva
croma 0.072; `shell` va deliberadamente más apagado (0.018) porque es fondo, y a
croma pleno compite con el oro.

**Regla del acento:** el oro nunca supera el 5% del viewport y está reservado a
—acción primaria, estado activo de navegación, y énfasis de marca—. Nunca se usa
para comunicar estado de datos.

Los alias de shadcn (`--color-primary`, `--color-muted-foreground`, `--color-border`…)
existen y apuntan a estos tokens, pero **el código nuevo usa los nombres de marca**.
Motivo en `app/vendor/daka-compat.css`.

### Colores de estado (independientes del acento)

Los estados de factura no pueden confundirse con la marca, por eso viven en su
propia escala:

```
--color-success       oklch(48% 0.130 155)   pagada, aprobada
--color-success-soft  oklch(96% 0.032 155)
--color-warning       oklch(50% 0.140  45)   pendiente, por vencer
--color-warning-soft  oklch(96% 0.035  50)
--color-danger        oklch(50% 0.190  25)   vencida, anulada, destructivo
--color-danger-soft   oklch(96% 0.030  25)
--color-info          oklch(48% 0.120 245)   borrador, cotización
--color-info-soft     oklch(96% 0.025 245)
```

Dos decisiones deliberadas: los cuatro van a **L 50 %** para que el texto cumpla AA
sobre su propio fondo `-soft`; y `warning` va a **hue 45, no 70** — a 70 el ámbar es
indistinguible del oro de marca, que es justo la confusión que esta escala evita.

## Tipografía

Tres familias, disciplina 2+1.

- **Display:** `Archivo`, peso 600, `font-style: normal`, tracking `-0.02em`.
  Grotesca de tracking cerrado; en mayúsculas espaciadas (`0.08em`) reproduce el
  registro de los títulos de sección de dakadominicana.com.
- **Cuerpo / UI:** `Geist`, pesos 400 / 500 / 600.
- **Cifras:** `Geist Mono`, peso 400/500.

Sin serif. Sin cursiva en encabezados nunca — el énfasis lo carga el peso o el oro.

**Cifras tabulares obligatorias.** Todo importe, cantidad, porcentaje, fecha o
NCF lleva `font-variant-numeric: tabular-nums` (utilidad `.tabular`). En una
columna de montos, las cifras proporcionales son un defecto de lectura, no una
preferencia estética.

Escala anclada: `--text-display: clamp(2rem, 1.4rem + 2.4vw, 3.25rem)`.

## Espaciado

Escala de 4 pt con nombres semánticos (`--space-3xs` … `--space-3xl`). Las páginas
usan tokens con nombre, nunca valores crudos. Radio: `--radius-card: 12px`,
`--radius-control: 8px`, `--radius-pill: 999px`.

## Movimiento

`MOTION 3` — el ERP se mueve poco y rápido.

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Duraciones: `--dur-fast: 120ms` (hover, foco), `--dur-base: 200ms` (modales, paneles).
- Sólo se animan `transform` y `opacity`. Nunca propiedades de layout.
- Sin revelado al hacer scroll. Una tabla de facturas no se presenta, se lee.
- `prefers-reduced-motion: reduce` colapsa todo a un crossfade de ≤ 120ms.
- **El anillo de foco nunca se anima.** Aparece instantáneo.

## Postura de microinteracción

- Éxito silencioso. Guardar una factura no lanza confeti ni toast celebratorio.
  El único confeti permitido en el proyecto es el del kiosco (`app/page.tsx`),
  que es su función.
- Actualización optimista + Deshacer, por encima del diálogo de confirmación.
  Excepción: anular una factura sí confirma — es irreversible y fiscal.
- Tooltip: 800 ms de retardo al hover, 0 ms al foco.
- Errores: siempre junto al campo que los causó, nunca sólo en un banner arriba.

## Voz de los CTA

- **Primaria:** relleno `--color-accent-strong`, texto `--color-accent-ink`,
  `--radius-control`, altura 40 px (36 px en densidad compacta). Copy en
  infinitivo con objeto: «Crear factura», «Registrar pago». Nunca «Enviar», «OK».
- **Secundaria:** borde `--color-rule-strong` sobre `--color-paper`, texto `--color-ink`.
- **Destructiva:** texto `--color-danger` sobre `--color-danger-soft`; sólida
  únicamente dentro del diálogo de confirmación.
- Un solo botón primario por vista. Si hay dos, uno de los dos no lo es.

## Los 8 estados

Todo elemento interactivo entrega código para los ocho: `default · hover ·
focus-visible · active · disabled · loading · error · success`. No es aspiracional;
las primitivas de `src/components/ui/` los implementan.

## Lo que TODA pantalla comparte

- El logotipo y el bloque de marca del side-rail.
- El oro y su ubicación (≤ 5% del viewport).
- Archivo + Geist + Geist Mono.
- La voz de los CTA: forma, radio, ritmo de padding, patrón de copy.
- La barra de página: título display + descripción `--color-ink-2` + acciones a la derecha.
- Densidad de tabla: fila 44 px, cabecera `--color-paper-2` en mayúsculas 11 px
  tracking `0.06em`, hover `--color-paper-3`, sin bordes verticales.

## Lo que PUEDE variar

- La macroestructura dentro de su familia.
- El arquetipo de encabezado dentro de lo que la familia permite.
- Enriquecimiento — sólo en la familia Marquee Hero, sólo Tier A (CSS) o Tier B (SVG).

## Prohibiciones específicas de este proyecto

- **Bootstrap.** Ninguna clase nueva `.row`, `.col-*`, `.btn`, `.form-control`,
  `.card-body`. Las que quedan son deuda a migrar, no precedente a seguir.
- **Hex en crudo.** Ni `#A9780F`, ni `#07234B`, ni `#131E29` en TSX. Token o nada.
  Tres excepciones, todas porque el destino no resuelve custom properties:
  `src/lib/email.ts` (los clientes de correo no soportan `var()`), `lib/generate*PDF.ts`
  (jsPDF pinta con tripletes RGB) y `src/lib/chartColors.ts` (Chart.js pinta sobre
  canvas). Ese último archivo es la **única** duplicación consciente de la paleta:
  al cambiar un token en `globals.css` hay que regenerar su hex allí.
- **`style={{ }}` en línea** para color, radio o espaciado.
- **Cursiva en encabezados.**
- **Emoji** en interfaz.
- **Sombras acumuladas.** Una sola elevación en tarjetas (`--shadow-card`), otra en
  overlays (`--shadow-overlay`). No hay tercera.

## Cumplimiento

- Contraste AA en todo texto. El oro sobre papel sólo como `--color-accent-strong`
  cuando lleva texto encima.
- `:focus-visible` visible en todo control, ≥ 3:1 contra su fondo.
- Sin scroll horizontal a 320 / 375 / 414 / 768 px. Las tablas hacen scroll dentro
  de su propio contenedor `overflow-x: auto`, nunca el `body`.
- Ningún texto clicable a dos líneas.

---

<!-- Hallmark · genre: modern-minimal · design-system: design.md · designed-as-app -->
