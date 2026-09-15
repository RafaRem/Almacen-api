export enum Clase {
  REGULADO = 'A',
  GENERAL = 'B',
}

export const ClaseLabel: Record<Clase, string> = {
  [Clase.REGULADO]: 'Regulado (A)',
  [Clase.GENERAL]: 'General (B)',
};

export const ClaseOptions = [
  { title: 'Regulado', value: Clase.REGULADO },
  { title: 'General', value: Clase.GENERAL },
];
