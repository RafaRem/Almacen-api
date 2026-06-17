export function parseDate(raw: Date | string | number | undefined): Date | undefined {
  if (raw instanceof Date) return raw
  if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw)
  return undefined
}

export function isWithinDateRange(fechaInicio?: Date, fechaFin?: Date, hoy: Date = new Date()): boolean {
  if (!fechaInicio && !fechaFin) return true
  if (fechaInicio && fechaFin) return fechaInicio <= hoy && fechaFin >= hoy
  return false
}
