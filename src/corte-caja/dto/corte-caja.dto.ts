export class AperturaCajaDto {
  usuarioId: string;
}

export class ImpuestosDesgloseDto {
  ivaCero: {
    cobrado: number;
    ventasGravadas: number;
  };
  ivaDieciseis: {
    cobrado: number;
    ventasGravadas: number;
  };
}

export class ResumenCorteCajaDto {
  totalVentas: number;
  cantidadVentas: number;
  desgloseMetodosPago: {
    metodoPago: string;
    total: number;
    cantidad: number;
  }[];
  impuestos: ImpuestosDesgloseDto;
}

export class VentaDelCorteDto {
  id: string;
  folio: string;
  total: number;
  metodopago: string;
  createdat: Date;
  clienteNombre: string;
}
