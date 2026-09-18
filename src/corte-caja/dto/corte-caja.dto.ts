export class AperturaCajaDto {
  usuarioId: string;
}

export class ResumenCorteCajaDto {
  totalVentas: number;
  cantidadVentas: number;
  desgloseMetodosPago: {
    metodoPago: string;
    total: number;
    cantidad: number;
  }[];
}

export class VentaDelCorteDto {
  id: string;
  folio: string;
  total: number;
  metodopago: string;
  createdat: Date;
  clienteNombre: string;
}
