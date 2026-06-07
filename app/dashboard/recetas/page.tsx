"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Ingrediente = { id: string; ingrediente_nombre: string; cantidad: string; costo: number };
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
      { id: "", ingrediente_nombre: "Harina", cantidad: "300 g", costo: 360 },
      { id: "", ingrediente_nombre: "Azúcar blanca", cantidad: "200 g", costo: 180 },
      { id: "", ingrediente_nombre: "Mantequilla", cantidad: "100 g", costo: 450 },
      { id: "", ingrediente_nombre: "Huevos", cantidad: "4 und", costo: 800 },
      { id: "", ingrediente_nombre: "Cacao en polvo", cantidad: "50 g", costo: 240 },
      { id: "", ingrediente_nombre: "Polvo de hornear", cantidad: "10 g", costo: 60 },
      { id: "", ingrediente_nombre: "Leche entera", cantidad: "200 ml", costo: 180 },
      { id: "", ingrediente_nombre: "Vainilla", cantidad: "5 ml", costo: 80 },
      { id: "", ingrediente_nombre: "Chocolate cobertura", cantidad: "200 g", costo: 1300 },
      { id: "", ingrediente_nombre: "Crema de leche", cantidad: "100 ml", costo: 320 },
      { id: "", ingrediente_nombre: "Gas / energía", cantidad: "estimado", costo: 500 },
    ],
  },
  {
    nombre: "Cheesecake (molde 22cm — rinde 10 porciones)",
    porciones: 10, margen: 55, costo_envase: 800,
    ingredientes: [
      { id: "", ingrediente_nombre: "Queso crema", cantidad: "500 g", costo: 3600 },
      { id: "", ingrediente_nombre: "Azúcar blanca", cantidad: "180 g", costo: 162 },
      { id: "", ingrediente_nombre: "Huevos", cantidad: "3 und", costo: 600 },
      { id: "", ingrediente_nombre: "Crema de leche", cantidad: "200 ml", costo: 640 },
      { id: "", ingrediente_nombre: "Vainilla", cantidad: "5 ml", costo: 80 },
      { id: "", ingrediente_nombre: "Mantequilla", cantidad: "80 g", costo: 360 },
      { id: "", ingrediente_nombre: "Galletas para base", cantidad: "200 g", costo: 1200 },
      { id: "", ingrediente_nombre: "Maicena", cantidad: "10 g", costo: 14 },
      { id: "", ingrediente_nombre: "Fresas decorac.", cantidad: "200 g", costo: 500 },
      { id: "", ingrediente_nombre: "Gas / energía", cantidad: "estimado", costo: 500 },
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
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rs, error: err } = await supabase
      .from("recetas")
      .select("*, receta_ingredientes(*)")
      .eq("user_id", user.id)
      .order("created_at");

    if (err) { setError(err.message); setLoading(false); return; }

    let mapped = (rs || []).map((r: any) => ({
      ...r,
      ingredientes: (r.receta_ingredientes || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    }));

    // Seed si no hay recetas
    if (mapped.length === 0) {
      for (const r of RECETAS_DEFAULT) {
        const { data: receta } = await supabase
          .from("recetas")
          .insert({ nombre: r.nombre, porciones: r.porciones, margen: r.margen, costo_envase: r.costo_envase, user_id: user.id })
          .select()
          .single();
        if (receta) {
          const ings = r.ingredientes.map((i) => ({ ingrediente_nombre: i.ingrediente_nombre, cantidad: i.cantidad, costo: i.costo, receta_id: receta.id }));
          await supabase.from("receta_ingredientes").insert(ings);
        }
      }
      const { data: fresh } = await supabase
        .from("recetas")
        .select("*, receta_ingredientes(*)")
        .eq("user_id", user.id)
        .order("created_at");
      mapped = (fresh || []).map((r: any) => ({
        ...r,
        ingredientes: (r.receta_ingredientes || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
      }));
    }

    // Si hay recetas pero sin ingredientes, re-seed los ingredientes
    for (const r of mapped) {
      if (r.ingredientes.length === 0) {
        const defaultReceta = RECETAS_DEFAULT.find((d) => d.nombre === r.nombre);
        if (defaultReceta) {
          const ings = defaultReceta.ingredientes.map((i) => ({ ingrediente_nombre: i.ingrediente_nombre, cantidad: i.cantidad, costo: i.costo, receta_id: r.id }));
          await supabase.from("receta_ingredientes").insert(ings);
        }
      }
    }

    // Reload final
    const { data: final } = await supabase
      .from("recetas")
      .select("*, receta_ingredientes(*)")
      .eq("user_id", user.id)
      .order("created_at");
    mapped = (final || []).map((r: any) => ({
      ...r,
      ingredientes: (r.receta_ingredientes || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    }));

    setRecetas(mapped);
    setSelected((prev) => {
      if (!prev) return mapped[0] || null;
      return mapped.find((r: Receta) => r.id === prev.id) || mapped[0] || null;
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Actualizar campo de receta al perder foco
  async function saveRecetaField(field: string, value: string | number) {
    if (!selected) return;
    const supabase = createClient();
    await supabase.from("recetas").update({ [field]: value }).eq("id", selected.id);
  }

  // Actualizar ingrediente al perder foco
  async function saveIngrediente(ingId: string, field: string, value: string | number) {
    const supabase = createClient();
    await supabase.from("receta_ingredientes").update({ [field]: value }).eq("id", ingId);
  }

  // Edición local inmediata, guarda en BD al blur
  function updateIngLocal(idx: number, field: keyof Ingrediente, value: string | number) {
    if (!selected) return;
    const updated = selected.ingredientes.map((ing, i) =>
      i === idx ? { ...ing, [field]: value } : ing
    );
    const updatedReceta = { ...selected, ingredientes: updated };
    setSelected(updatedReceta);
    setRecetas((prev) => prev.map((r) => r.id === selected.id ? updatedReceta : r));
  }

  async function addIngrediente() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("receta_ingredientes")
      .insert({ receta_id: selected.id, ingrediente_nombre: "Nuevo ingrediente", cantidad: "", costo: 0 })
      .select()
      .single();
    if (error) { setError(error.message); setSaving(false); return; }
    if (data) {
      const updated = { ...selected, ingredientes: [...selected.ingredientes, data] };
      setSelected(updated);
      setRecetas((prev) => prev.map((r) => r.id === selected.id ? updated : r));
    }
    setSaving(false);
  }

  async function removeIngrediente(ingId: string) {
    if (!selected) return;
    const supabase = createClient();
    await supabase.from("receta_ingredientes").delete().eq("id", ingId);
    const updated = { ...selected, ingredientes: selected.ingredientes.filter((i) => i.id !== ingId) };
    setSelected(updated);
    setRecetas((prev) => prev.map((r) => r.id === selected.id ? updated : r));
  }

  async function createReceta(e: React.FormEvent) {
    e.preventDefault();
    if (!newNombre.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("recetas")
      .insert({ nombre: newNombre, porciones: 10, margen: 55, costo_envase: 0, user_id: user.id })
      .select()
      .single();
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
    if (!confirm("¿Eliminar esta receta?")) return;
    const supabase = createClient();
    await supabase.from("recetas").delete().eq("id", id);
    const remaining = recetas.filter((r) => r.id !== id);
    setRecetas(remaining);
    setSelected(remaining[0] || null);
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-gray-400">
      <span className="animate-spin">⏳</span> Cargando recetas...
    </div>
  );

  if (error) return (
    <div className="p-8 text-red-500">
      Error: {error}
      <button onClick={load} className="ml-4 text-sm underline">Reintentar</button>
    </div>
  );

  const costoIngredientes = selected ? selected.ingredientes.reduce((s, i) => s + (Number(i.costo) || 0), 0) : 0;
  const costoTotal = selected ? costoIngredientes + (Number(selected.costo_envase) || 0) : 0;
  const precioSugerido = selected && selected.margen < 100 ? costoTotal / (1 - selected.margen / 100) : 0;
  const gananciaPorUnidad = selected && selected.porciones > 0 ? (precioSugerido - costoTotal) / selected.porciones : 0;

  return (
    <div className="p-6 flex gap-6 min-h-full">
      {/* Lista recetas */}
      <div className="w-56 shrink-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tus recetas</h2>
        <div className="space-y-1">
          {recetas.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selected?.id === r.id ? "bg-amber-50 text-amber-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🧁 {r.nombre.split("(")[0].trim()}
            </button>
          ))}
        </div>

        {showNew ? (
          <form onSubmit={createReceta} className="mt-3">
            <input
              autoFocus
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Nombre de la receta"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex gap-1">
              <button type="submit" disabled={saving} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-60">Crear</button>
              <button type="button" onClick={() => setShowNew(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancelar</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 w-full text-xs text-amber-600 hover:text-amber-700 font-medium py-1.5 border border-dashed border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
          >
            + Nueva receta
          </button>
        )}
      </div>

      {/* Detalle receta */}
      {selected ? (
        <div className="flex-1 max-w-3xl">
          {/* Header receta */}
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex-1">
              <input
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-amber-400 focus:outline-none w-full pb-0.5 transition-colors"
                value={selected.nombre}
                onChange={(e) => setSelected({ ...selected, nombre: e.target.value })}
                onBlur={(e) => saveRecetaField("nombre", e.target.value)}
              />
              <div className="flex flex-wrap gap-5 mt-3 text-sm text-gray-600">
                <label className="flex items-center gap-1.5">
                  <span>Porciones:</span>
                  <input
                    type="number" min={1}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={selected.porciones}
                    onChange={(e) => setSelected({ ...selected, porciones: parseInt(e.target.value) || 1 })}
                    onBlur={(e) => saveRecetaField("porciones", parseInt(e.target.value) || 1)}
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Margen:</span>
                  <input
                    type="number" min={0} max={99}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={selected.margen}
                    onChange={(e) => setSelected({ ...selected, margen: parseFloat(e.target.value) || 0 })}
                    onBlur={(e) => saveRecetaField("margen", parseFloat(e.target.value) || 0)}
                  />
                  <span>%</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span>Envase: $</span>
                  <input
                    type="number" min={0}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    value={selected.costo_envase}
                    onChange={(e) => setSelected({ ...selected, costo_envase: parseFloat(e.target.value) || 0 })}
                    onBlur={(e) => saveRecetaField("costo_envase", parseFloat(e.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
            <button
              onClick={() => deleteReceta(selected.id)}
              className="text-xs text-gray-300 hover:text-red-500 transition-colors whitespace-nowrap mt-1"
            >
              Eliminar receta
            </button>
          </div>

          {/* Tabla ingredientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-3">Ingrediente</th>
                  <th className="text-left px-4 py-3">Cantidad</th>
                  <th className="text-right px-4 py-3">Costo ($)</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {selected.ingredientes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                      Sin ingredientes aún. Agrega el primero abajo.
                    </td>
                  </tr>
                )}
                {selected.ingredientes.map((ing, idx) => (
                  <tr key={ing.id} className="border-b border-gray-50 hover:bg-amber-50/20 group">
                    <td className="px-3 py-1.5">
                      <input
                        className="w-full bg-transparent rounded px-1 py-0.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 border border-transparent focus:border-amber-300 transition-all"
                        value={ing.ingrediente_nombre}
                        onChange={(e) => updateIngLocal(idx, "ingrediente_nombre", e.target.value)}
                        onBlur={(e) => saveIngrediente(ing.id, "ingrediente_nombre", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="w-full bg-transparent rounded px-1 py-0.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 border border-transparent focus:border-amber-300 transition-all"
                        value={ing.cantidad}
                        onChange={(e) => updateIngLocal(idx, "cantidad", e.target.value)}
                        onBlur={(e) => saveIngrediente(ing.id, "cantidad", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number" min={0}
                        className="w-full text-right bg-transparent rounded px-1 py-0.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 border border-transparent focus:border-amber-300 transition-all"
                        value={ing.costo || ""}
                        placeholder="0"
                        onChange={(e) => updateIngLocal(idx, "costo", parseFloat(e.target.value) || 0)}
                        onBlur={(e) => saveIngrediente(ing.id, "costo", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => removeIngrediente(ing.id)}
                        className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-gray-100">
              <button
                onClick={addIngrediente}
                disabled={saving}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? "Agregando..." : "+ Agregar ingrediente"}
              </button>
            </div>
          </div>

          {/* Resumen costos */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-amber-800">
                <span>Costo ingredientes</span>
                <span>${costoIngredientes.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-800">
                <span>+ Envase / empaque</span>
                <span>${(Number(selected.costo_envase) || 0).toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-amber-900 pt-1 border-t border-amber-200">
                <span>Costo total receta</span>
                <span>${costoTotal.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-amber-200">
                <span className="font-bold text-amber-900">Precio sugerido (margen {selected.margen}%)</span>
                <span className="text-2xl font-bold text-amber-900">${Math.round(precioSugerido).toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700">
                <span>Ganancia por porción (÷ {selected.porciones})</span>
                <span className="font-medium">${Math.round(gananciaPorUnidad).toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Selecciona una receta o crea una nueva
        </div>
      )}
    </div>
  );
}
