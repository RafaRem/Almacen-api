export class CuentaPorCobrarResponseDto {
  id: string;
  clienteId: string;
  ventaId: string | null;
  montoOriginal: number;
  montoPendiente: number;
  creditoAFavor: number;
  idStatus: number;
  fechaVencimiento: Date | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
  creditoDisponible?: number;
}
