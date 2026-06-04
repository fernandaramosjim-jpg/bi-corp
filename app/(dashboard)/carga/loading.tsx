function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export default function CargaLoading() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-44" />
          <Sk className="h-4 w-80" />
        </div>
        <Sk className="h-8 w-40 rounded-xl hidden sm:block" />
      </div>

      {/* Tab pills */}
      <Sk className="h-12 w-72 rounded-xl mb-7" />

      {/* Formulario */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-5">
          <div className="space-y-1">
            <Sk className="h-5 w-40" />
            <Sk className="h-3 w-64" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-3 w-24" />
              <Sk className="h-12 w-full" />
            </div>
          ))}
          <Sk className="h-14 w-full" />
        </div>
        <div className="space-y-4">
          <Sk className="h-48 rounded-2xl" />
          <Sk className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
