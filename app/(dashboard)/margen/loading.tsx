function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} style={style} />;
}

export default function MargenLoading() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <Sk className="h-7 w-52" />
        <Sk className="h-4 w-72" />
      </div>

      {/* Ranking productos */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
        <div className="flex items-center gap-2">
          <Sk className="h-4 w-4 rounded" />
          <Sk className="h-4 w-56" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4">
              <Sk className={`h-10 w-10 flex-shrink-0 rounded-full`} />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Sk className="h-4 w-36" />
                  <Sk className="h-4 w-20" />
                </div>
                <Sk className="h-2 rounded-full" style={{ width: `${85 - i * 12}%` }} />
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((j) => <Sk key={j} className="h-3 w-16" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficas de barras */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((chart) => (
          <div key={chart} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
            <div className="flex items-center gap-2">
              <Sk className="h-4 w-4 rounded" />
              <Sk className="h-4 w-40" />
            </div>
            <Sk className="h-12 w-full rounded-xl" />
            {/* Barras */}
            <div className="flex items-end gap-1 h-36">
              {[65, 40, 80, 55, 90, 45, 30].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <Sk className="w-full rounded-t-md" style={{ height: `${h}%` }} />
                  <Sk className="h-3 w-6" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
