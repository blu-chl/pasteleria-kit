export type Ingrediente = {
  id: string
  user_id: string
  nombre: string
  unidad: string
  precio_unidad: number
  stock_minimo: number
  proveedor?: string
  notas?: string
}

export type RecetaIngrediente = {
  id: string
  receta_id: string
  ingrediente_id: string
  ingrediente_nombre: string
  cantidad: string
  costo: number
}

export type Receta = {
  id: string
  user_id: string
  nombre: string
  porciones: number
  margen: number
  costo_envase: number
  ingredientes: RecetaIngrediente[]
}

export type StockItem = {
  id: string
  user_id: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  precio_unitario: number
}

export type Venta = {
  id: string
  user_id: string
  fecha: string
  producto: string
  precio_venta: number
  unidades: number
  costo_unitario: number
  canal: string
  forma_pago: string
  notas?: string
}

export type Pedido = {
  id: string
  user_id: string
  numero: number
  cliente: string
  telefono?: string
  descripcion: string
  fecha_pedido: string
  fecha_entrega: string
  precio_total: number
  sena_pagada: number
  estado: 'Pendiente' | 'En preparación' | 'Listo' | 'Entregado' | 'Cancelado'
  notas?: string
}

export type Gasto = {
  id: string
  user_id: string
  tipo: 'fijo' | 'variable'
  concepto: string
  ene: number; feb: number; mar: number; abr: number
  may: number; jun: number; jul: number; ago: number
  sep: number; oct: number; nov: number; dic: number
}
