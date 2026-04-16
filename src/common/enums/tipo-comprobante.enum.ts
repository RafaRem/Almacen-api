export enum TipoComprobante {
  INGRESO = 'I',
  EGRESO = 'E',
  NOMINA = 'N',
  TRASLADO = 'T',
}

export const TipoComprobanteNombres: Record<TipoComprobante, string> = {
  [TipoComprobante.INGRESO]: 'I - Ingreso',
  [TipoComprobante.EGRESO]: 'E - Egreso',
  [TipoComprobante.NOMINA]: 'N - Nómina',
  [TipoComprobante.TRASLADO]: 'T - Traslado',
};