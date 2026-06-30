import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const META_MES = 500_000;

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Genera las alertas críticas directamente desde Supabase (sin cargar el contexto del cliente)
async function generarAlertas() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
  const ahora = hoy.toISOString();
  const hace35 = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10);

  const [
    { data: desabasto },
    { data: enRiesgo },
    { data: mermas },
    { data: ventas },
  ] = await Promise.all([
    sb.from("productos").select("id, nombre, stock_actual, stock_minimo_critico")
      .filter("stock_actual", "lte", sb.from("productos").select("stock_minimo_critico")),
    sb.from("clientes").select("id, nombre").lte("ultima_fecha_compra", hace35),
    sb.from("mermas").select("costo_perdida").gte("fecha_merma", primerDiaMes.slice(0, 10)),
    sb.from("ventas").select("monto_total").gte("fecha_venta", primerDiaMes).lte("fecha_venta", ahora),
  ]);

  // Desabasto: filtrar manualmente los que están por debajo del mínimo
  const criticos = (desabasto ?? []).filter(
    (p: any) => p.stock_actual <= p.stock_minimo_critico
  );

  const totalMerma = (mermas ?? []).reduce((s: number, m: any) => s + (m.costo_perdida ?? 0), 0);
  const totalVentas = (ventas ?? []).reduce((s: number, v: any) => s + (v.monto_total ?? 0), 0);
  const pctMeta = (totalVentas / META_MES) * 100;

  const alertas: { id: string; titulo: string; mensaje: string; href: string }[] = [];

  if (criticos.length >= 4) {
    alertas.push({ id: "desabasto-critico", titulo: `${criticos.length} productos con desabasto crítico`, mensaje: `${criticos[0].nombre} tiene solo ${criticos[0].stock_actual} uds`, href: "/dashboard#desabasto" });
  } else if (criticos.length > 0) {
    alertas.push({ id: "desabasto-warning", titulo: `${criticos.length} producto${criticos.length > 1 ? "s" : ""} bajo el mínimo`, mensaje: `${criticos[0].nombre} necesita reabastecerse`, href: "/dashboard#desabasto" });
  }

  if ((enRiesgo ?? []).length >= 3) {
    const nombres = (enRiesgo as any[]).slice(0, 2).map((c) => c.nombre.split(" ")[0]).join(", ");
    alertas.push({ id: "churn", titulo: `${enRiesgo!.length} clientes sin comprar +35 días`, mensaje: `${nombres} y más — contáctalos hoy`, href: "/retencion#churn" });
  } else if ((enRiesgo ?? []).length > 0) {
    alertas.push({ id: "churn", titulo: `${enRiesgo!.length} cliente${enRiesgo!.length > 1 ? "s" : ""} en riesgo`, mensaje: `${(enRiesgo as any[])[0].nombre} no ha comprado en 35+ días`, href: "/retencion#churn" });
  }

  if (totalMerma >= 8_000) {
    alertas.push({ id: "mermas-altas", titulo: "Mermas muy elevadas", mensaje: `${fmtK(totalMerma)} en pérdidas este mes`, href: "/dashboard#mermas" });
  }

  if (pctMeta >= 110) {
    alertas.push({ id: "meta-superada", titulo: "¡Meta del mes superada! 🎉", mensaje: `${fmtK(totalVentas)} — ${pctMeta.toFixed(0)}% del objetivo`, href: "/comercial#meta" });
  } else if (pctMeta < 30) {
    alertas.push({ id: "meta-critica", titulo: "Ritmo muy bajo para la meta", mensaje: `Solo el ${pctMeta.toFixed(0)}% — faltan ${fmtK(META_MES - totalVentas)}`, href: "/comercial#meta" });
  }

  return alertas;
}

export async function POST(req: NextRequest) {
  // Verificar secret del cron
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const todasAlertas = await generarAlertas();
  if (!todasAlertas.length) {
    return NextResponse.json({ enviados: 0, mensaje: "Sin alertas activas" });
  }

  // Filtrar solo alertas que NO se han enviado hoy
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: yaEnviadas } = await sb
    .from("push_log")
    .select("alert_id")
    .eq("sent_date", hoy);

  const yaEnviadasSet = new Set((yaEnviadas ?? []).map((r: any) => r.alert_id));
  const nuevasAlertas = todasAlertas.filter((a) => !yaEnviadasSet.has(a.id));

  if (!nuevasAlertas.length) {
    return NextResponse.json({ enviados: 0, mensaje: "Sin alertas nuevas hoy" });
  }

  // Obtener todas las suscripciones
  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) {
    return NextResponse.json({ enviados: 0, mensaje: "Sin suscriptores" });
  }

  let enviados = 0;
  const expiradas: string[] = [];

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    for (const alerta of nuevasAlertas) {
      try {
        await webpush.sendNotification(pushSub, JSON.stringify({
          titulo: `BI-Corp · ${alerta.titulo}`,
          mensaje: alerta.mensaje,
          id:      alerta.id,
          href:    alerta.href,
        }));
        enviados++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiradas.push(sub.endpoint);
        }
      }
    }
  }

  // Registrar alertas enviadas hoy para no repetirlas
  if (enviados > 0) {
    await sb.from("push_log").upsert(
      nuevasAlertas.map((a) => ({ alert_id: a.id, sent_date: hoy })),
      { onConflict: "alert_id,sent_date" }
    );
  }

  // Limpiar suscripciones expiradas
  for (const endpoint of expiradas) {
    await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }

  return NextResponse.json({ enviados, nuevas: nuevasAlertas.length, omitidas: yaEnviadasSet.size, expiradas: expiradas.length });
}
