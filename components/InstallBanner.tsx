"use client";

import { useState, useEffect } from "react";
import { X, Download, Share2, Plus } from "lucide-react";

// ─── Detección ────────────────────────────────────────────────────────────────

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function InstallBanner() {
  const [visible, setVisible]             = useState(false);
  const [ios, setIos]                     = useState(false);
  const [activeStep, setActiveStep]       = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isMobile()) return;
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    const iosDevice = detectIOS();
    setIos(iosDevice);

    if (iosDevice) {
      setVisible(true);
      // Anima entre los dos pasos del tutorial cada 2.5 s
      const id = setInterval(() => setActiveStep((s) => (s + 1) % 2), 2500);
      return () => clearInterval(id);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  // ─── Banner Android / Chrome ────────────────────────────────────────────────
  if (!ios) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative flex items-center gap-4 rounded-2xl border border-indigo-100 bg-white px-5 py-4 shadow-xl ring-1 ring-black/5">
          {/* Icono */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Download className="h-5 w-5 text-white" />
          </div>

          {/* Texto + botón */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Instalar BI-Corp</p>
            <p className="text-xs text-gray-400 mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
            <button
              onClick={handleInstall}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              Instalar App BI-Corp
            </button>
          </div>

          {/* Cerrar */}
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Banner iOS ─────────────────────────────────────────────────────────────
  const steps = [
    {
      icon: <Share2 className="h-5 w-5 text-indigo-600" />,
      label: "Toca el botón Compartir",
      emoji: "📤",
      hint: "en la barra inferior del navegador",
    },
    {
      icon: <Plus className="h-5 w-5 text-indigo-600" />,
      label: "Selecciona «Agregar a inicio»",
      emoji: "➕",
      hint: "desplaza el menú hasta encontrar la opción",
    },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <Download className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Instala BI-Corp en tu iPhone</p>
            <p className="text-[11px] text-gray-400">Sigue estos 2 pasos rápidos</p>
          </div>
          <button
            onClick={dismiss}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pasos */}
        <div className="flex divide-x divide-gray-100">
          {steps.map((s, i) => {
            const active = activeStep === i;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex flex-1 flex-col items-center gap-2 px-4 py-4 text-center transition-all ${
                  active ? "bg-indigo-50" : "bg-white"
                }`}
              >
                {/* Número de paso */}
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {i + 1}
                </span>

                {/* Emoji animado */}
                <span className={`text-2xl transition-transform duration-300 ${active ? "scale-125" : "scale-100"}`}>
                  {s.emoji}
                </span>

                {/* Texto */}
                <p className={`text-xs font-semibold leading-tight transition-colors ${
                  active ? "text-indigo-700" : "text-gray-500"
                }`}>
                  {s.label}
                </p>
                <p className={`text-[10px] leading-tight transition-colors ${
                  active ? "text-indigo-400" : "text-gray-300"
                }`}>
                  {s.hint}
                </p>
              </button>
            );
          })}
        </div>

        {/* Barra de progreso animada */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-indigo-600 transition-all duration-500"
            style={{ width: activeStep === 0 ? "50%" : "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
