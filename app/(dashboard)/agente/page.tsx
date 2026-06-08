export const dynamic = 'force-dynamic';

import { Bot } from "lucide-react";
import ChatAgente from "./ChatAgente";

export default function AgentePage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-4 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1
                className="text-base font-bold text-gray-900 leading-tight"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Agente IA
              </h1>
              <p className="text-xs text-gray-400">Análisis de negocio en tiempo real · Claude Haiku 4.5</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">En línea · Datos en tiempo real</span>
          </div>
        </div>
      </div>

      <ChatAgente />
    </div>
  );
}
