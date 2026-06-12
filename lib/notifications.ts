import type { DashboardData } from "@/context/DashboardContext";

export type TipoNotif = "error" | "warning" | "success" | "celebration";

export type AppNotif = {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  mensaje: string;
  href?: string;
};

const META_MES = 200_000;

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function generarNotificaciones(data: DashboardData): AppNotif[] {
  const notifs: AppNotif[] = [];

  // ── 1. Desabasto crítico ──────────────────────────────────────────────────
  const desabasto = data.desabasto ?? [];
  if (desabasto.length >= 4) {
    notifs.push({
      id: "desabasto-critico",
      tipo: "error",
      titulo: `${desabasto.length} productos con desabasto crítico`,
      mensaje: `${desabasto[0].nombre} tiene solo ${desabasto[0].stock_actual} uds — revisa el inventario`,
      href: "/dashboard#desabasto",
    });
  } else if (desabasto.length > 0) {
    notifs.push({
      id: "desabasto-warning",
      tipo: "warning",
      titulo: `${desabasto.length} producto${desabasto.length > 1 ? "s" : ""} bajo el mínimo`,
      mensaje: `${desabasto[0].nombre} necesita reabastecerse`,
      href: "/dashboard#desabasto",
    });
  }

  // ── 2. Clientes en riesgo de churn ────────────────────────────────────────
  const enRiesgo = data.enRiesgo35 ?? [];
  if (enRiesgo.length > 0) {
    const primeros = enRiesgo.slice(0, 2).map((c) => c.nombre.split(" ")[0]);
    const extra = enRiesgo.length > 2 ? ` y ${enRiesgo.length - 2} más` : "";
    notifs.push({
      id: "churn",
      tipo: enRiesgo.length >= 3 ? "error" : "warning",
      titulo: `${enRiesgo.length} cliente${enRiesgo.length > 1 ? "s" : ""} sin comprar más de 35 días`,
      mensaje: `${primeros.join(", ")}${extra} — contáctalos hoy`,
      href: "/retencion#churn",
    });
  }

  // ── 3. Mermas ─────────────────────────────────────────────────────────────
  const totalMerma = data.mermas?.totalCosto ?? 0;
  if (totalMerma >= 8_000) {
    notifs.push({
      id: "mermas-altas",
      tipo: "error",
      titulo: "Mermas muy elevadas en este periodo",
      mensaje: `${fmtK(totalMerma)} en pérdidas — revisa causas y proveedores`,
      href: "/dashboard#mermas",
    });
  } else if (totalMerma >= 3_000) {
    notifs.push({
      id: "mermas-moderadas",
      tipo: "warning",
      titulo: "Mermas moderadas detectadas",
      mensaje: `${fmtK(totalMerma)} en pérdidas — monitorea el inventario`,
      href: "/dashboard#mermas",
    });
  }

  // ── 4. Meta mensual ───────────────────────────────────────────────────────
  const totalVentas = data.ventasMes?.total ?? 0;
  const pctMeta = (totalVentas / META_MES) * 100;

  if (pctMeta >= 110) {
    notifs.push({
      id: "meta-superada",
      tipo: "celebration",
      titulo: "¡Meta del mes superada! 🎉",
      mensaje: `${fmtK(totalVentas)} — llevan el ${pctMeta.toFixed(0)}% del objetivo`,
      href: "/comercial#meta",
    });
  } else if (pctMeta >= 100) {
    notifs.push({
      id: "meta-alcanzada",
      tipo: "success",
      titulo: "¡Meta mensual alcanzada! 🏁",
      mensaje: `${fmtK(totalVentas)} vendidos — ¡excelente trabajo del equipo!`,
      href: "/comercial#meta",
    });
  } else if (pctMeta < 30) {
    notifs.push({
      id: "meta-critica",
      tipo: "error",
      titulo: "Ritmo muy bajo para la meta del mes",
      mensaje: `Solo el ${pctMeta.toFixed(0)}% — faltan ${fmtK(META_MES - totalVentas)} para llegar`,
      href: "/comercial#meta",
    });
  } else if (pctMeta < 55) {
    notifs.push({
      id: "meta-baja",
      tipo: "warning",
      titulo: "Ritmo por debajo de la meta",
      mensaje: `${pctMeta.toFixed(0)}% completado — acelera las ventas esta semana`,
      href: "/comercial#meta",
    });
  } else {
    notifs.push({
      id: "meta-bien",
      tipo: "success",
      titulo: "Buen ritmo de ventas",
      mensaje: `${pctMeta.toFixed(0)}% de la meta mensual — ¡sigan así!`,
      href: "/comercial#meta",
    });
  }

  // ── 5. Vendedor estrella cumplió su meta ──────────────────────────────────
  const top = (data.rankingVendedores ?? [])[0];
  if (top && top.meta > 0 && top.total >= top.meta) {
    const pctVend = Math.round((top.total / top.meta) * 100);
    notifs.push({
      id: "vendedor-meta",
      tipo: "celebration",
      titulo: `¡${top.nombre.split(" ")[0]} alcanzó su meta! 🏆`,
      mensaje: `${fmtK(top.total)} vendidos — ${pctVend}% de su objetivo personal`,
      href: "/comercial#vendedores",
    });
  }

  return notifs;
}
