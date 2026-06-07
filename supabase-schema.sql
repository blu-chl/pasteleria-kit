-- Habilitar RLS en todas las tablas
-- Ejecutar esto en el SQL Editor de Supabase

-- Ingredientes (tabla maestra de precios)
create table ingredientes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  unidad text not null,
  precio_unidad numeric not null default 0,
  stock_minimo numeric not null default 0,
  proveedor text,
  notas text,
  created_at timestamptz default now()
);
alter table ingredientes enable row level security;
create policy "Users manage own ingredientes" on ingredientes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recetas
create table recetas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  porciones int not null default 1,
  margen numeric not null default 55,
  costo_envase numeric not null default 0,
  created_at timestamptz default now()
);
alter table recetas enable row level security;
create policy "Users manage own recetas" on recetas
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ingredientes de cada receta
create table receta_ingredientes (
  id uuid default gen_random_uuid() primary key,
  receta_id uuid references recetas(id) on delete cascade not null,
  ingrediente_nombre text not null,
  cantidad text not null,
  costo numeric not null default 0
);
alter table receta_ingredientes enable row level security;
create policy "Users manage own receta_ingredientes" on receta_ingredientes
  using (exists (
    select 1 from recetas r where r.id = receta_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from recetas r where r.id = receta_id and r.user_id = auth.uid()
  ));

-- Stock
create table stock (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nombre text not null,
  unidad text not null,
  stock_actual numeric not null default 0,
  stock_minimo numeric not null default 0,
  precio_unitario numeric not null default 0,
  created_at timestamptz default now()
);
alter table stock enable row level security;
create policy "Users manage own stock" on stock
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ventas
create table ventas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  fecha date not null,
  producto text not null,
  precio_venta numeric not null default 0,
  unidades int not null default 0,
  costo_unitario numeric not null default 0,
  canal text,
  forma_pago text,
  notas text,
  created_at timestamptz default now()
);
alter table ventas enable row level security;
create policy "Users manage own ventas" on ventas
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pedidos
create table pedidos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  numero int not null,
  cliente text not null,
  telefono text,
  descripcion text not null,
  fecha_pedido date,
  fecha_entrega date,
  precio_total numeric not null default 0,
  sena_pagada numeric not null default 0,
  estado text not null default 'Pendiente',
  notas text,
  created_at timestamptz default now()
);
alter table pedidos enable row level security;
create policy "Users manage own pedidos" on pedidos
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Gastos
create table gastos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null check (tipo in ('fijo', 'variable')),
  concepto text not null,
  ene numeric default 0, feb numeric default 0, mar numeric default 0,
  abr numeric default 0, may numeric default 0, jun numeric default 0,
  jul numeric default 0, ago numeric default 0, sep numeric default 0,
  oct numeric default 0, nov numeric default 0, dic numeric default 0,
  created_at timestamptz default now()
);
alter table gastos enable row level security;
create policy "Users manage own gastos" on gastos
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
