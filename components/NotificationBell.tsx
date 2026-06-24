"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X, AlertCircle, AlertTriangle, CheckCircle2, Sparkles, ChevronRight, BellRing } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { generarNotificaciones, type AppNotif, type TipoNotif } from "@/lib/notifications";

const CFG: Record<TipoNotif, { Icon: React.ElementType; iconColor: string; bg: string }> = {
  error:       { Icon: AlertCircle,   iconColor: "text-rose-500",    bg: "bg-rose-50"    },
  warning:     { Icon: AlertTriangle, iconColor: "text-amber-500",   bg: "bg-amber-50"   },
  success:     { Icon: CheckCircle2,  iconColor: "text-emerald-500", bg: "bg-emerald-50" },
  celebration: { Icon: Sparkles,      iconColor: "text-indigo-500",  bg: "bg-indigo-50"  },
};

const BADGE: Record<TipoNotif, string> = {
  error:       "bg-rose-500",
  warning:     "bg-amber-400",
  success:     "bg-emerald-500",
  celebration: "bg-indigo-500",
};

const BELL_ACTIVE: Record<TipoNotif, string> = {
  error:       "text-rose-500",
  warning:     "text-amber-500",
  success:     "text-emerald-500",
  celebration: "text-indigo-500",
};

function NotifRow({ n, onClose }: { n: AppNotif; onClose: () => void }) {
  const { Icon, iconColor, bg } = CFG[n.tipo];
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{n.titulo}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.mensaje}</p>
      </div>
      {n.href && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-1" />}
    </div>
  );
  return n.href ? (
    <Link href={n.href} onClick={onClose}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

const SEEN_KEY = "bi-corp-notifs-seen";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const { date, ids } = JSON.parse(raw);
    // Resetear cada día para que alertas nuevas del día vuelvan a aparecer
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? new Set(ids as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(SEEN_KEY, JSON.stringify({ date: today, ids: [...ids] }));
  } catch {}
}

export function NotificationBell({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const { data } = useDashboard();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vistas, setVistas] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVistas(loadSeen());
  }, []);
  const [pushActivo, setPushActivo] = useState(false);
  const [suscribiendo, setSuscribiendo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Verificar si ya hay suscripción activa al montar
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushActivo(!!sub))
    ).catch(() => {});
  }, []);

  // Escuchar navegación enviada por el SW al hacer clic en push notification
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== "SW_NAVIGATE" || !event.data?.url) return;
      const [path, hash] = (event.data.url as string).split("#");
      router.push(path);
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 1800);
      }
    }
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [router]);

  const notifs = data ? generarNotificaciones(data) : [];
  const noVistas = notifs.filter((n) => !vistas.has(n.id));

  const topTipo: TipoNotif | null = noVistas.length === 0 ? null
    : noVistas.some((n) => n.tipo === "error")       ? "error"
    : noVistas.some((n) => n.tipo === "warning")     ? "warning"
    : noVistas.some((n) => n.tipo === "celebration") ? "celebration"
    : "success";

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Llamado desde el botón — requiere gesto del usuario (funciona en iOS)
  async function activarPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setSuscribiendo(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSuscribiendo(false); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
      }
      setPushActivo(true);
    } catch {}
    setSuscribiendo(false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const nuevas = new Set(notifs.map((n) => n.id));
      setVistas(nuevas);
      saveSeen(nuevas);
    }
  }

  const soportaPush = typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;

  const dropdownPos = variant === "mobile"
    ? "right-0 top-full mt-2"
    : "left-full top-0 ml-3";

  const btnClass = variant === "mobile"
    ? "h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
    : "h-7 w-7 rounded-lg hover:bg-gray-100";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        title="Notificaciones"
        className={`relative flex items-center justify-center transition-colors ${btnClass}`}
      >
        <Bell
          className={`h-4 w-4 transition-colors ${
            open ? "text-indigo-600"
            : topTipo ? BELL_ACTIVE[topTipo]
            : "text-gray-400"
          }`}
        />
        {topTipo && noVistas.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${BADGE[topTipo]}`}
          >
            {noVistas.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${dropdownPos} z-[150] w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
            <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
              Notificaciones
            </p>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>

          {/* Lista */}
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-sm font-semibold text-gray-600">Todo en orden</p>
              <p className="text-xs text-gray-400 mt-1">Sin alertas activas en este periodo</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[440px] overflow-y-auto">
              {notifs.map((n) => (
                <NotifRow key={n.id} n={n} onClose={() => setOpen(false)} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-50 px-4 py-2.5 flex flex-col gap-2">
            {soportaPush && !pushActivo && (
              <button
                onClick={activarPush}
                disabled={suscribiendo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-60"
              >
                <BellRing className="h-3.5 w-3.5" />
                {suscribiendo ? "Activando…" : "Activar notificaciones push"}
              </button>
            )}
            {soportaPush && pushActivo && (
              <p className="text-[10px] text-center text-emerald-500 font-medium">
                ✓ Notificaciones push activas
              </p>
            )}
            <p className="text-[10px] text-center text-gray-400">
              {notifs.length} alerta{notifs.length !== 1 ? "s" : ""} · datos en tiempo real
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
