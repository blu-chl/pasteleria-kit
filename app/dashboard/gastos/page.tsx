"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Gasto } from "@/lib/types";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
const MESES_LABEL = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const FIJOS_DEFAULT = [
  "Arriendo del local / taller",
  "Electricidad (horno, refrigerador, batidora)",
  "Gas (balones o cañería)",
  "Agua / alcantarillado",
  "Internet y teléfono",
  "Sueldo ayudante(s)",
  "Sueldo o retiro del dueño/a",
  "Seguros del negocio",
  "Cuotas de préstamo / leasing maquinaria",
  "Plataformas delivery (cuota mensual fija)",
];

const VARIABLES_DEFAULT = [
  "Ingredientes / materias primas",
  "Envases, cajas y embalajes",
  "Etiquetas, stickers y cintas decorativas",
  "Gas adicional en meses de alta producción",
  "Combustible / transporte delivery propio",
  "Comisión plataformas (Rappi, PedidosYa, etc.)",
  "Publicidad en redes sociales (pauta)",
  "Fotografía de productos",
  "Utensilios y moldes nuevos / repuestos",
  "Artículos de limpieza e higiene",
];

function totalAnual(g: Gasto) {
  return MESES.reduce((s, m) => s + (g[m] || 0), 0);
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let { data } = await supabase.from("gastos").select("*").eq("user_id", user.id).order("tipo").order("concepto");
    if (!data || data.length === 0) {
      const rows = [
        ...FIJOS_DEFAULT.map((c) => ({ concepto: c, tipo: "fijo", user_id: user.id })),
        ...VARIABLES_DEFAULT.map((c) => ({ concepto: c, tipo: "variable", user_id: user.id })),
      ];
      await supabase.from("gastos").insert(rows);
      const { data: fresh } = await supabase.from("gastos").select("*").eq("user_id", user.id).order("tipo").order("concepto");
      data = fresh;
    }
    setGastos(data || []);
    setLoading(false);
  }

  async function updateCell(id: string, mes: string, valor: number) {
    setGastos((prev) => prev.map((g) => g.id === id ? { ...g, [mes]: valor } : g));
    setSaving(id);
    const supabase = createClient();
    await supabase.from("gastos").update({ [mes]: valor }).eq("id", id);
    setSaving(null);
  }

  const fijos = gastos.filter((g) => g.tipo === "fijo");
  const variables = gastos.filter((g) => g.tipo === "variable");

  function subtotalMes(lista: Gasto[], mes: typeof MESES[number]) {
    return lista.reduce((s, g) => s + (g[mes] || 0), 0);
  }

  function subtotalAnual(lista: Gasto[]) {
    return lista.reduce((s, g) => s + totalAnual(g), 0);
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando gastos...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">💸 Gastos del Negocio</h1>
      <p className="text-sm text-gray-500 mb-6">Haz clic en cualquier celda para editar. Los totales se calculan solos.</p>

      {[
        { titulo: "🔒 Gastos Fijos", sub: "Los pagas aunque no vendas nada", lista: fijos },
        { titulo: "📦 Gastos Variables", sub: "Dependen de cuánto produces y vendes", lista: variables },
      ].map(({ titulo, sub, lista }) => (
        <div key={titulo} className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{titulo}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2 w-48">Concepto</th>
                  {MESES_LABEL.map((m) => <th key={m} className="text-right px-2 py-2 w-20">{m}</th>)}
                  <th className="text-right px-4 py-2 w-24 font-bold">Total año</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className="border-t border-gray-50 hover:bg-gray-50/40">
                    <td className="px-4 py-1.5 text-gray-700 font-medium">{g.concepto}</td>
                    {MESES.map((m) => (
                      <td key={m} className="px-1 py-1">
                        <input
                          type="number"
                          min={0}
                          value={g[m] || ""}
                          placeholder="0"
                          onChange={(e) => updateCell(g.id, m, parseFloat(e.target.value) || 0)}
                          className="w-full text-right border-0 bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-300 rounded px-1 py-0.5 text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-1.5 text-right font-semibold text-gray-800">
                      {saving === g.id ? "..." : `$${totalAnual(g).toLocaleString("es-CL")}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-700 border-t border-gray-200">
                  <td className="px-4 py-2 text-sm">Subtotal</td>
                  {MESES.map((m) => (
                    <td key={m} className="px-2 py-2 text-right text-sm">${subtotalMes(lista, m).toLocaleString("es-CL")}</td>
                  ))}
                  <td className="px-4 py-2 text-right text-sm">${subtotalAnual(lista).toLocaleString("es-CL")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      {/* Total general */}
      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-amber-800">💥 Total gastos anuales</span>
          <span className="text-2xl font-bold text-amber-800">
            ${(subtotalAnual(fijos) + subtotalAnual(variables)).toLocaleString("es-CL")}
          </span>
        </div>
        <div className="mt-2 flex gap-6 text-sm text-amber-700">
          <span>Fijos: <strong>${subtotalAnual(fijos).toLocaleString("es-CL")}</strong></span>
          <span>Variables: <strong>${subtotalAnual(variables).toLocaleString("es-CL")}</strong></span>
          <span>Promedio mensual: <strong>${Math.round((subtotalAnual(fijos) + subtotalAnual(variables)) / 12).toLocaleString("es-CL")}</strong></span>
        </div>
      </div>
    </div>
  );
}
