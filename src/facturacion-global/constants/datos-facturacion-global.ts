export type VarianteFacturacionGlobal = {
  descripcion: string;
  cp: string;
  serie?: string;
  receptor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
    usoCfdi: string;
  };
  periodicidades: string[];
};

export const DATOS_FACTURACION_GLOBAL: Record<
  string,
  VarianteFacturacionGlobal
> = {
  publicoGeneral: {
    descripcion: 'Público en general (CFDI global)',
    cp: '96734',
    serie: 'G',
    receptor: {
      rfc: 'XAXX010101000',
      nombre: 'PUBLICO EN GENERAL',
      regimenFiscal: '616',
      usoCfdi: 'S01',
    },
    periodicidades: ['01', '02', '03', '04'],
  },
};

export const VARIANTE_GLOBAL_DEFAULT = 'publicoGeneral';
