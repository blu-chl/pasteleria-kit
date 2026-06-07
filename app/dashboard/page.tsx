import Link from "next/link";

const modulos = [
  { href: "/dashboard/recetas", icon: "🧁", titulo: "Recetas & Costos", desc: "Costea recetas y calcula precio sugerido" },
  { href: "/dashboard/stock", icon: "📦", titulo: "Control de Stock", desc: "Inventario con semáforo de reposición" },
  { href: "/dashboard/ventas", icon: "💰", titulo: "Ventas Diarias", desc: "Registra ventas, canal y forma de pago" },
  { href: "/dashboard/pedidos", icon: "📋", titulo: "Pedidos", desc: "Encargos con saldo pendiente automático" },
  { href: "/dashboard/gastos", icon: "💸", titulo: "Gastos", desc: "Fijos y variables mes a mes" },
  { href: "/dashboard/resumen", icon: "📊", titulo: "Resumen Financiero", desc: "Utilidad, margen y punto de equilibrio" },
];

export default function DashboardHome() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Tu Kit Financiero</h1>
      <p className="text-sm text-gray-500 mb-8">Elige el módulo que quieres usar</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-amber-200 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{m.icon}</div>
            <h2 className="font-semibold text-gray-900 mb-1">{m.titulo}</h2>
            <p className="text-sm text-gray-400">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
