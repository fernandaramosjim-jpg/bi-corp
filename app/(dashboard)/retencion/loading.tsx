function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} style={style} />;
}

export default function RetencionLoading() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <Sk className="h-7 w-52" />
        <Sk className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lista de clientes en riesgo */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="border-b border-gray-50 px-6 py-4 flex items-center justify-between">
            <Sk className="h-4 w-44" />
            <Sk className="h-6 w-24 rounded-full" />
          </div>
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 gap-3">
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-4 w-36" />
                  <Sk className="h-3 w-52" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Sk className="h-6 w-10" />
                  <div className="flex gap-1">
                    <Sk className="h-7 w-7 rounded-lg" />
                    <Sk className="h-7 w-7 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barras Pareto */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="border-b border-gray-50 px-6 py-4 flex items-center justify-between">
            <Sk className="h-4 w-40" />
            <Sk className="h-3 w-20" />
          </div>
          <div className="px-6 py-5 space-y-4">
            <Sk className="h-16 w-full rounded-xl" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="h-7 w-7 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Sk className="h-3.5 w-32" />
                    <Sk className="h-3.5 w-16" />
                  </div>
                  <Sk className={`h-2.5 w-full rounded-full`} style={{ width: `${90 - i * 12}%` } as React.CSSProperties} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
