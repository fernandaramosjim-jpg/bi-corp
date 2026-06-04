import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar fija en desktop */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-20 lg:w-60">
        <Sidebar />
      </div>

      {/* Contenido desplazado por el ancho del sidebar */}
      <div className="flex-1 lg:pl-60 min-w-0">
        {children}
      </div>
    </div>
  );
}
