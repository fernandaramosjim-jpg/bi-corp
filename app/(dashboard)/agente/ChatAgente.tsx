"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Bot,
  BarChart3,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  label: string;
  done: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  streaming?: boolean;
  error?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  obtener_kpis: "Obteniendo KPIs del negocio",
  consultar_ventas: "Consultando ventas",
  consultar_inventario: "Revisando inventario",
  consultar_clientes: "Analizando clientes",
  consultar_mermas: "Consultando mermas",
};

const QUICK_ACTIONS = [
  {
    icon: BarChart3,
    label: "KPIs del día",
    prompt: "Dame un resumen ejecutivo de los KPIs más importantes del negocio hoy",
  },
  {
    icon: TrendingUp,
    label: "Ventas del mes",
    prompt: "¿Cuánto hemos vendido este mes? Dame el desglose por productos principales",
  },
  {
    icon: Package,
    label: "Stock crítico",
    prompt: "¿Qué productos tienen stock crítico o bajo? ¿Cuánto necesito reordenar?",
  },
  {
    icon: Users,
    label: "Clientes en riesgo",
    prompt: "¿Cuáles son los clientes que llevan más de 30 días sin comprar?",
  },
  {
    icon: AlertTriangle,
    label: "Mermas recientes",
    prompt: "Muéstrame las mermas del mes actual y su impacto económico",
  },
];

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function renderMd(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-gray-900 mt-3 mb-0.5 text-[13px]">
          {renderInline(line.slice(3))}
        </p>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <p key={i} className="font-bold text-gray-900 mt-2 mb-0.5 text-sm">
          {renderInline(line.slice(2))}
        </p>
      );
    } else if (line.match(/^[-*•]\s/)) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start my-0.5">
          <span className="text-indigo-400 mt-1 text-[8px] flex-shrink-0">●</span>
          <span className="text-sm leading-snug text-gray-700">{renderInline(line.replace(/^[-*•]\s/, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed text-gray-700">
          {renderInline(line)}
        </p>
      );
    }
  });

  return elements;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatAgente() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: text.trim() };

      setMessages(prev => [
        ...prev,
        userMsg,
        { role: "assistant", content: "", toolCalls: [], streaming: true },
      ]);
      setInput("");
      setIsStreaming(true);

      // Send only text history to the API (stripped of tool details)
      const apiHistory = [...messages, userMsg]
        .filter(m => !m.error && m.content.trim())
        .map(m => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiHistory }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6)) as {
                type: string;
                content?: string;
                name?: string;
                message?: string;
              };

              setMessages(prev => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                if (!last || last.role !== "assistant") return prev;

                switch (data.type) {
                  case "text":
                    return [
                      ...msgs.slice(0, -1),
                      { ...last, content: last.content + (data.content ?? "") },
                    ];
                  case "tool_start":
                    return [
                      ...msgs.slice(0, -1),
                      {
                        ...last,
                        toolCalls: [
                          ...(last.toolCalls ?? []),
                          {
                            name: data.name!,
                            label: TOOL_LABELS[data.name!] ?? data.name!,
                            done: false,
                          },
                        ],
                      },
                    ];
                  case "tool_done":
                    return [
                      ...msgs.slice(0, -1),
                      {
                        ...last,
                        toolCalls: (last.toolCalls ?? []).map(t =>
                          t.name === data.name ? { ...t, done: true } : t
                        ),
                      },
                    ];
                  case "done":
                    return [...msgs.slice(0, -1), { ...last, streaming: false }];
                  case "error":
                    return [
                      ...msgs.slice(0, -1),
                      { ...last, content: data.message ?? "Error desconocido", streaming: false, error: true },
                    ];
                  default:
                    return prev;
                }
              });

              if (data.type === "done" || data.type === "error") {
                setIsStreaming(false);
              }
            } catch {
              // Invalid JSON chunk — skip
            }
          }
        }
        // Garantía: si el stream se cierra sin enviar evento "done" (corte de red, etc.)
        setIsStreaming(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
      } catch (error) {
        setMessages(prev => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              content: error instanceof Error ? error.message : "Error de conexión",
              streaming: false,
              error: true,
            };
          }
          return msgs;
        });
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 65px)" }}>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 px-4 py-6 lg:px-8">
        {isEmpty ? (
          /* Welcome screen */
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 mb-4">
                <Sparkles className="h-7 w-7 text-indigo-600" />
              </div>
              <h2
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                ¿En qué puedo ayudarte?
              </h2>
              <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                Tengo acceso en tiempo real a tus ventas, inventario, clientes y mermas. Pregúntame lo que necesites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/60 transition-all shadow-sm active:scale-[0.98]"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <Icon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation */
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Bot avatar */}
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 mt-1 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={`flex flex-col gap-2 ${
                    msg.role === "user" ? "items-end max-w-[80%]" : "items-start max-w-[88%]"
                  }`}
                >
                  {/* Tool call pills */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.toolCalls.map((tool, ti) => (
                        <div
                          key={ti}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            tool.done
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-white text-gray-500 border border-gray-200"
                          }`}
                        >
                          {tool.done ? (
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                          )}
                          {tool.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Initial spinner (thinking, no content yet) */}
                  {msg.streaming && !msg.content && !msg.toolCalls?.length && (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        <span className="text-xs text-gray-400">Analizando…</span>
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  {(msg.content || (msg.streaming && msg.toolCalls?.some(t => t.done))) && (
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : msg.error
                          ? "bg-rose-50 border border-rose-200"
                          : "bg-white border border-gray-100 shadow-sm"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : msg.error ? (
                        <p className="text-sm text-rose-600">⚠️ {msg.content}</p>
                      ) : (
                        <div>
                          {renderMd(msg.content)}
                          {msg.streaming && (
                            <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gray-200 mt-1 text-xs font-bold text-gray-600">
                    FR
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-4 lg:px-8">
        {!isEmpty && (
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2 mb-3">
            {QUICK_ACTIONS.slice(0, 3).map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => sendMessage(prompt)}
                disabled={isStreaming}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all disabled:opacity-40"
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? "Esperando respuesta…" : "Pregunta sobre ventas, inventario, clientes o mermas…"}
              rows={1}
              disabled={isStreaming}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all disabled:opacity-50 max-h-32"
              style={{ overflowY: "auto" }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        {!isEmpty && (
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        )}
      </div>
    </div>
  );
}
