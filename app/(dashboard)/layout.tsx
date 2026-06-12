import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { InstallBanner } from "@/components/InstallBanner";
import { DashboardProvider } from "@/context/DashboardContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-20 lg:w-60">
          <Sidebar />
        </div>
        <MobileNav />
        <div className="flex-1 lg:pl-60 min-w-0 mobile-nav-offset">
          {children}
        </div>
        <InstallBanner />
      </div>
    </DashboardProvider>
  );
}
