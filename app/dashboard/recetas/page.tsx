"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Ingrediente = { id?: string; nombre: string; cantidad: string; costo: number };
type Receta = {
  id: string;
  nombre: string;
  porciones: number;
  margen: number;
  costo_envase: number;
  ingredientes: Ingrediente[];
};

const RECETAS_DEFAULT: Omit<Receta, "id">[] = [
  {
    nombre: "Torta de Chocolate (molde 20cm — rinde 12 porciones)",
    porciones: 12, margen: 55, costo_envase: 600,
    ingredientes: [
      { nombre: "Harina", cantidad: "300 g", costo: 360 },
      { nombre: "Azúcar blanca", cantidad: "200 g", costo: 180 },
      { nombre: "Mantequilla", cantidad: "100 g", costo: 450 },
      { nombre: "Huevos", cantidad: "4 und", costo: 800 },
      { nombre: "Cacao en polvo", cantidad: "50 g", costo: 240 },
      { nombre: "Polvo de hornear", cantidad: "10 g", costo: 60 },
      { nombre: "Leche entera", cantidad: "200 ml", costo: 180 },
      { nombre: "Vainilla", cantidad: "5 ml", costo: 80 },
      { nombre: "Chocolate cobertura", cantidad: "200 g", costo: 1300 },
      { nombre: "Crema de leche", cantidad: "100 ml", costo: 320 },
      { nombre: "Gas / energía", cantidad: "estimado", costo: 500 },
      { nombre: "Caja torta 20cm", cantidad: "1 und", costo: 800 },
    ],
  },
  {
    nombre: "Cheesecake (molde 22cm — rinde 10 porciones)",
    porciones: 10, margen: 55, costo_envase: 800,
    ingredientes: [
      { nombre: "Queso crema", cantidad: "500 g", costo: 3600 },
      { nombre: "Azúcar blanca", cantidad: "180 g", costo: 162 },
      { nombre: "Huevos", cantidad: "3 und", costo: 600 },
      { nombre: "Crema de leche", cantidad: "200 ml", costo: 640 },
      { nombre: "Vainilla", cantidad: "5 ml", costo: 80 },
      { nombre: "Mantequilla", cantidad: "80 g", costo: 360 },
      { nombre: "Galletas para base", cantidad: "200 g", costo: 1200 },
      { nombre: "Maicena", cantidad: "10 g", costo: 14 },
      { nombre: "Fresas decorac.", cantidad: "200 g", costo: 500 },
      { nombre: "Gas / energía", cantidad: "estimado", costo: 500 },
    ],
  },
];

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Receta | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newNombre, setNewNombre] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let { data: rs } = await supabase.from("recetas").select("*, receta_ingredientes(*)").eq("user_id", user.id);
    if (!rs || rs.length === 0) {
      for (const r of RECETAS_DEFAULT) {
        const { data: receta } = await supabase.from("recetas").insert({ nombre: r.nombre, porciones: r.porciones, margen: r.margen, costo_envase: r.costo_envase, user_id: user.id }).select().single();
        if (receta) await supabase.from("receta_ingredientes").insert(r.ingredientes.map((i) => ({ ...i, receta_id: receta.id })));
      }
      const { data: fresh } = await supabase.from("recetas").select("*, receta_ingredientes(*)").eq("user_id", user.id);
      rs = fresh;
    }
    const mapped = (rs || []).map((r: any) => ({ ...r, ingredientes: r.receta_ingredientes || [] }));
    setRecetas(mapped);
    if (!selected && mapped.length > 0) setSelected(mapped[0]);
    else if (selected) {
      const updated = mapped.find((r: Receta) => r.id === selected.id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }

  async function updateIngrediente(receta: Receta, idx: number, field: keyof Ingrediente, value: string | number) {
    const ing = receta.ingredientes[idx];
    const updated = { ...ing, [field]: value };
    const supabase = createClient();
    if (ing.id) {
      await supabase.from("receta_ingredientes").update({ [field]: value }).eq("id", ing.id);
    }
    setSelected({ ...receta, ingredientes: receta.ingredientes.map((i, j) => j === idx ? updated : i) });
  }

  async function addIngrediente(receta: Receta) {
    const supabase = createClient();
    const { data } = await supabase.from("receta_ingredientes").insert({ receta_id: receta.id, nombre: "Nuevo ingrediente", cantidad: "", costo: 0 }).select().single();
    if (data) {
      const updated = { ...receta, ingredientes: [...receta.ingredientes, data] };
      setSelected(updated);
      setRecetas((prev) => prev.map((r) => r.id === receta.id ? updated : r));
    }
  }

  async function removeIngrediente(receta: Receta, id: string) {
    const supabase = createClient();
    await supabase.from("receta_ingredientes").delete().eq("id", id);
    const updated = { ...receta, ingredientes: receta.ingredientes.filter((i) => i.id !== id) };
    setSelected(updated);
    setRecetas((prev) => prev.map((r) => r.id === receta.id ? updated : r));
  }

  async function updateReceta(field: string, value: string | number) {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("recetas").update({ [field]: value }).eq("id", selected.id);
    const updated = { ...selected, [field]: value };
    setSelected(updated);
    setRecetas((prev) => prev.map((r) => r.id === selected.id ? updated : r));
    setSaving(false);
  }

  async function createReceta(e: React.FormEvent) {
    e.preventDefault();
    if (!newNombre.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("recetas").insert({ nombre: newNombre, porciones: 10, margen: 55, costo_envase: 0, user_id: user.id }).select().single();
    if (data) {
      const r: Receta = { ...data, ingredientes: [] };
      setRecetas((prev) => [...prev, r]);
      setSelected(r);
    }
    setNewNombre("");
    setShowNew(false);
    setSaving(false);
  }

  async function deleteReceta(id: string) {
    const supabase = createClient();
    await supabase.from("recetas").delete().eq("id", id);
    const remaining = recetas.filter((r) => r.id !== id);
    setRecetas(remaining);
    setSelected(remaining[0] || null);
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando recetas...</div>;

  const costoIngredientes = selected ? selected.ingredientes.reduce((s, i) => s + (i.costo || 0), 0) : 0;
  const costoTotal = selected ? costoIngredientes + selected.costo_envase : 0;
  const precioSugerido = selected ? costoTotal / (1 - selected.margen / 100) : 0;
  const gananciaPorUnidad = selected ? (precioSugerido - costoTotal) / selected.porciones : 0;

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* Lista recetas */}
      <div className="w-56 shrink-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tus recetas</h2>
        <div className="space-y-1">
          {recetas.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selected?.id === r.id ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50"}`}
            >
              🧁 {r.nombre.split("(")[0].trim()}
            </button>
          ))}
        </div>
        {showNew ? (
          <form onSubmit={createReceta} className="mt-2">
            <input autoFocus value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre receta" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mb-1" />
            <div className="flex gap-1">
              <button type="submit" className="text-xs bg-amber-500 text-white px-2 py-1 rounded-lg">Crear</button>
              <button type="button" onClick={() => setShowNew(false)} className="text-xs text-gray-400">Cancelar</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowNew(true)} className="mt-2 w-full text-xs text-amber-600 hover:text-amber-700 font-medium py-1">+ Nueva receta</button>
        )}
      </div>

      {/* Detalle receta */}
      {selected && (
        <div className="flex-1 max-w-3xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <input
                className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-amber-400 focus:outline-none w-full"
                value={selected.nombre}
                onBlur={(e) => updateReceta("nombre", e.target.value)}
                onChange={(e) => setSelected({ ...selected, nombre: e.target.value })}
              />
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <label>Porciones: <input type="number" min={1} className="w-14 border-b border-gray-200 focus:border-amber-400 focus:outline-none text-center text-gray-900 font-medium" value={selected.porciones} onBlur={(e) => updateReceta("porciones", parseInt(e.target.value))} onChange={(e) => setSelected({ ...selected, porciones: parseInt(e.target.value) })} /></label>
                <label>Margen: <input type="number" min={0} max={100} className="w-14 border-b border-gray-200 focus:border-amber-400 focus:outline-none text-center text-gray-900 font-medium" value={selected.margen} onBlur={(e) => updateReceta("margen", parseFloat(e.target.value))} onChange={(e) => setSelected({ ...selected, margen: parseFloat(e.target.value) })} />%</label>
                <label>Envase: $<input type="number" min={0} className="w-20 border-b border-gray-200 focus:border-amber-400 focus:outline-none text-center text-gray-900 font-medium" value={selected.costo_envase} onBlur={(e) => updateReceta("costo_envase", parseFloat(e.target.value))} onChange={(e) => setSelected({ ...selected, costo_envase: parseFloat(e.target.value) })} /></label>
              </div>
            </div>
            <button onClick={() => deleteReceta(selected.id)} className="text-xs text-gray-300 hover:text-red-500 ml-4">Eliminar receta</button>
          </div>

          {/* Tabla ingredientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-2">Ingrediente</th>
                  <th className="text-left px-4 py-2">Cantidad</th>
                  <th className="text-right px-4 py-2">Costo ($)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {selected.ingredientes.map((ing, idx) => (
                  <tr key={ing.id || idx} className="border-b border-gray-50">
                    <td className="px-4 py-1.5">
                      <input className="w-full bg-transparent focus:bg-amber-50 focus:outline-none rounded px-1" value={ing.nombre} onChange={(e) => updateIngrediente(selected, idx, "nombre", e.target.value)} onBlur={() => {}} />
                    </td>
                    <td className="px-4 py-1.5">
                      <input className="w-full bg-transparent focus:bg-amber-50 focus:outline-none rounded px-1" value={ing.cantidad} onChange={(e) => updateIngrediente(selected, idx, "cantidad", e.target.value)} />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <input type="number" min={0} className="w-24 bg-transparent focus:bg-amber-50 focus:outline-none rounded px-1 text-right" value={ing.costo || ""} onChange={(e) => updateIngrediente(selected, idx, "costo", parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      {ing.id && <button onClick={() => removeIngrediente(selected, ing.id!)} className="text-xs text-gray-300 hover:text-red-500">✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100">
              <button onClick={() => addIngrediente(selected)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">+ Agregar ingrediente</button>
            </div>
          </div>

          {/* Resumen costos */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 grid grid-cols-2 gap-4">
            {[
              { label: "Costo ingredientes", value: `$${costoIngredientes.toLocaleString("es-CL")}` },
              { label: `+ Envase / empaque`, value: `$${selected.costo_envase.toLocaleString("es-CL")}` },
              { label: "Costo total receta", value: `$${costoTotal.toLocaleString("es-CL")}`, bold: true },
              { label: `Precio sugerido (margen ${selected.margen}%)`, value: `$${Math.round(precioSugerido).toLocaleString("es-CL")}`, bold: true, accent: true },
              { label: `Ganancia por porción (÷ ${selected.porciones})`, value: `$${Math.round(gananciaPorUnidad).toLocaleString("es-CL")}` },
            ].map((row) => (
              <div key={row.label} className={`flex justify-between items-center ${row.accent ? "col-span-2 border-t border-amber-200 pt-3 mt-1" : ""}`}>
                <span className={`text-sm ${row.bold ? "font-semibold text-amber-900" : "text-amber-800"}`}>{row.label}</span>
                <span className={`text-sm ${row.bold ? "font-bold text-amber-900 text-lg" : "text-amber-800"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
