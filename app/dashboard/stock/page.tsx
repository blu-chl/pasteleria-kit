"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { StockItem } from "@/lib/types";

const DEFAULTS: Omit<StockItem, "id" | "user_id">[] = [
  { nombre: "Harina", unidad: "kg", stock_actual: 5, stock_minimo: 2, precio_unitario: 1200 },
  { nombre: "Azúcar blanca", unidad: "kg", stock_actual: 3, stock_minimo: 1, precio_unitario: 900 },
  { nombre: "Mantequilla", unidad: "kg", stock_actual: 2, stock_minimo: 0.5, precio_unitario: 4500 },
  { nombre: "Huevos", unidad: "docena", stock_actual: 3, stock_minimo: 1, precio_unitario: 2400 },
  { nombre: "Leche entera", unidad: "litro", stock_actual: 4, stock_minimo: 1, precio_unitario: 900 },
  { nombre: "Crema de leche", unidad: "litro", stock_actual: 2, stock_minimo: 0.5, precio_unitario: 3200 },
  { nombre: "Chocolate cobertura", unidad: "kg", stock_actual: 1, stock_minimo: 0.5, precio_unitario: 6500 },
  { nombre: "Cacao en polvo", unidad: "kg", stock_actual: 0.5, stock_minimo: 0.2, precio_unitario: 4800 },
  { nombre: "Polvo de hornear", unidad: "100g", stock_actual: 3, stock_minimo: 1, precio_unitario: 600 },
  { nombre: "Vainilla", unidad: "50ml", stock_actual: 2, stock_minimo: 1, precio_unitario: 800 },
];

type EditRow = Partial<Omit<StockItem, "id" | "user_id">>;

function semaforo(actual: number, minimo: number) {
  if (actual <= 0) return { label: "🔴 SIN STOCK", color: "text-red-600 bg-red-50" };
  if (actual <= minimo) return { label: "🟡 REPONER YA", color: "text-yellow-700 bg-yellow-50" };
  return { label: "🟢 OK", color: "text-green-700 bg-green-50" };
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditRow>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<EditRow>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("stock").select("*").eq("user_id", user.id).order("nombre");
    if (data && data.length === 0) {
      // Seed con defaults
      const rows = DEFAULTS.map((d) => ({ ...d, user_id: user.id }));
      await supabase.from("stock").insert(rows);
      const { data: fresh } = await supabase.from("stock").select("*").eq("user_id", user.id).order("nombre");
      setItems(fresh || []);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("stock").update(editData).eq("id", id);
    setEditId(null);
    await load();
    setSaving(false);
  }

  async function saveNew() {
    if (!newRow.nombre) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("stock").insert({ ...newRow, user_id: user.id });
    setAdding(false);
    setNewRow({});
    await load();
    setSaving(false);
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("stock").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const valorTotal = items.reduce((s, i) => s + i.stock_actual * i.precio_unitario, 0);

  if (loading) return <div className="p-8 text-gray-400">Cargando inventario...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Control de Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Actualiza el stock cada vez que recibes una compra o usas ingredientes</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Agregar ingrediente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Ingrediente</th>
              <th className="text-left px-4 py-3">Unidad</th>
              <th className="text-right px-4 py-3">Stock actual</th>
              <th className="text-right px-4 py-3">Stock mínimo</th>
              <th className="text-right px-4 py-3">Precio unit.</th>
              <th className="text-right px-4 py-3">Valor stock</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const sem = semaforo(item.stock_actual, item.stock_minimo);
              const isEditing = editId === item.id;
              return (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input className="border rounded px-2 py-1 text-sm w-full" value={editData.nombre ?? item.nombre} onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} />
                    ) : item.nombre}
                  </td>
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input className="border rounded px-2 py-1 text-sm w-20" value={editData.unidad ?? item.unidad} onChange={(e) => setEditData({ ...editData, unidad: e.target.value })} />
                    ) : item.unidad}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input type="number" className="border rounded px-2 py-1 text-sm w-20 text-right" value={editData.stock_actual ?? item.stock_actual} onChange={(e) => setEditData({ ...editData, stock_actual: parseFloat(e.target.value) })} />
                    ) : item.stock_actual}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input type="number" className="border rounded px-2 py-1 text-sm w-20 text-right" value={editData.stock_minimo ?? item.stock_minimo} onChange={(e) => setEditData({ ...editData, stock_minimo: parseFloat(e.target.value) })} />
                    ) : item.stock_minimo}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input type="number" className="border rounded px-2 py-1 text-sm w-24 text-right" value={editData.precio_unitario ?? item.precio_unitario} onChange={(e) => setEditData({ ...editData, precio_unitario: parseFloat(e.target.value) })} />
                    ) : `$${item.precio_unitario.toLocaleString("es-CL")}`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    ${(item.stock_actual * item.precio_unitario).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sem.color}`}>{sem.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => saveEdit(item.id)} disabled={saving} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">Guardar</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditId(item.id); setEditData({}); }} className="text-xs text-gray-400 hover:text-amber-600">Editar</button>
                        <button onClick={() => deleteItem(item.id)} className="text-xs text-gray-300 hover:text-red-500">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Fila nueva */}
            {adding && (
              <tr className="border-b border-amber-100 bg-amber-50/30">
                <td className="px-4 py-2"><input autoFocus placeholder="Nombre" className="border rounded px-2 py-1 text-sm w-full" value={newRow.nombre ?? ""} onChange={(e) => setNewRow({ ...newRow, nombre: e.target.value })} /></td>
                <td className="px-4 py-2"><input placeholder="Unidad" className="border rounded px-2 py-1 text-sm w-20" value={newRow.unidad ?? ""} onChange={(e) => setNewRow({ ...newRow, unidad: e.target.value })} /></td>
                <td className="px-4 py-2"><input type="number" placeholder="0" className="border rounded px-2 py-1 text-sm w-20 text-right" value={newRow.stock_actual ?? ""} onChange={(e) => setNewRow({ ...newRow, stock_actual: parseFloat(e.target.value) })} /></td>
                <td className="px-4 py-2"><input type="number" placeholder="0" className="border rounded px-2 py-1 text-sm w-20 text-right" value={newRow.stock_minimo ?? ""} onChange={(e) => setNewRow({ ...newRow, stock_minimo: parseFloat(e.target.value) })} /></td>
                <td className="px-4 py-2"><input type="number" placeholder="0" className="border rounded px-2 py-1 text-sm w-24 text-right" value={newRow.precio_unitario ?? ""} onChange={(e) => setNewRow({ ...newRow, precio_unitario: parseFloat(e.target.value) })} /></td>
                <td colSpan={2} />
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveNew} disabled={saving} className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">Guardar</button>
                    <button onClick={() => { setAdding(false); setNewRow({}); }} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-600">💰 Valor total del inventario</td>
              <td className="px-4 py-3 text-right text-sm text-gray-900">${valorTotal.toLocaleString("es-CL")}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
