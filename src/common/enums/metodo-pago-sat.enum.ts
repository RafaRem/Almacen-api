export enum MetodoPagoSat {
  PUE = 'PUE',
  PIP = 'PIP',
  PPD = 'PPD',
}

export const MetodoPagoSatNombres: Record<MetodoPagoSat, string> = {
  [MetodoPagoSat.PUE]: 'PUE - Pago en una sola exhibición',
  [MetodoPagoSat.PIP]: 'PIP - Pago en parcialidades o diferido',
  [MetodoPagoSat.PPD]: 'PPD - Pago por definir',
};