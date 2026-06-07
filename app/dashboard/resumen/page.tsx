"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LABEL = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

type ResumenMes = {
  mes: string;
  ingresos: number;
  gastos: number;
  utilidad: number;
  margen: number;
};

export default function ResumenPage() {
  const [data, setData] = useState<ResumenMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakEven, setBreakEven] = useState({
    precio_promedio: 2000,
    costo_variable: 700,
    costos_fijos: 280000,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const year = new Date().getFullYear();

    // Ingresos por mes desde ventas
    const { data: ventas } = await supabase.from("ventas").select("fecha, precio_venta, unidades").eq("user_id", user.id).gte("fecha", `${year}-01-01`).lte("fecha", `${year}-12-31`);

    // Gastos totales por mes desde tabla gastos
    const { data: gastos } = await supabase.from("gastos").select("*").eq("user_id", user.id);

    const mesesData: ResumenMes[] = MESES_LABEL.map((label, idx) => {
      const mesNum = String(idx + 1).padStart(2, "0");
      const ingresos = (ventas || []).filter((v) => v.fecha?.startsWith(`${year}-${mesNum}`)).reduce((s, v) => s + v.precio_venta * v.unidades, 0);
      const mesKey = MESES[idx];
      const gastosTotal = (gastos || []).reduce((s: number, g: any) => s + (g[mesKey] || 0), 0);
      const utilidad = ingresos - gastosTotal;
      const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
      return { mes: label, ingresos, gastos: gastosTotal, utilidad, margen };
    });

    setData(mesesData);
    setLoading(false);
  }

  const totales = data.reduce((acc, m) => ({ ingresos: acc.ingresos + m.ingresos, gastos: acc.gastos + m.gastos, utilidad: acc.utilidad + m.utilidad }), { ingresos: 0, gastos: 0, utilidad: 0 });
  const margenTotal = totales.ingresos > 0 ? (totales.utilidad / totales.ingresos) * 100 : 0;

  const margenContribucion = breakEven.precio_promedio - breakEven.costo_variable;
  const unidadesMinimas = margenContribucion > 0 ? Math.ceil(breakEven.costos_fijos / margenContribucion) : 0;
  const ventasMinimas = unidadesMinimas * breakEven.precio_promedio;
  const unidadesDiarias = Math.ceil(unidadesMinimas / 25);

  function saludColor(margen: number) {
    if (margen < 0) return "text-red-600 bg-red-50";
    if (margen < 10) return "text-yellow-700 bg-yellow-50";
    if (margen < 30) return "text-green-700 bg-green-50";
    return "text-emerald-700 bg-emerald-50";
  }
  function saludLabel(margen: number) {
    if (margen < 0) return "🔴 Margen negativo — Urge revisar precios y costos";
    if (margen < 10) return "🟡 Muy ajustado — Busca reducir costos o subir precios";
    if (margen < 30) return "🟢 Negocio saludable — Sigue controlando tus costos";
    return "🏆 Excelente rentabilidad — Considera invertir en crecer";
  }

  if (loading) return <div className="p-8 text-gray-400">Calculando resumen...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">📊 Resumen Financiero</h1>
      <p className="text-sm text-gray-500 mb-6">Los datos se calculan automáticamente desde tus ventas y gastos</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ingresos totales", value: `$${totales.ingresos.toLocaleString("es-CL")}`, color: "text-green-700" },
          { label: "Gastos totales", value: `$${totales.gastos.toLocaleString("es-CL")}`, color: "text-red-600" },
          { label: "Utilidad neta", value: `$${totales.utilidad.toLocaleString("es-CL")}`, color: totales.utilidad >= 0 ? "text-green-700" : "text-red-600" },
          { label: "Margen promedio", value: `${margenTotal.toFixed(1)}%`, color: margenTotal >= 10 ? "text-green-700" : "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Semáforo salud */}
      <div className={`rounded-2xl p-4 mb-6 font-medium text-sm ${saludColor(margenTotal)}`}>
        {saludLabel(margenTotal)}
      </div>

      {/* Tabla por mes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left px-4 py-3">Mes</th>
              <th className="text-right px-4 py-3">Ingresos</th>
              <th className="text-right px-4 py-3">Gastos</th>
              <th className="text-right px-4 py-3">Utilidad</th>
              <th className="text-right px-4 py-3">Margen</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.mes} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-700">{m.mes}</td>
                <td className="px-4 py-2.5 text-right">{m.ingresos > 0 ? `$${m.ingresos.toLocaleString("es-CL")}` : "—"}</td>
                <td className="px-4 py-2.5 text-right">{m.gastos > 0 ? `$${m.gastos.toLocaleString("es-CL")}` : "—"}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${m.utilidad >= 0 ? "text-green-700" : "text-red-600"}`}>{m.ingresos > 0 || m.gastos > 0 ? `$${m.utilidad.toLocaleString("es-CL")}` : "—"}</td>
                <td className="px-4 py-2.5 text-right">{m.ingresos > 0 ? `${m.margen.toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t border-gray-200">
              <td className="px-4 py-3 text-sm">Total año</td>
              <td className="px-4 py-3 text-right text-sm">${totales.ingresos.toLocaleString("es-CL")}</td>
              <td className="px-4 py-3 text-right text-sm">${totales.gastos.toLocaleString("es-CL")}</td>
              <td className={`px-4 py-3 text-right text-sm ${totales.utilidad >= 0 ? "text-green-700" : "text-red-600"}`}>${totales.utilidad.toLocaleString("es-CL")}</td>
              <td className="px-4 py-3 text-right text-sm">{margenTotal.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Punto de equilibrio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🎯 Punto de Equilibrio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Supuestos (edita según tu negocio)</h3>
            <div className="space-y-3">
              {[
                { label: "Precio promedio por unidad", key: "precio_promedio" },
                { label: "Costo variable por unidad", key: "costo_variable" },
                { label: "Costos fijos mensuales", key: "costos_fijos" },
              ].map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-gray-600">{f.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={breakEven[f.key as keyof typeof breakEven]}
                    onChange={(e) => setBreakEven({ ...breakEven, [f.key]: parseFloat(e.target.value) || 0 })}
                    className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Resultados automáticos</h3>
            {[
              { label: "Margen de contribución unit.", value: `$${margenContribucion.toLocaleString("es-CL")}` },
              { label: "🎯 Unidades mínimas al mes", value: `${unidadesMinimas.toLocaleString("es-CL")} unidades`, bold: true },
              { label: "💰 Ventas mínimas en dinero", value: `$${ventasMinimas.toLocaleString("es-CL")}`, bold: true },
              { label: "📅 Unidades diarias mínimas", value: `${unidadesDiarias} por día` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className={`text-sm text-amber-800 ${r.bold ? "font-semibold" : ""}`}>{r.label}</span>
                <span className={`text-sm text-amber-900 ${r.bold ? "font-bold text-base" : ""}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
