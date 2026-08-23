/* Hallmark · design-system: design.md
 *
 * Chart.js pinta sobre <canvas>, y el canvas NO resuelve `var(--color-*)`: un
 * token pasado como color de serie sale transparente. Por eso los gráficos
 * necesitan valores literales.
 *
 * Estos hex son el equivalente sRGB de los tokens OKLCH de app/globals.css.
 * Al cambiar un token allí, hay que regenerar el hex correspondiente aquí —
 * es la única duplicación consciente de la paleta en todo el proyecto.
 *
 * Recharts genera SVG y sí resuelve `var()`; esos componentes usan los tokens.
 */

export const chart = {
  gold: "#9c681a",
  goldStrong: "#7c5006",
  goldSoft: "#fcf0dd",

  ink: "#07234b",
  ink2: "#5f6a7a",
  ink3: "#858e9c",

  rule: "#e2e5ea",
  paper: "#fbfcfd",
  paper2: "#f3f5f8",
  paper3: "#eaedf0",

  success: "#007345",
  warning: "#a85216",
  danger: "#b6202a",
  info: "#1f6699",
} as const;

/** Opacidad sobre un hex de 6 dígitos, para rellenos de barra y sector. */
export function alpha(hex: string, a: number): string {
  const n = Math.round(Math.min(1, Math.max(0, a)) * 255);
  return hex + n.toString(16).padStart(2, "0");
}

/**
 * Serie categórica. El oro abre porque la primera categoría es la dominante en
 * los gráficos de presupuesto; el resto rota por la escala de estado y neutros.
 * Rota en vez de cortarse: un gráfico con más categorías que colores repite
 * tono, nunca se queda sin color.
 */
export const chartSeries = [
  chart.gold,
  chart.info,
  chart.success,
  chart.warning,
  chart.ink2,
  chart.danger,
  chart.goldStrong,
  chart.ink3,
] as const;

export function seriesColor(i: number): string {
  return chartSeries[i % chartSeries.length];
}

/** Rejilla, ejes y leyenda compartidos por todos los gráficos de canvas. */
export const chartGrid = {
  gridColor: chart.rule,
  tickColor: chart.ink2,
  // Igual que --font-sans pero sin la var: el canvas tampoco resuelve fuentes
  // por custom property.
  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
} as const;
