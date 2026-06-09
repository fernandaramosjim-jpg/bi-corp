"use client";

import { CalendarDays } from "lucide-react";
import { PERIODOS } from "@/lib/date-range";

export function DateFilter({
  periodo,
  onChange,
}: {
  periodo: string;
  onChange: (p: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <div className="flex items-center gap-1 flex-wrap">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              periodo === p.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
