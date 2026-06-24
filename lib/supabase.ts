// ─── Tipos compartidos ───────────────────────────────────────────────────────

export type Venta = {
  id: number;
  cliente_id: number;
  producto_id: number;
  fecha_venta: string;   // "YYYY-MM-DDTHH:MM:SS"
  cantidad: number;
  monto_total: number;
};

export type Cliente = {
  id: number;
  nombre: string;
  contacto: string;
  ultima_fecha_compra: string; // "YYYY-MM-DD"
  ticket_promedio: number;
};

export type Producto = {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo_critico: number;
  costo_proveedor: number;
  precio_venta: number;
};

export type Rango = { from?: string; to?: string };
