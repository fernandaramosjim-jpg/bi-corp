import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

// ── Viewport (theme color + viewport-fit) ─────────────────────────────────

export const viewport: Viewport = {
  themeColor: "#4338ca",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,         // evita zoom involuntario en inputs iOS
  viewportFit: "cover",   // respeta el notch del iPhone
};

// ── Metadata (PWA + SEO) ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "BI-Corp",
    template: "%s · BI-Corp",
  },
  description: "Panel de control de ventas, mermas y métricas en tiempo real",
  manifest: "/manifest.json",

  // iOS — convierte la web en app al agregarla a pantalla de inicio
  appleWebApp: {
    capable: true,
    title: "BI-Corp",
    statusBarStyle: "black-translucent",
  },

  // Open Graph (preview en WhatsApp, Slack, etc.)
  openGraph: {
    title: "BI-Corp Dashboard",
    description: "Semáforo de control, ventas, mermas y análisis de retención",
    locale: "es_MX",
    type: "website",
  },

  // Evita que motores de búsqueda indexen la app interna
  robots: { index: false, follow: false },

  // Otros meta útiles para móvil
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#4338ca",
    "format-detection": "telephone=no",
  },
};

// ── Root Layout ───────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[var(--font-dm-sans)]">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
