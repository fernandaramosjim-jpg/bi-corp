"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, Plus, X, ChevronDown, Info, Flame, Download, ShoppingCart,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Producto = { id: number; nombre: string; costo_proveedor: number; precio_venta: number };
type Cliente  = { id: number; nombre: string };
type Tab      = "manual" | "masiva";
type TabManual = "merma" | "venta";
type TablaDest = "mermas" | "ventas";
type ToastT   = "success" | "error" | "info";

interface ToastState { type: ToastT; title: string; msg: string }
interface ParsedFile { name: string; headers: string[]; rows: Record<string, string>[] }

// ─── Definición de campos por tabla ──────────────────────────────────────────

const CAMPOS = {
  mermas: [
    { key: "producto",         label: "Producto",           req: true,  hint: "Nombre o ID"               },
    { key: "fecha_merma",      label: "Fecha de merma",     req: false, hint: "YYYY-MM-DD (vacío = hoy)"  },
    { key: "cantidad_perdida", label: "Cantidad perdida",   req: true,  hint: "Número entero"             },
    { key: "motivo",           label: "Motivo",             req: false, hint: "Descripción breve"         },
    { key: "costo_perdida",    label: "Costo de pérdida",   req: false, hint: "Se calcula si está vacío"  },
  ],
  ventas: [
    { key: "cliente",      label: "Cliente",        req: true,  hint: "Nombre o ID"         },
    { key: "producto",     label: "Producto",       req: true,  hint: "Nombre o ID"         },
    { key: "fecha_venta",  label: "Fecha de venta", req: false, hint: "YYYY-MM-DD HH:MM:SS" },
    { key: "cantidad",     label: "Cantidad",       req: true,  hint: "Número entero"       },
    { key: "monto_total",  label: "Monto total",    req: true,  hint: "Número decimal MXN"  },
  ],
};

// ─── Sub-componente: Toast ────────────────────────────────────────────────────

