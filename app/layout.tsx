import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kit Financiero Pastelería 🎂",
  description: "Lleva las finanzas de tu pastelería: costos, ventas, pedidos, stock y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
