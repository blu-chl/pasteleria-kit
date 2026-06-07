"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Venta } from "@/lib/types";

const CANALES = ["Instagram", "WhatsApp", "Delivery", "Local / tienda", "Feria", "Otro"];
const FORMAS_PAGO = ["Efectivo", "Transferencia", "Tarjeta débito", "Tarjeta crédito", "Otro"];

type NewVenta = Omit<Venta, "id" | "user_id">;
const emptyVenta = (): NewVenta => ({
  fecha: new Date().toISOString().split("T")[0],
  producto: "",
  precio_venta: 0,
  unidades: 1,
  costo_unitario: 0,
  canal: "",
  forma_pago: "",
  notas: "",
});

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<NewVenta>(emptyVenta());
  const [saving, setSaving] = useState(false);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => { load(); }, [mes]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const from = `${mes}-01`;
    const to = `${mes}-31`;
    const { data } = await supabase.from("ventas").select("*").eq("user_id", user.id).gte("fecha", from).lte("fecha", to).order("fecha", { ascending: false });
    setVentas(data || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ventas").insert({ ...form, user_id: user.id });
    setForm(emptyVenta());
    await load();
    setSaving(false);
  }

  async function deleteVenta(id: string) {
    const supabase = createClient();
    await supabase.from("ventas").delete().eq("id", id);
    setVentas((prev) => prev.filter((v) => v.id !== id));
  }

  const totales = ventas.reduce((acc, v) => ({
    ingresos: acc.ingresos + v.precio_venta * v.unidades,
    costo: acc.costo + v.costo_unitario * v.unidades,
    unidades: acc.unidades + v.unidades,
  }), { ingresos: 0, costo: 0, unidades: 0 });
  const ganancia = totales.ingresos - totales.costo;

  if (loading) return <div className="p-8 text-gray-400">Cargando ventas...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Ventas Diarias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra cada venta. Los totales se calculan solos.</p>
        </div>
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Ingresos brutos", value: `$${totales.ingresos.toLocaleString("es-CL")}`, color: "text-green-700" },
          { label: "Costo total", value: `$${totales.costo.toLocaleString("es-CL")}`, color: "text-red-600" },
          { label: "Ganancia bruta", value: `$${ganancia.toLocaleString("es-CL")}`, color: ganancia >= 0 ? "text-green-700" : "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Formulario nueva venta */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">+ Registrar nueva venta</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Fecha</label>
            <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Producto</label>
            <input required value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} placeholder="ej. Torta chocolate" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Unidades</label>
            <input type="number" min={1} required value={form.unidades} onChange={(e) => setForm({ ...form, unidades: parseInt(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Precio venta ($)</label>
            <input type="number" min={0} required value={form.precio_venta || ""} onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Costo unit. ($)</label>
            <input type="number" min={0} value={form.costo_unitario || ""} onChange={(e) => setForm({ ...form, costo_unitario: parseFloat(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Canal</label>
            <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5">
              <option value="">—</option>
              {CANALES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Forma de pago</label>
            <select value={form.forma_pago} onChange={(e) => setForm({ ...form, forma_pago: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5">
              <option value="">—</option>
              {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <input value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div className="mt-3 text-right">
          <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-60 transition-colors">
            {saving ? "Guardando..." : "Registrar venta"}
          </button>
        </div>
      </form>

      {/* Tabla ventas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-right px-4 py-3">Precio</th>
              <th className="text-right px-4 py-3">Und.</th>
              <th className="text-right px-4 py-3">Ingreso</th>
              <th className="text-right px-4 py-3">Ganancia</th>
              <th className="text-left px-4 py-3">Canal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay ventas registradas este mes.</td></tr>
            )}
            {ventas.map((v) => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-500">{v.fecha}</td>
                <td className="px-4 py-2.5 font-medium">{v.producto}</td>
                <td className="px-4 py-2.5 text-right">${v.precio_venta.toLocaleString("es-CL")}</td>
                <td className="px-4 py-2.5 text-right">{v.unidades}</td>
                <td className="px-4 py-2.5 text-right font-medium">${(v.precio_venta * v.unidades).toLocaleString("es-CL")}</td>
                <td className="px-4 py-2.5 text-right text-green-700">${((v.precio_venta - v.costo_unitario) * v.unidades).toLocaleString("es-CL")}</td>
                <td className="px-4 py-2.5 text-gray-500">{v.canal}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => deleteVenta(v.id)} className="text-xs text-gray-300 hover:text-red-500">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
