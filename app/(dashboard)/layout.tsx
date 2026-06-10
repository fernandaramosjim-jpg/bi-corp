import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { InstallBanner } from "@/components/InstallBanner";
import { DashboardProvider } from "@/context/DashboardContext";

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

      {/* Barra superior + drawer en mobile */}
      <MobileNav />

      {/* Contenido: desplazado por sidebar en desktop, con pt en mobile para la barra */}
      <DashboardProvider>
        <div className="flex-1 lg:pl-60 min-w-0 mobile-nav-offset">
          {children}
        </div>
      </DashboardProvider>

      {/* Banner de instalación PWA */}
      <InstallBanner />
    </div>
  );
}
