# 🎂 Kit Financiero Pastelería

Web app para llevar las finanzas de una pastelería: costos, ventas, pedidos, stock y resumen financiero. Cada usuario crea su cuenta y sus datos quedan guardados en la nube.

## Stack

- **Next.js 15** (App Router)
- **Supabase** (Auth + PostgreSQL)
- **Tailwind CSS**
- **Vercel** (hosting recomendado)

## Setup local

### 1. Clonar el repo
```bash
git clone https://github.com/TU_USUARIO/pasteleria-kit
cd pasteleria-kit
npm install
```

### 2. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com) → New project
2. En el SQL Editor, ejecutar todo el contenido de `supabase-schema.sql`
3. Copiar las credenciales del proyecto (Settings → API)

### 3. Configurar variables de entorno
Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### 4. Correr localmente
```bash
npm run dev
```
Abrir [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Subir el proyecto a GitHub
2. Ir a [vercel.com](https://vercel.com) → Import project → seleccionar el repo
3. En **Environment Variables**, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → listo ✅

## Subir a GitHub (primera vez)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pasteleria-kit.git
git push -u origin main
```

## Módulos incluidos

| Módulo | Descripción |
|---|---|
| 🧁 Recetas & Costos | Costeo por ingrediente, precio sugerido con margen configurable |
| 📦 Control de Stock | Inventario con semáforo de reposición automático |
| 💰 Ventas Diarias | Registro de ventas con canal y forma de pago |
| 📋 Pedidos | Encargos con saldo pendiente calculado automáticamente |
| 💸 Gastos | Fijos y variables por mes, totales anuales |
| 📊 Resumen Financiero | Utilidad, margen, punto de equilibrio |