function Toast({ t, onClose }: { t: ToastState; onClose: () => void }) {
  const color = {
    success: { wrap: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", title: "text-emerald-800", msg: "text-emerald-600" },
    error:   { wrap: "bg-rose-50 border-rose-200",       icon: "text-rose-600",    title: "text-rose-800",    msg: "text-rose-600"    },
    info:    { wrap: "bg-indigo-50 border-indigo-200",   icon: "text-indigo-600",  title: "text-indigo-800",  msg: "text-indigo-600"  },
  }[t.type];
  const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
  return (
    <div className={`fixed top-5 right-5 z-50 flex w-80 items-start gap-3 rounded-2xl border p-4 shadow-xl ${color.wrap}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${color.title}`}>{t.title}</p>
        <p className={`text-xs mt-0.5 ${color.msg}`}>{t.msg}</p>
      </div>
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CentroCargar({ productos, clientes }: { productos: Producto[]; clientes: Cliente[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [tab, setTab]           = useState<Tab>("manual");
  const [tabManual, setTabManual] = useState<TabManual>("merma");

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  function notify(type: ToastT, title: string, msg: string) {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 5000);
  }

  // ── Estado: Captura Manual ────────────────────────────────────────────────
  const [prodId,     setProdId]     = useState("");
  const [cantidad,   setCantidad]   = useState("");
  const [motivo,     setMotivo]     = useState("");
  const [fechaMerma, setFechaMerma] = useState(new Date().toISOString().slice(0, 10));
  const [saving,     setSaving]     = useState(false);

  const prodSel = productos.find(p => String(p.id) === prodId);
  const costoCalc = prodSel && Number(cantidad) > 0
    ? Math.round(prodSel.costo_proveedor * Number(cantidad) * 100) / 100
    : 0;

  async function guardarMerma() {
    if (!prodId)               return notify("error", "Campo requerido", "Selecciona un producto");
    if (Number(cantidad) <= 0) return notify("error", "Campo requerido", "Ingresa una cantidad mayor a 0");
    if (!motivo.trim())        return notify("error", "Campo requerido", "Describe el motivo de la merma");

    setSaving(true);
    try {
      const { error } = await supabase.from("mermas").insert({
        producto_id:      Number(prodId),
        fecha_merma:      fechaMerma,
        cantidad_perdida: Number(cantidad),
        motivo:           motivo.trim(),
        costo_perdida:    costoCalc,
      });
      if (error) throw error;

      notify("success", "¡Merma registrada!", `Pérdida de $${costoCalc.toLocaleString("es-MX")} MXN guardada correctamente.`);
      setProdId(""); setCantidad(""); setMotivo("");
      setFechaMerma(new Date().toISOString().slice(0, 10));
      router.refresh();
    } catch (e: any) {
      notify("error", "Error al guardar", e.message ?? "No se pudo insertar el registro en Supabase");
    } finally {
      setSaving(false);
    }
  }

  // ── Estado: Captura Manual Ventas ────────────────────────────────────────
  const [clienteId,    setClienteId]    = useState("");
  const [ventaProdId,  setVentaProdId]  = useState("");
  const [ventaCantidad,setVentaCantidad]= useState("");
  const [ventaMonto,   setVentaMonto]   = useState("");
  const [fechaVenta,   setFechaVenta]   = useState(new Date().toISOString().slice(0, 10));
  const [savingVenta,  setSavingVenta]  = useState(false);
  const [montoManual,  setMontoManual]  = useState(false);

  const ventaProdSel = productos.find(p => String(p.id) === ventaProdId);
  const montoCalc = ventaProdSel && Number(ventaCantidad) > 0
    ? Math.round(ventaProdSel.precio_venta * Number(ventaCantidad) * 100) / 100
    : 0;
  const montoMostrado = montoManual ? ventaMonto : (montoCalc > 0 ? String(montoCalc) : "");

  async function guardarVenta() {
    if (!clienteId)                   return notify("error", "Campo requerido", "Selecciona un cliente");
    if (!ventaProdId)                 return notify("error", "Campo requerido", "Selecciona un producto");
    if (Number(ventaCantidad) <= 0)   return notify("error", "Campo requerido", "Ingresa una cantidad mayor a 0");
    const monto = montoManual ? Number(ventaMonto) : montoCalc;
    if (monto <= 0)                   return notify("error", "Campo requerido", "El monto total debe ser mayor a 0");

    setSavingVenta(true);
    try {
      const { error } = await supabase.from("ventas").insert({
        cliente_id:  Number(clienteId),
        producto_id: Number(ventaProdId),
        fecha_venta: `${fechaVenta}T${new Date().toTimeString().slice(0, 8)}`,
        cantidad:    Number(ventaCantidad),
        monto_total: monto,
      });
      if (error) throw error;

      notify("success", "¡Venta registrada!", `$${monto.toLocaleString("es-MX")} MXN guardados correctamente.`);
      setClienteId(""); setVentaProdId(""); setVentaCantidad(""); setVentaMonto(""); setMontoManual(false);
      setFechaVenta(new Date().toISOString().slice(0, 10));
      router.refresh();
    } catch (e: any) {
      notify("error", "Error al guardar", e.message ?? "No se pudo insertar la venta en Supabase");
    } finally {
      setSavingVenta(false);
    }
  }

  // ── Estado: Carga Masiva ──────────────────────────────────────────────────
  const [dragging,    setDragging]    = useState(false);
  const [parsed,      setParsed]      = useState<ParsedFile | null>(null);
  const [tablaDest,   setTablaDest]   = useState<TablaDest>("mermas");
  const [mapping,     setMapping]     = useState<Record<string, string>>({});
  const [uploading,   setUploading]   = useState(false);
  const [uploadRes,   setUploadRes]   = useState<{ inserted: number; skipped: number } | null>(null);

  // Resolvers nombre → ID
  function resolveProducto(val: string): number | null {
    const s = String(val ?? "").trim();
    const byId = productos.find(p => String(p.id) === s);
    if (byId) return byId.id;
    const lower = s.toLowerCase();
    return productos.find(p => p.nombre.toLowerCase().includes(lower) || lower.includes(p.nombre.toLowerCase()))?.id ?? null;
  }
  function resolveCliente(val: string): number | null {
    const s = String(val ?? "").trim();
    const byId = clientes.find(c => String(c.id) === s);
    if (byId) return byId.id;
    const lower = s.toLowerCase();
    return clientes.find(c => c.nombre.toLowerCase().includes(lower) || lower.includes(c.nombre.toLowerCase()))?.id ?? null;
  }

  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let headers: string[] = [];
      let rows: Record<string, string>[] = [];

      if (ext === "csv") {
        const result = await new Promise<Papa.ParseResult<Record<string, string>>>((res, rej) =>
          Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: res, error: rej })
        );
        headers = result.meta.fields ?? [];
        rows = result.data;
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(buf);
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        headers   = (raw[0] as string[]).map(String);
        rows = (raw.slice(1) as unknown[][])
          .map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = String((row as unknown[])[i] ?? ""); });
            return obj;
          })
          .filter(r => Object.values(r).some(v => v !== "" && v !== "undefined"));
      } else {
        return notify("error", "Formato no soportado", "Sube un archivo .csv, .xlsx o .xls");
      }

      setParsed({ name: file.name, headers, rows });
      setMapping({});
      setUploadRes(null);
    } catch (e: any) {
      notify("error", "Error al leer archivo", e.message ?? "No se pudo procesar el archivo");
    }
  }

  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); },  []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload() {
    if (!parsed) return;
    setUploading(true);
    let inserted = 0, skipped = 0;
    const hoy = new Date().toISOString().slice(0, 10);

    try {
      if (tablaDest === "mermas") {
        type MermaInsert = {
          producto_id: number; fecha_merma: string;
          cantidad_perdida: number; motivo: string; costo_perdida: number;
        };
        const payload: MermaInsert[] = [];

        for (const row of parsed.rows) {
          const pid  = mapping.producto ? resolveProducto(row[mapping.producto] ?? "") : null;
          const cant = Number(mapping.cantidad_perdida ? row[mapping.cantidad_perdida] : 0);
          if (!pid || cant <= 0) { skipped++; continue; }

          const prod  = productos.find(p => p.id === pid);
          const costo = Number(mapping.costo_perdida ? row[mapping.costo_perdida] ?? 0 : 0);

          payload.push({
            producto_id:      pid,
            fecha_merma:      mapping.fecha_merma && row[mapping.fecha_merma]
                                ? String(row[mapping.fecha_merma]).slice(0, 10) : hoy,
            cantidad_perdida: cant,
            motivo:           mapping.motivo ? String(row[mapping.motivo] ?? "") : "",
            costo_perdida:    costo > 0 ? costo : (prod ? prod.costo_proveedor * cant : 0),
          });
        }

        if (!payload.length) {
          notify("error", "Sin datos válidos", "Ninguna fila pasó la validación. Revisa el mapeo de columnas.");
          setUploading(false); return;
        }
        const { error } = await supabase.from("mermas").insert(payload);
        if (error) throw error;
        inserted = payload.length;

      } else {
        type VentaInsert = {
          cliente_id: number; producto_id: number; fecha_venta: string;
          cantidad: number; monto_total: number;
        };
        const payload: VentaInsert[] = [];

        for (const row of parsed.rows) {
          const pid   = mapping.producto ? resolveProducto(row[mapping.producto] ?? "") : null;
          const cid   = mapping.cliente  ? resolveCliente(row[mapping.cliente] ?? "")   : null;
          const cant  = Number(mapping.cantidad   ? row[mapping.cantidad]   : 0);
          const monto = Number(mapping.monto_total ? row[mapping.monto_total] : 0);

          if (!pid || !cid || cant <= 0 || monto <= 0) { skipped++; continue; }

          payload.push({
            cliente_id:  cid,
            producto_id: pid,
            fecha_venta: mapping.fecha_venta && row[mapping.fecha_venta]
                           ? String(row[mapping.fecha_venta]) : new Date().toISOString().slice(0, 19),
            cantidad:    cant,
            monto_total: monto,
          });
        }

        if (!payload.length) {
          notify("error", "Sin datos válidos", "Ninguna fila pasó la validación. Revisa el mapeo.");
          setUploading(false); return;
        }
        const { error } = await supabase.from("ventas").insert(payload);
        if (error) throw error;
        inserted = payload.length;
      }

      setUploadRes({ inserted, skipped });
      notify("success", `${inserted} registro${inserted > 1 ? "s" : ""} importados`,
        skipped > 0 ? `${skipped} fila${skipped > 1 ? "s" : ""} omitida${skipped > 1 ? "s" : ""} por datos incompletos.`
                    : "Todos los registros se cargaron correctamente.");
      router.refresh();

    } catch (e: any) {
      notify("error", "Error al importar", e.message ?? "Hubo un problema al insertar en Supabase");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate(tabla: TablaDest) {
    const defs = {
      mermas: {
        headers: ["producto", "fecha_merma", "cantidad_perdida", "motivo", "costo_perdida"],
        example: [productos[0]?.nombre ?? "Producto A", hoy(), "3", "Caducidad del producto", ""],
      },
      ventas: {
        headers: ["cliente", "producto", "fecha_venta", "cantidad", "monto_total"],
        example: [clientes[0]?.nombre ?? "Cliente A", productos[0]?.nombre ?? "Producto A",
                  `${hoy()}T09:00:00`, "10", "6800"],
      },
    }[tabla];

    const csv = [defs.headers.join(","), defs.example.join(",")].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `plantilla_${tabla}.csv`;
    a.click();
  }

  function hoy() { return new Date().toISOString().slice(0, 10); }

  const campos        = CAMPOS[tablaDest];
  const requiredOk    = campos.filter(f => f.req).every(f => mapping[f.key]);
  const puedeSubir    = !!parsed && requiredOk && !uploading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {toast && <Toast t={toast} onClose={() => setToast(null)} />}

      {/* Tab pills */}
      <div className="mb-7 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {([
          { id: "manual" as Tab, emoji: "✍️", label: "Captura Manual" },
          { id: "masiva" as Tab, emoji: "📊", label: "Carga Masiva Excel / CSV" },
        ] as const).map(({ id, emoji, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === id ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: CAPTURA MANUAL
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "manual" && (
        <div className="space-y-6">

          {/* Sub-tabs: Merma / Venta */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
            {([
              { id: "merma" as TabManual, Icon: Flame,         label: "Registrar Merma",  color: "text-rose-600"   },
              { id: "venta" as TabManual, Icon: ShoppingCart,  label: "Registrar Venta",  color: "text-emerald-600"},
            ]).map(({ id, Icon, label, color }) => (
              <button key={id} onClick={() => setTabManual(id)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  tabManual === id ? `bg-white shadow-sm ${color}` : "text-gray-500 hover:text-gray-700"
                }`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Formulario Merma ── */}
          {tabManual === "merma" && (<>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-rose-500" />
              <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
                Registrar merma
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-6">El costo de pérdida se calcula automáticamente con el costo del proveedor</p>

            <div className="space-y-4">
              {/* Producto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Producto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select value={prodId} onChange={e => { setProdId(e.target.value); setCantidad(""); }}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all pr-9">
                    <option value="">— Selecciona un producto —</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · costo ${p.costo_proveedor.toLocaleString("es-MX")}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Fecha <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={fechaMerma}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFechaMerma(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>

              {/* Cantidad + preview costo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Cantidad perdida <span className="text-rose-500">*</span>
                </label>
                <input type="number" min="1" step="1" placeholder="ej. 5" value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />

                {/* Cálculo en vivo */}
                {costoCalc > 0 && (
                  <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
                    <p className="text-xs text-amber-800">
                      💸 Costo calculado:{" "}
                      <strong className="text-amber-900 text-sm">${costoCalc.toLocaleString("es-MX")} MXN</strong>
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {cantidad} × ${prodSel?.costo_proveedor.toLocaleString("es-MX")} costo unitario
                    </p>
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Motivo <span className="text-rose-500">*</span>
                </label>
                <textarea placeholder="ej. Caducidad del producto, daño en almacén, rotura durante transporte..."
                  value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none" />
              </div>

              {/* Botón */}
              <button onClick={guardarMerma}
                disabled={saving || !prodId || Number(cantidad) <= 0 || !motivo.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando en Supabase…</>
                  : <><Plus className="h-4 w-4" /> Registrar Merma</>}
              </button>
            </div>
          </div>

          {/* Panel lateral Merma */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3">¿Cómo funciona?</p>
              <ol className="space-y-2.5">
                {[
                  "Selecciona el producto afectado del catálogo",
                  "Ingresa cuántas unidades se perdieron",
                  "Describe brevemente el motivo de la merma",
                  "El costo se calcula automáticamente con el precio de costo del proveedor",
                  "El registro queda guardado en Supabase y el Semáforo se actualiza",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-indigo-700">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-200 text-[10px] font-bold text-indigo-800">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                Productos disponibles ({productos.length})
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {productos.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[55%]">{p.nombre}</span>
                    <span className="text-gray-400 flex-shrink-0 font-mono">
                      ${p.costo_proveedor.toLocaleString("es-MX")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>)}

          {/* ── Formulario Venta ── */}
          {tabManual === "venta" && (<>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
              <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
                Registrar venta
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-6">El monto total se calcula con el precio de venta del producto</p>

            <div className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all pr-9">
                    <option value="">— Selecciona un cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Producto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Producto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select value={ventaProdId} onChange={e => { setVentaProdId(e.target.value); setVentaCantidad(""); setMontoManual(false); }}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all pr-9">
                    <option value="">— Selecciona un producto —</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · precio ${p.precio_venta.toLocaleString("es-MX")}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Fecha <span className="text-rose-500">*</span>
                </label>
                <input type="date" value={fechaVenta}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFechaVenta(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>

              {/* Cantidad + preview monto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Cantidad <span className="text-rose-500">*</span>
                </label>
                <input type="number" min="1" step="1" placeholder="ej. 10" value={ventaCantidad}
                  onChange={e => { setVentaCantidad(e.target.value); setMontoManual(false); }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />

                {montoCalc > 0 && !montoManual && (
                  <div className="mt-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                    <p className="text-xs text-emerald-800">
                      💰 Monto calculado:{" "}
                      <strong className="text-emerald-900 text-sm">${montoCalc.toLocaleString("es-MX")} MXN</strong>
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      {ventaCantidad} × ${ventaProdSel?.precio_venta.toLocaleString("es-MX")} precio de venta
                    </p>
                  </div>
                )}
              </div>

              {/* Monto manual (override) */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Monto total <span className="text-gray-400 font-normal">(opcional — sobrescribe el cálculo)</span>
                </label>
                <input type="number" min="0" step="0.01" placeholder={montoCalc > 0 ? `${montoCalc} (calculado)` : "ej. 6800"}
                  value={montoManual ? ventaMonto : ""}
                  onChange={e => { setVentaMonto(e.target.value); setMontoManual(true); }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>

              {/* Botón */}
              <button onClick={guardarVenta}
                disabled={savingVenta || !clienteId || !ventaProdId || Number(ventaCantidad) <= 0 || (montoManual ? Number(ventaMonto) <= 0 : montoCalc <= 0)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {savingVenta
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando en Supabase…</>
                  : <><Plus className="h-4 w-4" /> Registrar Venta</>}
              </button>
            </div>
          </div>

          {/* Panel lateral Venta */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">¿Cómo funciona?</p>
              <ol className="space-y-2.5">
                {[
                  "Selecciona el cliente que realizó la compra",
                  "Elige el producto vendido del catálogo",
                  "Ingresa la cantidad de unidades",
                  "El monto se calcula automáticamente con el precio de venta",
                  "Puedes sobrescribir el monto si hubo descuento o precio especial",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-emerald-700">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
                Clientes ({clientes.length})
              </p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {clientes.map(c => (
                  <div key={c.id} className="text-xs text-gray-700 truncate">{c.nombre}</div>
                ))}
              </div>
            </div>
          </div>
          </>)}
        </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: CARGA MASIVA
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "masiva" && (
        <div className="space-y-5">

          {/* Selector de tabla destino */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              ¿A qué tabla quieres importar?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: "mermas" as TablaDest, emoji: "📉", label: "Mermas", sub: "costo_perdida calculado automáticamente" },
                { val: "ventas" as TablaDest, emoji: "💰", label: "Ventas", sub: "relaciona clientes y productos" },
              ]).map(({ val, emoji, label, sub }) => (
                <button key={val} onClick={() => { setTablaDest(val); setMapping({}); }}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    tablaDest === val ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-sm font-bold ${tablaDest === val ? "text-indigo-700" : "text-gray-700"}`}>
                    {emoji} {label}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${tablaDest === val ? "text-indigo-500" : "text-gray-400"}`}>{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Zona de Drag & Drop */}
          <div
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 cursor-pointer transition-all select-none ${
              dragging  ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
              : parsed  ? "border-emerald-300 bg-emerald-50"
              :           "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/60"
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); e.target.value = ""; }} />

            {parsed ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-base font-bold text-emerald-700">{parsed.name}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  <strong>{parsed.rows.length}</strong> filas · <strong>{parsed.headers.length}</strong> columnas detectadas
                </p>
                <p className="text-xs text-emerald-500 mt-2">Haz clic para cambiar de archivo</p>
              </>
            ) : (
              <>
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-colors ${dragging ? "bg-indigo-100" : "bg-gray-100"}`}>
                  <Upload className={`h-8 w-8 transition-colors ${dragging ? "text-indigo-600" : "text-gray-400"}`} />
                </div>
                <p className={`text-base font-bold ${dragging ? "text-indigo-700" : "text-gray-600"}`}>
                  {dragging ? "¡Suelta el archivo aquí!" : "Arrastra y suelta tu archivo"}
                </p>
                <p className="text-sm text-gray-400 mt-1">o haz clic para explorar</p>
                <div className="flex items-center gap-2 mt-4">
                  {[".CSV", ".XLSX", ".XLS"].map(f => (
                    <span key={f} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">{f}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Mapeador de columnas */}
          {parsed && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                Mapeo de columnas
              </h3>
              <p className="text-xs text-gray-400 mb-5">
                Indica qué columna de <strong>{parsed.name}</strong> corresponde a cada campo de la tabla <strong>{tablaDest}</strong>
              </p>

              <div className="space-y-3">
                {campos.map(campo => (
                  <div key={campo.key} className="flex items-center gap-4">
                    {/* Nombre del campo */}
                    <div className="w-44 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700">{campo.label}</span>
                        {campo.req && <span className="text-rose-500 text-xs">*</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{campo.hint}</p>
                    </div>

                    {/* Selector de columna del CSV */}
                    <div className="flex-1 relative">
                      <select
                        value={mapping[campo.key] ?? ""}
                        onChange={e => setMapping(m => ({ ...m, [campo.key]: e.target.value }))}
                        className={`w-full appearance-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-all pr-8 ${
                          mapping[campo.key]
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 text-gray-400"
                        } focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
                      >
                        <option value="">— No mapear —</option>
                        {parsed.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    </div>

                    {/* Indicador */}
                    <div className="w-6 flex-shrink-0 flex justify-center">
                      {campo.req && (
                        mapping[campo.key]
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <AlertCircle  className="h-4 w-4 text-gray-200" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hint sobre nombre → ID */}
              <p className="mt-4 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                💡 Para <strong>Producto</strong> y <strong>Cliente</strong> puedes usar el nombre completo del catálogo (sin distinción de mayúsculas) o el ID numérico.
              </p>
            </div>
          )}

          {/* Vista previa del archivo */}
          {parsed && parsed.rows.length > 0 && (
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
                  Vista previa — primeras 5 filas
                </p>
                <span className="text-xs text-gray-400">{parsed.rows.length} filas en total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      {parsed.headers.map(h => (
                        <th key={h} className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${
                          Object.values(mapping).includes(h) ? "text-indigo-600 bg-indigo-50" : "text-gray-400"
                        }`}>
                          {h}
                          {Object.values(mapping).includes(h) && (
                            <span className="ml-1 text-[9px]">✓</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        {parsed.headers.map(h => (
                          <td key={h} className={`px-4 py-2.5 whitespace-nowrap max-w-[160px] truncate ${
                            Object.values(mapping).includes(h) ? "text-gray-800 font-medium" : "text-gray-400"
                          }`}>
                            {String(row[h] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="border-t border-gray-50 px-6 py-2.5 text-xs text-gray-400">
                  … y {parsed.rows.length - 5} filas más que se importarán
                </p>
              )}
            </div>
          )}

          {/* Resultado de importación anterior */}
          {uploadRes && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Importación completada</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  <strong>{uploadRes.inserted}</strong> registro{uploadRes.inserted !== 1 ? "s" : ""} insertados en <strong>{tablaDest}</strong>
                  {uploadRes.skipped > 0 && (
                    <span className="ml-2 text-amber-600">
                      · {uploadRes.skipped} omitidos por datos incompletos
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Botón de upload */}
          {parsed && (
            <button onClick={handleUpload} disabled={!puedeSubir}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando {parsed.rows.length} registros a Supabase…</>
                : !requiredOk
                  ? <><AlertCircle className="h-4 w-4" /> Mapea los campos obligatorios (*) para continuar</>
                  : <><Upload className="h-4 w-4" /> Importar {parsed.rows.length} registros → {tablaDest}</>}
            </button>
          )}

          {/* Descargar plantillas */}
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-5">
            <p className="text-xs font-semibold text-gray-500 text-center mb-3">
              ¿Primera vez? Descarga la plantilla con el formato correcto
            </p>
            <div className="flex justify-center gap-3">
              {(["mermas", "ventas"] as TablaDest[]).map(t => (
                <button key={t} onClick={() => downloadTemplate(t)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                  <Download className="h-3.5 w-3.5" />
                  Plantilla {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
