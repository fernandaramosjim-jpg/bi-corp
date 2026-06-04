// Se muestra INMEDIATAMENTE mientras el servidor carga los datos de Supabase

function Sk({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />
  );
}

export default function DashboardLoading() {
  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-52" />
          <Sk className="h-4 w-36" />
        </div>
        <Sk className="h-9 w-36 rounded-xl" />
      </div>

      {/* 3 tarjetas semáforo */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Sk className="h-3 w-28" />
              <Sk className="h-9 w-9 rounded-xl" />
            </div>
            <Sk className="h-10 w-32" />
            <Sk className="h-3 w-44" />
            <div className="space-y-2 pt-2">
              <Sk className="h-4 w-full" />
              <Sk className="h-4 w-5/6" />
              <Sk className="h-4 w-4/6" />
            </div>
          </div>
        ))}
      </div>

      {/* Barra de meta */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <Sk className="h-4 w-40" />
          <Sk className="h-7 w-16 rounded-full" />
        </div>
        <Sk className="h-5 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Sk key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
