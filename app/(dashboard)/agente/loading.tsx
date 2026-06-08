function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export default function AgenteLoading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header skeleton */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Sk className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Sk className="h-4 w-24" />
            <Sk className="h-3 w-48" />
          </div>
        </div>
      </div>

      {/* Welcome skeleton */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 px-4">
        <div className="text-center space-y-4 w-full max-w-xl">
          <Sk className="h-14 w-14 rounded-2xl mx-auto" />
          <Sk className="h-6 w-40 mx-auto" />
          <Sk className="h-4 w-64 mx-auto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Sk key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Sk className="flex-1 h-11 rounded-2xl" />
          <Sk className="h-11 w-11 rounded-2xl flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
