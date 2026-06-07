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

type Receta = {
  id: string;
  nombre: string;
  porciones: number;
  ingredientes: { id: string; ingrediente_nombre: string; cantidad: string; costo: number }[];
};

// Línea de descuento: ingrediente de receta + cuánto descontar del stock
type LineaDescuento = {
  ingrediente_nombre: string;
  cantidad_receta: string; // texto original de la receta
  descuento: number;       // número editable que se restará del stock
  stock_id: string | null; // id del item de stock que matchea
  stock_nombre: string;
  stock_unidad: string;
  stock_actual: number;
};

function semaforo(actual: number, minimo: number) {
  if (actual <= 0) return { label: "🔴 SIN STOCK", color: "text-red-600 bg-red-50" };
  if (actual <= minimo) return { label: "🟡 REPONER YA", color: "text-yellow-700 bg-yellow-50" };
  return { label: "🟢 OK", color: "text-green-700 bg-green-50" };
}

// Intenta extraer un número de una string como "300 g", "4 und", "200 ml"
function parseCantidad(str: string): number {
  const match = str.match(/[\d,.]+/);
  if (!match) return 0;
  return parseFloat(match[0].replace(",", "."));
}

// Convierte g → kg, ml → litro si el stock usa esa unidad
function convertirUnidad(valor: number, cantidadStr: string, unidadStock: string): number {
  const lower = cantidadStr.toLowerCase();
  const stockL = unidadStock.toLowerCase();
  if ((lower.includes(" g") || lower.endsWith("g")) && !lower.includes("kg") && (stockL === "kg" || stockL === "kilo")) {
    return valor / 1000;
  }
  if (lower.includes("ml") && (stockL === "litro" || stockL === "lt" || stockL === "l")) {
    return valor / 1000;
  }
  return valor;
}

