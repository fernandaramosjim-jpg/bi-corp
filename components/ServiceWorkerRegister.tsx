"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SW] registrado:", reg.scope))
        .catch((err) => console.warn("[SW] error al registrar:", err));
    }
  }, []);

  return null;
}
