export function calcularMonto(
  d: { porcentaje: number; monto: number | null },
  base: number,
): number {
  if (d.monto && d.monto > 0) return d.monto
  return (base * d.porcentaje) / 100
}

export function calcularPrecioConDescuento(
  porcentaje: number,
  monto: number | null,
  subtotal: number,
): number {
  if (monto && monto > 0) return Math.max(0, subtotal - monto)
  return Math.max(0, subtotal - (subtotal * porcentaje) / 100)
}
