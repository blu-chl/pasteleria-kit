"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const nav = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/dashboard/recetas", label: "Recetas & Costos", icon: "🧁" },
  { href: "/dashboard/stock", label: "Control de Stock", icon: "📦" },
  { href: "/dashboard/ventas", label: "Ventas Diarias", icon: "💰" },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: "📋" },
  { href: "/dashboard/gastos", label: "Gastos", icon: "💸" },
  { href: "/dashboard/resumen", label: "Resumen Financiero", icon: "📊" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#fdf8f3" }}>
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="text-2xl">🎂</div>
          <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">Kit Pastelería</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-50 text-amber-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
