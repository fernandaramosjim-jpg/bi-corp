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

export async function POST(req: NextRequest) {
  const { monto, cliente, producto } = await req.json();

  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (!subs?.length) return NextResponse.json({ ok: true, enviados: 0 });

  const fmtMXN = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  const payload = JSON.stringify({
    titulo: "BI-Corp · Nueva venta registrada",
    mensaje: `${fmtMXN(monto)}${cliente ? ` — ${cliente}` : ""}${producto ? ` · ${producto}` : ""}`,
    id: `venta-${Date.now()}`,
    href: "/dashboard",
  });

  const expiradas: string[] = [];
  let enviados = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) expiradas.push(sub.endpoint);
    }
  }

  for (const endpoint of expiradas) {
    await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }

  return NextResponse.json({ ok: true, enviados });
}
