import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres el Analista de BI de BI-Corp, asistente estratégico para directores de negocio con acceso directo a datos en tiempo real.

Datos disponibles vía herramientas:
- **Ventas**: historial de transacciones con clientes, productos, montos y fechas
- **Inventario**: stock actual vs. crítico, costos de proveedor y márgenes de ganancia
- **Clientes**: directorio con historial de compras y riesgo de abandono (churn)
- **Mermas**: registro de pérdidas con producto, causa y costo de cada incidente

Reglas de respuesta:
1. Responde SIEMPRE en español
2. NUNCA inventes cifras — consulta los datos antes de citar cualquier número
3. Montos en formato mexicano: $1,234.56 MXN
4. Usa markdown: **negrita** para cifras importantes, listas con -, emojis estratégicos
5. Al detectar un problema, sugiere la acción concreta a tomar
6. Sé conciso y ejecutivo — el director quiere insights, no reportes largos
7. Si hay varios hallazgos relevantes, priorizalos por impacto económico`;

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateRange(periodo: string): { from: string | null; to: string | null } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  switch (periodo) {
    case "hoy": {
      const base = now.toISOString().slice(0, 10);
      return { from: `${base}T00:00:00`, to: `${base}T23:59:59` };
    }
    case "semana":
      return { from: iso(new Date(now.getTime() - 7 * 86_400_000)), to: iso(now) };
    case "mes_actual": {
      const y = now.getFullYear(), m = now.getMonth();
      const pad = (n: number) => String(n).padStart(2, "0");
      const last = new Date(y, m + 1, 0).getDate();
      return {
        from: `${y}-${pad(m + 1)}-01T00:00:00`,
        to: `${y}-${pad(m + 1)}-${pad(last)}T23:59:59`,
      };
    }
    case "ultimos_30_dias":
      return { from: iso(new Date(now.getTime() - 30 * 86_400_000)), to: iso(now) };
    case "ultimos_90_dias":
      return { from: iso(new Date(now.getTime() - 90 * 86_400_000)), to: iso(now) };
    default:
      return { from: null, to: null };
  }
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "obtener_kpis",
    description:
      "Obtiene el resumen ejecutivo de KPIs: ventas del mes actual, mermas, productos con stock crítico y clientes en riesgo de churn. Úsalo cuando el director pida el estado general del negocio o un resumen rápido.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "consultar_ventas",
    description:
      "Consulta el historial de ventas con filtros de período. Puede agrupar resultados por cliente, producto o día para análisis comparativos.",
    input_schema: {
      type: "object" as const,
      properties: {
        periodo: {
          type: "string",
          enum: ["hoy", "semana", "mes_actual", "ultimos_30_dias", "ultimos_90_dias"],
          description: "Período de tiempo a consultar",
        },
        agrupar_por: {
          type: "string",
          enum: ["cliente", "producto", "dia", "ninguno"],
          description: "Cómo agrupar los resultados",
        },
        top_n: {
          type: "integer",
          description: "Número máximo de resultados a retornar (por monto). Default: 10",
        },
      },
      required: ["periodo"],
    },
  },
  {
    name: "consultar_inventario",
    description:
      "Consulta el inventario de productos: stock actual vs. mínimo crítico, costos, precios y márgenes. Útil para detectar riesgos de desabasto.",
    input_schema: {
      type: "object" as const,
      properties: {
        filtro: {
          type: "string",
          enum: ["todos", "criticos", "bajo_stock"],
          description:
            "criticos: stock_actual <= stock_minimo. bajo_stock: stock_actual <= 1.5×stock_minimo. todos: sin filtro.",
        },
        top_n: {
          type: "integer",
          description: "Número máximo de productos a retornar. Default: 20",
        },
      },
      required: ["filtro"],
    },
  },
  {
    name: "consultar_clientes",
    description:
      "Analiza el comportamiento de clientes: clientes en riesgo de churn, top compradores históricos, o clientes inactivos.",
    input_schema: {
      type: "object" as const,
      properties: {
        tipo: {
          type: "string",
          enum: ["en_riesgo", "top_compradores", "sin_comprar", "todos"],
          description: "Tipo de análisis de clientes",
        },
        dias: {
          type: "integer",
          description:
            "Para 'en_riesgo' y 'sin_comprar': días de inactividad a considerar. Default: 30",
        },
        top_n: {
          type: "integer",
          description: "Número máximo de clientes a retornar. Default: 10",
        },
      },
      required: ["tipo"],
    },
  },
  {
    name: "consultar_mermas",
    description:
      "Consulta el registro de mermas: pérdidas por producto, causas principales y costo acumulado. Útil para análisis de desperdicio y control de costos.",
    input_schema: {
      type: "object" as const,
      properties: {
        periodo: {
          type: "string",
          enum: ["semana", "mes_actual", "ultimos_30_dias", "todo"],
          description: "Período de tiempo a consultar",
        },
        top_n: {
          type: "integer",
          description: "Top N productos más afectados por mermas. Default: 10",
        },
      },
      required: ["periodo"],
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>;

async function runTool(name: string, input: ToolInput): Promise<string> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    switch (name) {
      case "obtener_kpis": {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        const pad = (n: number) => String(n).padStart(2, "0");
        const firstDay = `${y}-${pad(m + 1)}-01T00:00:00`;
        const lastDay = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}T23:59:59`;
        const hace30 = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

        const [{ data: ventas }, { data: mermas }, { data: productos }, { data: clientes }] =
          await Promise.all([
            sb.from("ventas").select("monto_total, cantidad").gte("fecha_venta", firstDay).lte("fecha_venta", lastDay),
            sb.from("mermas").select("costo_perdida").gte("fecha_merma", firstDay.slice(0, 10)).lte("fecha_merma", lastDay.slice(0, 10)),
            sb.from("productos").select("nombre, stock_actual, stock_minimo_critico"),
            sb.from("clientes").select("nombre, ultima_fecha_compra"),
          ]);

        const totalVentas = (ventas ?? []).reduce((s, v) => s + v.monto_total, 0);
        const unidades = (ventas ?? []).reduce((s, v) => s + v.cantidad, 0);
        const totalMermas = (mermas ?? []).reduce((s, m) => s + (m.costo_perdida ?? 0), 0);
        const criticos = (productos ?? []).filter(p => p.stock_actual <= p.stock_minimo_critico);
        const enRiesgo = (clientes ?? []).filter(c => c.ultima_fecha_compra < hace30);

        return JSON.stringify({
          mes: `${y}-${pad(m + 1)}`,
          ventas_mes: {
            total_mxn: fmt(totalVentas),
            transacciones: ventas?.length ?? 0,
            unidades_vendidas: unidades,
          },
          mermas_mes: {
            costo_total_mxn: fmt(totalMermas),
            incidentes: mermas?.length ?? 0,
          },
          productos_criticos: {
            total: criticos.length,
            ejemplos: criticos.slice(0, 4).map(p => ({
              nombre: p.nombre,
              stock_actual: p.stock_actual,
              stock_minimo: p.stock_minimo_critico,
            })),
          },
          clientes_sin_comprar_30d: {
            total: enRiesgo.length,
            ejemplos: enRiesgo.slice(0, 3).map(c => ({
              nombre: c.nombre,
              ultima_compra: c.ultima_fecha_compra,
            })),
          },
        }, null, 2);
      }

      case "consultar_ventas": {
        const periodo = input.periodo as string;
        const agrupar = (input.agrupar_por as string) ?? "ninguno";
        const topN = (input.top_n as number) ?? 10;
        const { from, to } = getDateRange(periodo);

        let q = sb
          .from("ventas")
          .select("monto_total, cantidad, cliente_id, producto_id, fecha_venta, clientes(nombre), productos(nombre)");
        if (from) q = q.gte("fecha_venta", from);
        if (to) q = q.lte("fecha_venta", to);

        const { data, error } = await q;
        if (error) throw error;
        const rows = data ?? [];

        const totalGeneral = rows.reduce((s, v) => s + v.monto_total, 0);
        const totalUnidades = rows.reduce((s, v) => s + v.cantidad, 0);

        if (agrupar === "cliente") {
          const map = new Map<number, { nombre: string; total: number; pedidos: number }>();
          for (const v of rows) {
            const nombre = (v.clientes as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
            const p = map.get(v.cliente_id) ?? { nombre, total: 0, pedidos: 0 };
            map.set(v.cliente_id, { nombre, total: p.total + v.monto_total, pedidos: p.pedidos + 1 });
          }
          const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, topN);
          return JSON.stringify({
            periodo,
            total_general_mxn: fmt(totalGeneral),
            transacciones: rows.length,
            top_clientes: sorted.map(c => ({ nombre: c.nombre, total_mxn: fmt(c.total), pedidos: c.pedidos })),
          }, null, 2);
        }

        if (agrupar === "producto") {
          const map = new Map<number, { nombre: string; total: number; unidades: number }>();
          for (const v of rows) {
            const nombre = (v.productos as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
            const p = map.get(v.producto_id) ?? { nombre, total: 0, unidades: 0 };
            map.set(v.producto_id, { nombre, total: p.total + v.monto_total, unidades: p.unidades + v.cantidad });
          }
          const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, topN);
          return JSON.stringify({
            periodo,
            total_general_mxn: fmt(totalGeneral),
            transacciones: rows.length,
            top_productos: sorted.map(p => ({ nombre: p.nombre, total_mxn: fmt(p.total), unidades: p.unidades })),
          }, null, 2);
        }

        if (agrupar === "dia") {
          const map = new Map<string, number>();
          for (const v of rows) {
            const dia = v.fecha_venta.slice(0, 10);
            map.set(dia, (map.get(dia) ?? 0) + v.monto_total);
          }
          const byDay = Array.from(map.entries())
            .map(([dia, total]) => ({ dia, total_mxn: fmt(total) }))
            .sort((a, b) => a.dia.localeCompare(b.dia));
          return JSON.stringify({ periodo, total_general_mxn: fmt(totalGeneral), por_dia: byDay }, null, 2);
        }

        return JSON.stringify({
          periodo,
          total_mxn: fmt(totalGeneral),
          transacciones: rows.length,
          unidades_vendidas: totalUnidades,
        }, null, 2);
      }

      case "consultar_inventario": {
        const filtro = input.filtro as string;
        const topN = (input.top_n as number) ?? 20;

        const { data, error } = await sb.from("productos").select("*").order("nombre");
        if (error) throw error;

        let prods = data ?? [];
        if (filtro === "criticos") prods = prods.filter(p => p.stock_actual <= p.stock_minimo_critico);
        else if (filtro === "bajo_stock") prods = prods.filter(p => p.stock_actual <= p.stock_minimo_critico * 1.5);

        const result = prods.slice(0, topN).map(p => ({
          nombre: p.nombre,
          stock_actual: p.stock_actual,
          stock_minimo: p.stock_minimo_critico,
          deficit: Math.max(0, p.stock_minimo_critico - p.stock_actual),
          costo_proveedor_mxn: fmt(p.costo_proveedor),
          precio_venta_mxn: fmt(p.precio_venta),
          margen_pct: p.precio_venta > 0
            ? Math.round(((p.precio_venta - p.costo_proveedor) / p.precio_venta) * 100)
            : 0,
          estado: p.stock_actual <= p.stock_minimo_critico ? "CRÍTICO"
            : p.stock_actual <= p.stock_minimo_critico * 1.5 ? "BAJO" : "OK",
        }));

        return JSON.stringify({ filtro, total: result.length, productos: result }, null, 2);
      }

      case "consultar_clientes": {
        const tipo = input.tipo as string;
        const dias = (input.dias as number) ?? 30;
        const topN = (input.top_n as number) ?? 10;

        if (tipo === "en_riesgo" || tipo === "sin_comprar") {
          const fecha = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
          const { data, error } = await sb
            .from("clientes").select("*").lt("ultima_fecha_compra", fecha).order("ultima_fecha_compra");
          if (error) throw error;
          return JSON.stringify({
            tipo,
            dias_inactividad: dias,
            total_en_riesgo: data?.length ?? 0,
            clientes: (data ?? []).slice(0, topN).map(c => ({
              nombre: c.nombre,
              ultima_compra: c.ultima_fecha_compra,
              dias_inactivo: Math.floor((Date.now() - new Date(c.ultima_fecha_compra).getTime()) / 86_400_000),
              ticket_promedio_mxn: fmt(c.ticket_promedio ?? 0),
            })),
          }, null, 2);
        }

        if (tipo === "top_compradores") {
          const { data: ventas, error } = await sb
            .from("ventas").select("cliente_id, monto_total, clientes(nombre)");
          if (error) throw error;
          const map = new Map<number, { nombre: string; total: number; pedidos: number }>();
          for (const v of ventas ?? []) {
            const nombre = (v.clientes as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
            const p = map.get(v.cliente_id) ?? { nombre, total: 0, pedidos: 0 };
            map.set(v.cliente_id, { nombre, total: p.total + v.monto_total, pedidos: p.pedidos + 1 });
          }
          const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, topN);
          return JSON.stringify({
            tipo,
            top_clientes: sorted.map(c => ({
              nombre: c.nombre,
              total_historico_mxn: fmt(c.total),
              pedidos: c.pedidos,
            })),
          }, null, 2);
        }

        const { data, error } = await sb.from("clientes").select("id, nombre, ultima_fecha_compra, ticket_promedio").order("nombre").limit(topN);
        if (error) throw error;
        return JSON.stringify({ tipo, clientes: data ?? [] }, null, 2);
      }

      case "consultar_mermas": {
        const periodo = input.periodo as string;
        const topN = (input.top_n as number) ?? 10;
        const { from, to } = getDateRange(periodo === "todo" ? "ultimos_90_dias" : periodo);

        let q = sb.from("mermas").select("*, productos(nombre)").order("fecha_merma", { ascending: false });
        if (from && periodo !== "todo") q = q.gte("fecha_merma", from.slice(0, 10));
        if (to && periodo !== "todo") q = q.lte("fecha_merma", to.slice(0, 10));

        const { data, error } = await q;
        if (error) throw error;
        const rows = data ?? [];

        const totalCosto = rows.reduce((s, m) => s + (m.costo_perdida ?? 0), 0);

        const map = new Map<number, { nombre: string; costo: number; cantidad: number; incidentes: number }>();
        for (const m of rows) {
          const nombre = (m.productos as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
          const p = map.get(m.producto_id) ?? { nombre, costo: 0, cantidad: 0, incidentes: 0 };
          map.set(m.producto_id, {
            nombre,
            costo: p.costo + (m.costo_perdida ?? 0),
            cantidad: p.cantidad + m.cantidad_perdida,
            incidentes: p.incidentes + 1,
          });
        }

        return JSON.stringify({
          periodo,
          total_costo_mxn: fmt(totalCosto),
          total_incidentes: rows.length,
          motivos_principales: [...new Set(rows.map(m => m.motivo).filter(Boolean))].slice(0, 5),
          top_productos: Array.from(map.values())
            .sort((a, b) => b.costo - a.costo)
            .slice(0, topN)
            .map(p => ({ nombre: p.nombre, costo_mxn: fmt(p.costo), cantidad_perdida: p.cantidad, incidentes: p.incidentes })),
          ultimos_5: rows.slice(0, 5).map(m => ({
            fecha: m.fecha_merma,
            producto: (m.productos as unknown as { nombre: string } | null)?.nombre ?? "Desconocido",
            cantidad: m.cantidad_perdida,
            costo_mxn: fmt(m.costo_perdida ?? 0),
            motivo: m.motivo,
          })),
        }, null, 2);
      }

      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
    }
  } catch (error) {
    return JSON.stringify({
      error: "Error al consultar la base de datos",
      detalle: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY no está configurada. Agrégala a .env.local" },
      { status: 500 }
    );
  }

  let messages: Anthropic.MessageParam[];
  try {
    const body = await request.json() as { messages?: Anthropic.MessageParam[] };
    messages = body.messages ?? [];
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller already closed (client disconnected)
        }
      };

      try {
        let currentMsgs: Anthropic.MessageParam[] = [...messages];

        // Max 5 iterations to prevent infinite loops
        for (let i = 0; i < 5; i++) {
          const stream = anthropic.messages.stream({
            model: "claude-haiku-4-5",
            max_tokens: 4096,
            system: [
              {
                type: "text" as const,
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" as const },
              },
            ],
            tools: TOOLS,
            messages: currentMsgs,
          });

          stream.on("text", (delta) => {
            send({ type: "text", content: delta });
          });

          const final = await stream.finalMessage();

          if (final.stop_reason === "end_turn") break;

          if (final.stop_reason === "tool_use") {
            currentMsgs = [...currentMsgs, { role: "assistant", content: final.content }];
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of final.content) {
              if (block.type === "tool_use") {
                send({ type: "tool_start", name: block.name });
                const result = await runTool(block.name, block.input as ToolInput);
                send({ type: "tool_done", name: block.name });
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
              }
            }

            currentMsgs = [...currentMsgs, { role: "user", content: toolResults }];
          } else {
            break;
          }
        }

        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Error interno del servidor",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
