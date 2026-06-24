"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, BarChart3, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0d0d1a] to-[#0a0a0f] border-r border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            BI-Corp
          </span>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Plataforma de Inteligencia de Negocios
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Datos que impulsan<br />
            <span className="text-indigo-400">decisiones reales.</span>
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500 max-w-sm">
            Accede a dashboards en tiempo real, reportes avanzados y análisis
            predictivo diseñados para tu organización.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Reportes activos", value: "1,240" },
            { label: "Usuarios conectados", value: "320+" },
            { label: "Uptime", value: "99.9%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-syne)" }}>{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            BI-Corp
          </span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-syne)" }}>
              Iniciar sesión
            </h2>
            <p className="text-sm text-zinc-500">Ingresa tus credenciales corporativas para continuar.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <p className="text-xs text-rose-400">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="email">Correo corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400" htmlFor="password">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-10 pr-10 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]">
              {loading ? "Verificando…" : (<>Ingresar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>)}
            </button>
          </form>
        </div>

        <p className="mt-auto pt-12 text-xs text-zinc-700">
          © {new Date().getFullYear()} BI-Corp. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
