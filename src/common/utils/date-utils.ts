export function parseDate(
  raw: Date | string | number | undefined,
): Date | undefined {
  if (raw instanceof Date) return raw;
  if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw);
  return undefined;
}

export function isWithinDateRange(
  fechaInicio?: Date | string,
  fechaFin?: Date | string,
  hoy: Date = new Date(),
): boolean {
  const inicio =
    typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
  if (!inicio && !fin) return true;
  if (inicio && fin) return inicio <= hoy && fin >= hoy;
  return false;
}
