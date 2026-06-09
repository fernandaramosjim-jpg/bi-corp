export type DateRange = { from: string; to: string };

export const PERIODOS: { key: string; label: string }[] = [
  { key: "hoy",        label: "Hoy" },
  { key: "semana",     label: "7 días" },
  { key: "mes_actual", label: "Este mes" },
  { key: "30d",        label: "30 días" },
  { key: "90d",        label: "90 días" },
];

export function getPeriodoRange(periodo: string): DateRange {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const todayISO = `${y}-${pad(m + 1)}-${pad(d)}`;

  switch (periodo) {
    case "hoy":
      return { from: `${todayISO}T00:00:00`, to: `${todayISO}T23:59:59` };
    case "semana":
      return {
        from: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
        to: now.toISOString(),
      };
    case "30d":
      return {
        from: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
        to: now.toISOString(),
      };
    case "90d":
      return {
        from: new Date(now.getTime() - 90 * 86_400_000).toISOString(),
        to: now.toISOString(),
      };
    case "mes_actual":
    default:
      return {
        from: `${y}-${pad(m + 1)}-01T00:00:00`,
        to: `${y}-${pad(m + 1)}-${pad(lastDay)}T23:59:59`,
      };
  }
}

export function periodoLabel(periodo: string): string {
  return PERIODOS.find((p) => p.key === periodo)?.label ?? "Este mes";
}

export function diasEnRango(range: DateRange): number {
  const from = new Date(range.from);
  const to = new Date(range.to);
  return Math.max(Math.ceil((to.getTime() - from.getTime()) / 86_400_000), 1);
}
