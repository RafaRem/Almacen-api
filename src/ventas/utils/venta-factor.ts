import { BadRequestException } from '@nestjs/common';

export type TipoPresentacionVenta = 'PIEZA' | 'CAJA' | string | null;

export function resolverFactorLinea(params: {
  tipoPresentacion?: TipoPresentacionVenta;
  factorPresentacion?: number | null;
  factorSolicitado?: number | null;
}): number {
  const tipo = String(params.tipoPresentacion || '').toUpperCase();
  if (tipo !== 'CAJA') {
    if (
      params.factorSolicitado != null &&
      Number(params.factorSolicitado) !== 1
    ) {
      throw new BadRequestException(
        'Una presentación por pieza debe tener factor 1',
      );
    }
    return 1;
  }

  const factor = Number(
    params.factorSolicitado ?? params.factorPresentacion ?? 1,
  );
  if (!Number.isInteger(factor) || factor < 2) {
    throw new BadRequestException('Factor de caja inválido para la venta');
  }
  return factor;
}

export function validarFactorLotes(params: {
  tipoPresentacion?: TipoPresentacionVenta;
  factorLinea: number;
  lotes: {
    numeroLote?: string | null;
    piezasPorCaja?: number | null;
  }[];
}): void {
  const tipo = String(params.tipoPresentacion || '').toUpperCase();
  if (tipo !== 'CAJA') return;

  for (const lote of params.lotes || []) {
    const factorLote = Number(lote.piezasPorCaja) || params.factorLinea;
    if (factorLote !== params.factorLinea) {
      throw new BadRequestException(
        `El lote ${lote.numeroLote || ''} tiene ${factorLote} piezas por caja y la línea usa ${params.factorLinea}`.trim(),
      );
    }
  }
}
