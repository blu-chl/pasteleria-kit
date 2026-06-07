import Link from "next/link";

const modulos = [
  { icon: "🧁", titulo: "Recetas & Costos", desc: "Costea cada receta ingrediente por ingrediente. Sabe si estás ganando o perdiendo por producto." },
  { icon: "📦", titulo: "Control de Stock", desc: "Inventario con alertas automáticas de reposición y valor del stock." },
  { icon: "💰", titulo: "Ventas Diarias", desc: "Registra tus ventas día a día. Totales e ingresos se calculan solos." },
  { icon: "📋", titulo: "Pedidos", desc: "Libro de pedidos personalizados: cliente, entrega, seña pagada y saldo pendiente." },
  { icon: "💸", titulo: "Gastos", desc: "Gastos fijos y variables con totales mensuales y anuales." },
  { icon: "📊", titulo: "Resumen Financiero", desc: "Utilidad mensual, punto de equilibrio y salud de tu negocio." },
];

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "#fdf8f3" }}>
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-6xl mb-4">🎂</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Kit Financiero para Pastelerías
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
          Todo lo que necesitas para llevar bien tu negocio: costos, ventas, pedidos, stock y más.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/auth/register"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/auth/login"
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3 rounded-xl border border-gray-200 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>

      {/* Módulos */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
          ¿Qué incluye?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {modulos.map((m) => (
            <div key={m.titulo} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
              <div className="text-3xl mb-2">{m.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{m.titulo}</h3>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
