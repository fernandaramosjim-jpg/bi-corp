"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PERIODOS } from "@/lib/date-range";
import { CalendarDays } from "lucide-react";

// Inner usa useSearchParams → actualiza color INSTANTÁNEAMENTE al cambiar URL
function DateFilterButtons() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("periodo") ?? "mes_actual";

  return (
    <>
      {PERIODOS.map((p) => (
        <Link
          key={p.key}
          href={`${pathname}?periodo=${p.key}`}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            current === p.key
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </>
  );
}

// periodo prop solo se usa en el SSR fallback (antes de que hidrate el JS)
export function DateFilter({ periodo }: { periodo: string }) {
  const fallback = (
    <>
      {PERIODOS.map((p) => (
        <span
          key={p.key}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            periodo === p.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {p.label}
        </span>
      ))}
    </>
  );

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <div className="flex items-center gap-1 flex-wrap">
        <Suspense fallback={fallback}>
          <DateFilterButtons />
        </Suspense>
      </div>
    </div>
  );
}
