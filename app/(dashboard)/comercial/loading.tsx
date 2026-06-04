function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} style={style} />;
}

export default function ComercialLoading() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 space-y-2">
        <Sk className="h-7 w-56" />
        <Sk className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Velocímetro */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-5">
          <div className="flex items-center gap-2">
            <Sk className="h-4 w-4 rounded" />
            <Sk className="h-4 w-44" />
          </div>
          {/* Arco del velocímetro */}
          <div className="flex flex-col items-center gap-3">
            <Sk className="h-36 w-64 rounded-2xl" />
            <Sk className="h-10 w-20" />
            <Sk className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Sk key={i} className="h-16 rounded-xl" />)}
          </div>
          <Sk className="h-12 w-full rounded-xl" />
        </div>

        {/* Rankings */}
        <div className="space-y-4">
          {[1, 2].map((panel) => (
            <div key={panel} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
              <div className="flex items-center gap-2">
                <Sk className="h-4 w-4 rounded" />
                <Sk className="h-4 w-36" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <Sk className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between">
                        <Sk className="h-3.5 w-28" />
                        <Sk className="h-3.5 w-14" />
                      </div>
                      <Sk className="h-1.5 rounded-full" style={{ width: `${90 - i * 15}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
