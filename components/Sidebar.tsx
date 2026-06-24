"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  FolderUp,
  Bot,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

const NAV = [
  {
    section: "Principal",
    items: [
      {
        label: "Semáforo de Control",
        href: "/dashboard",
        icon: AlertTriangle,
        sub: "KPIs críticos del día",
      },
    ],
  },
  {
    section: "Análisis",
    items: [
      {
        label: "Retención & Churn",
        href: "/retencion",
        icon: Users,
        sub: "Clientes en riesgo",
      },
      {
        label: "Termómetro Comercial",
        href: "/comercial",
        icon: Zap,
        sub: "Rendimiento del equipo",
      },
      {
        label: "Radiografía de Margen",
        href: "/margen",
        icon: DollarSign,
        sub: "Rentabilidad real",
      },
    ],
  },
  {
    section: "Gestión",
    items: [
      {
        label: "Centro de Carga",
        href: "/carga",
        icon: FolderUp,
        sub: "Excel, CSV y captura rápida",
      },
      {
        label: "Agente IA",
        href: "/agente",
        icon: Bot,
        sub: "Análisis conversacional",
      },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-gray-50 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <BarChart3 className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span
          className="text-base font-bold tracking-tight text-gray-900"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          BI<span className="text-indigo-600">-Corp</span>
        </span>
        <div className="ml-auto">
          <NotificationBell variant="sidebar" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-6">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label, href, icon: Icon, sub }) => {
                const active = path === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-all ${
                      active
                        ? "bg-indigo-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium leading-tight ${
                          active ? "text-indigo-700" : "text-gray-600 group-hover:text-gray-900"
                        }`}
                      >
                        {label}
                      </p>
                      <p className="truncate text-[10px] text-gray-400">{sub}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-gray-50 px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          FR
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-800">
            Fernanda Ramos
          </p>
          <p className="truncate text-[10px] text-gray-400">
            e1technology.com
          </p>
        </div>
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
