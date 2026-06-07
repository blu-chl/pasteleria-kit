"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Pedido } from "@/lib/types";

const ESTADOS = ["Pendiente", "En preparación", "Listo", "Entregado", "Cancelado"] as const;
const ESTADO_COLORS: Record<string, string> = {
  Pendiente: "bg-gray-100 text-gray-600",
  "En preparación": "bg-blue-50 text-blue-700",
  Listo: "bg-yellow-50 text-yellow-700",
  Entregado: "bg-green-50 text-green-700",
  Cancelado: "bg-red-50 text-red-600",
};

type NewPedido = Omit<Pedido, "id" | "user_id" | "numero">;
const emptyPedido = (): NewPedido => ({
  cliente: "", telefono: "", descripcion: "",
  fecha_pedido: new Date().toISOString().split("T")[0],
  fecha_entrega: "",
  precio_total: 0, sena_pagada: 0,
  estado: "Pendiente", notas: "",
});

type RecetaResumen = {
  id: string;
  nombre: string;
  porciones: number;
  margen: number;
  costo_envase: number;
  precio_sugerido: number;
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<NewPedido>(emptyPedido());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recetas, setRecetas] = useState<RecetaResumen[]>([]);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState("");

  useEffect(() => { load(); loadRecetas(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("pedidos").select("*").eq("user_id", user.id).order("fecha_entrega", { ascending: true });
    setPedidos(data || []);
    setLoading(false);
  }

  async function loadRecetas() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Traer recetas con sus ingredientes y el stock para calcular precio sugerido
    const { data: rs } = await supabase
      .from("recetas")
      .select("id, nombre, porciones, margen, costo_envase, receta_ingredientes(costo)")
      .eq("user_id", user.id);
    const { data: stock } = await supabase.from("stock").select("nombre, precio_unitario, unidad").eq("user_id", user.id);

    const mapped: RecetaResumen[] = (rs || []).map((r: any) => {
      const costoIngs = (r.receta_ingredientes || []).reduce((s: number, i: any) => s + (Number(i.costo) || 0), 0);
      const costoTotal = costoIngs + (r.costo_envase || 0);
      const precioSugerido = r.margen < 100 ? Math.round(costoTotal / (1 - r.margen / 100)) : 0;
      return { id: r.id, nombre: r.nombre, porciones: r.porciones, margen: r.margen, costo_envase: r.costo_envase, precio_sugerido: precioSugerido };
    });
    setRecetas(mapped);
  }

  function aplicarReceta(recetaId: string) {
    setRecetaSeleccionada(recetaId);
    if (!recetaId) return;
    const r = recetas.find((r) => r.id === recetaId);
    if (!r) return;
    setForm((prev) => ({
      ...prev,
      descripcion: r.nombre.split("(")[0].trim(),
      precio_total: r.precio_sugerido,
    }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const numero = (pedidos.length > 0 ? Math.max(...pedidos.map((p) => p.numero)) : 0) + 1;
    await supabase.from("pedidos").insert({ ...form, user_id: user.id, numero });
    setForm(emptyPedido());
    setRecetaSeleccionada("");
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function updateEstado(id: string, estado: string) {
    const supabase = createClient();
    await supabase.from("pedidos").update({ estado }).eq("id", id);
    setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, estado: estado as Pedido["estado"] } : p));
  }

  async function deletePedido(id: string) {
    const supabase = createClient();
    await supabase.from("pedidos").delete().eq("id", id);
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  const totales = pedidos.reduce((acc, p) => ({
    total: acc.total + p.precio_total,
    cobrado: acc.cobrado + p.sena_pagada,
    pendiente: acc.pendiente + (p.precio_total - p.sena_pagada),
  }), { total: 0, cobrado: 0, pendiente: 0 });

  if (loading) return <div className="p-8 text-gray-400">Cargando pedidos...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Registro de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">El saldo pendiente se calcula solo según lo que te han pagado</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          + Nuevo pedido
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total pedidos", value: `$${totales.total.toLocaleString("es-CL")}`, color: "text-gray-900" },
          { label: "Cobrado (señas)", value: `$${totales.cobrado.toLocaleString("es-CL")}`, color: "text-green-700" },
          { label: "Saldo pendiente", value: `$${totales.pendiente.toLocaleString("es-CL")}`, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nuevo pedido</h2>

          {/* Selector de receta */}
          <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5 block">
              🧁 Basar en una receta (opcional)
            </label>
            <select
              value={recetaSeleccionada}
              onChange={(e) => aplicarReceta(e.target.value)}
              className="w-full border border-amber-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">— Sin receta base, llenar manualmente —</option>
              {recetas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre.split("(")[0].trim()} — precio sugerido: ${r.precio_sugerido.toLocaleString("es-CL")}
                </option>
              ))}
            </select>
            {recetaSeleccionada && (
              <p className="text-xs text-amber-600 mt-1.5">
                ✅ Descripción y precio pre-rellenados. Puedes editarlos abajo.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Nombre cliente</label>
              <input required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Teléfono</label>
              <input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Pedido["estado"] })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5">
                {ESTADOS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500">Descripción del pedido</label>
              <input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="ej. Torta 3 pisos chocolate 20cm para cumpleaños" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha pedido</label>
              <input type="date" value={form.fecha_pedido ?? ""} onChange={(e) => setForm({ ...form, fecha_pedido: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha entrega</label>
              <input type="date" value={form.fecha_entrega ?? ""} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Precio total ($)</label>
              <input type="number" min={0} required value={form.precio_total || ""} onChange={(e) => setForm({ ...form, precio_total: parseFloat(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Seña pagada ($)</label>
              <input type="number" min={0} value={form.sena_pagada || ""} onChange={(e) => setForm({ ...form, sena_pagada: parseFloat(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Notas</label>
              <input value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setRecetaSeleccionada(""); setForm(emptyPedido()); }} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-60 transition-colors">
              {saving ? "Guardando..." : "Guardar pedido"}
            </button>
          </div>
        </form>
      )}

      {/* Lista pedidos */}
      <div className="space-y-3">
        {pedidos.length === 0 && <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">No hay pedidos aún.</div>}
        {pedidos.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">#{p.numero}</span>
                  <span className="font-semibold text-gray-900">{p.cliente}</span>
                  {p.telefono && <span className="text-xs text-gray-400">{p.telefono}</span>}
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] || "bg-gray-100 text-gray-600"}`}>{p.estado}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{p.descripcion}</p>
                <div className="flex gap-4 text-xs text-gray-400">
                  {p.fecha_entrega && <span>📅 Entrega: <strong className="text-gray-700">{p.fecha_entrega}</strong></span>}
                  <span>Total: <strong className="text-gray-900">${p.precio_total.toLocaleString("es-CL")}</strong></span>
                  <span>Seña: <strong className="text-green-700">${p.sena_pagada.toLocaleString("es-CL")}</strong></span>
                  <span>Saldo: <strong className="text-amber-600">${(p.precio_total - p.sena_pagada).toLocaleString("es-CL")}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={p.estado} onChange={(e) => updateEstado(p.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                  {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => deletePedido(p.id)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
