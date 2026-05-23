export enum Impuesto {
  ISR = '001',
  IVA = '002',
  IEPS = '003',
}

export enum TasaImpuesto {
  TASA_0 = 0,
  TASA_EXENTA = -1,
  TASA_8 = 8,
  TASA_16 = 16,
  TASA_26 = 26,
}

export const TasaImpuestoNombres: Record<number, string> = {
  [TasaImpuesto.TASA_0]: '0% - Tasa 0',
  [TasaImpuesto.TASA_EXENTA]: 'Exento - Exento',
  [TasaImpuesto.TASA_8]: '8% - Tasa reducida',
  [TasaImpuesto.TASA_16]: '16% - Tasa general',
  [TasaImpuesto.TASA_26]: '26% - Tasa adicional',
};

export const DEFAULT_TASA = TasaImpuesto.TASA_26;