// Busca el stock item que mejor matchea el nombre del ingrediente
function matchStock(nombre: string, items: StockItem[]): StockItem | null {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const n = norm(nombre);
  return items.find((i) => norm(i.nombre) === n)
    || items.find((i) => norm(i.nombre).includes(n) || n.includes(norm(i.nombre)))
    || null;
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditRow>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<EditRow>({});
  const [saving, setSaving] = useState(false);

  // Usar receta
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [showUsarReceta, setShowUsarReceta] = useState(false);
  const [recetaSeleccionada, setRecetaSeleccionada] = useState<Receta | null>(null);
  const [lineas, setLineas] = useState<LineaDescuento[]>([]);
  const [descontando, setDescontando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => { load(); loadRecetas(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("stock").select("*").eq("user_id", user.id).order("nombre");
    if (data && data.length === 0) {
      const rows = DEFAULTS.map((d) => ({ ...d, user_id: user.id }));
      await supabase.from("stock").insert(rows);
      const { data: fresh } = await supabase.from("stock").select("*").eq("user_id", user.id).order("nombre");
      setItems(fresh || []);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  async function loadRecetas() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("recetas")
      .select("*, receta_ingredientes(*)")
      .eq("user_id", user.id)
      .order("nombre");
    if (data) {
      setRecetas(data.map((r: any) => ({ ...r, ingredientes: r.receta_ingredientes || [] })));
    }
  }

  // Al seleccionar una receta, arma las líneas de descuento
  function seleccionarReceta(receta: Receta) {
    setRecetaSeleccionada(receta);
    const nuevasLineas: LineaDescuento[] = receta.ingredientes
      .filter((ing) => !ing.ingrediente_nombre.toLowerCase().includes("gas") && !ing.ingrediente_nombre.toLowerCase().includes("energía"))
      .map((ing) => {
        const match = matchStock(ing.ingrediente_nombre, items);
        const valorRaw = parseCantidad(ing.cantidad);
        const valorConvertido = match ? convertirUnidad(valorRaw, ing.cantidad, match.unidad) : valorRaw;
        return {
          ingrediente_nombre: ing.ingrediente_nombre,
          cantidad_receta: ing.cantidad,
          descuento: valorConvertido,
          stock_id: match?.id || null,
          stock_nombre: match?.nombre || "⚠️ No encontrado en stock",
          stock_unidad: match?.unidad || "",
          stock_actual: match?.stock_actual || 0,
        };
      });
    setLineas(nuevasLineas);
  }

  async function aplicarDescuento() {
    setDescontando(true);
    const supabase = createClient();
    let errores = 0;

    for (const linea of lineas) {
      if (!linea.stock_id || linea.descuento <= 0) continue;
      const item = items.find((i) => i.id === linea.stock_id);
      if (!item) continue;
      const nuevoStock = Math.max(0, item.stock_actual - linea.descuento);
      const { error } = await supabase
        .from("stock")
        .update({ stock_actual: nuevoStock })
        .eq("id", linea.stock_id);
      if (error) errores++;
    }

    await load();
    setDescontando(false);
    setShowUsarReceta(false);
    setRecetaSeleccionada(null);
    setLineas([]);
    setMensaje(errores === 0 ? "✅ Stock actualizado correctamente" : `⚠️ Listo con ${errores} error(es)`);
    setTimeout(() => setMensaje(""), 4000);
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
          <p className="text-sm text-gray-500 mt-0.5">Actualiza el stock o descuenta automáticamente al hacer una receta</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowUsarReceta(true); setRecetaSeleccionada(null); setLineas([]); }}
            className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            🧁 Usé esta receta (descontar del inventario)
          </button>
          <button
            onClick={() => setAdding(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            + Agregar ingrediente
          </button>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {mensaje && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {mensaje}
        </div>
      )}

      {/* Panel: Usar receta */}
      {showUsarReceta && (
        <div className="mb-6 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">🧁 Usé esta receta (descontar del inventario) — descontar del stock</h2>
              <p className="text-xs text-gray-400 mt-0.5">Selecciona una receta, ajusta las cantidades si cambiaste algo, y aplica el descuento</p>
            </div>
            <button onClick={() => setShowUsarReceta(false)} className="text-gray-300 hover:text-gray-500 text-lg">✕</button>
          </div>

          <div className="p-5">
            {/* Selector de receta */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">¿Qué receta hiciste?</label>
              <div className="flex flex-wrap gap-2">
                {recetas.length === 0 && <p className="text-sm text-gray-400">No tienes recetas creadas aún.</p>}
                {recetas.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => seleccionarReceta(r)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      recetaSeleccionada?.id === r.id
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-700"
                    }`}
                  >
                    {r.nombre.split("(")[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de líneas editables */}
            {recetaSeleccionada && lineas.length > 0 && (
              <>
                <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="text-left px-4 py-2.5">Ingrediente (receta)</th>
                        <th className="text-left px-4 py-2.5">Cantidad original</th>
                        <th className="text-left px-4 py-2.5">Item en stock</th>
                        <th className="text-right px-4 py-2.5">Stock actual</th>
                        <th className="text-right px-4 py-2.5">Descontar</th>
                        <th className="text-right px-4 py-2.5">Quedará</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((linea, idx) => {
                        const quedara = Math.max(0, linea.stock_actual - linea.descuento);
                        const sinMatch = !linea.stock_id;
                        return (
                          <tr key={idx} className={`border-b border-gray-50 ${sinMatch ? "bg-orange-50/40" : ""}`}>
                            <td className="px-4 py-2 font-medium text-gray-700">{linea.ingrediente_nombre}</td>
                            <td className="px-4 py-2 text-gray-400 text-xs">{linea.cantidad_receta}</td>
                            <td className="px-4 py-2">
                              {sinMatch ? (
                                <span className="text-xs text-orange-500">⚠️ No encontrado en stock</span>
                              ) : (
                                <span className="text-gray-600">{linea.stock_nombre} <span className="text-gray-400">({linea.stock_unidad})</span></span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600">{linea.stock_actual} {linea.stock_unidad}</td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                disabled={sinMatch}
                                value={linea.descuento}
                                onChange={(e) => {
                                  const updated = [...lineas];
                                  updated[idx] = { ...linea, descuento: parseFloat(e.target.value) || 0 };
                                  setLineas(updated);
                                }}
                                className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50 disabled:text-gray-300"
                              />
                              <span className="text-xs text-gray-400 ml-1">{linea.stock_unidad}</span>
                            </td>
                            <td className={`px-4 py-2 text-right font-medium text-sm ${quedara <= 0 ? "text-red-500" : quedara <= (items.find(i => i.id === linea.stock_id)?.stock_minimo || 0) ? "text-yellow-600" : "text-green-700"}`}>
                              {sinMatch ? "—" : `${quedara.toFixed(2)} ${linea.stock_unidad}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    💡 Ajusta los valores en la columna <strong>Descontar</strong> si usaste cantidades distintas a la receta original
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRecetaSeleccionada(null); setLineas([]); }}
                      className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={aplicarDescuento}
                      disabled={descontando}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
                    >
                      {descontando ? "Aplicando..." : "✅ Aplicar descuento al stock"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabla de stock */}
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
