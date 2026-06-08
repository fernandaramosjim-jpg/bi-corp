export const dynamic = 'force-dynamic';

import { getProductosBasic, getClientesBasic } from "@/lib/supabase";
import CentroCargar from "./CentroCargar";
import { FolderUp } from "lucide-react";

export default async function CargaPage() {
  const [productos, clientes] = await Promise.all([
    getProductosBasic().catch(() => []),
    getClientesBasic().catch(() => []),
  ]);

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <FolderUp className="h-4 w-4 text-indigo-600" />
            </div>
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Centro de Carga
            </h1>
          </div>
          <p className="text-sm text-gray-400 ml-10">
            Registra mermas al instante o importa cientos de registros desde Excel y CSV
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-4 py-2">
          <span className="text-xs text-gray-400">
            <strong className="text-gray-700">{productos.length}</strong> productos ·{" "}
            <strong className="text-gray-700">{clientes.length}</strong> clientes cargados
          </span>
        </div>
      </div>

      <CentroCargar productos={productos} clientes={clientes} />
    </div>
  );
}
