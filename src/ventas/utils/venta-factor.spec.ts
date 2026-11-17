import { BadRequestException } from '@nestjs/common';
import {
  resolverFactorLinea,
  validarFactorLotes,
} from './venta-factor';

describe('venta-factor', () => {
  it('uses factor 1 for pieces', () => {
    expect(
      resolverFactorLinea({
        tipoPresentacion: 'PIEZA',
        factorPresentacion: 1,
        factorSolicitado: 1,
      }),
    ).toBe(1);
  });

  it('uses the requested box factor', () => {
    expect(
      resolverFactorLinea({
        tipoPresentacion: 'CAJA',
        factorPresentacion: 12,
        factorSolicitado: 24,
      }),
    ).toBe(24);
  });

  it('falls back to the presentation factor', () => {
    expect(
      resolverFactorLinea({
        tipoPresentacion: 'CAJA',
        factorPresentacion: 12,
      }),
    ).toBe(12);
  });

  it('rejects a non-1 factor for pieces', () => {
    expect(() =>
      resolverFactorLinea({
        tipoPresentacion: 'PIEZA',
        factorSolicitado: 12,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects mixed lot factors in a box line', () => {
    expect(() =>
      validarFactorLotes({
        tipoPresentacion: 'CAJA',
        factorLinea: 12,
        lotes: [
          { numeroLote: 'A', piezasPorCaja: 12 },
          { numeroLote: 'B', piezasPorCaja: 24 },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts matching lot factors', () => {
    expect(() =>
      validarFactorLotes({
        tipoPresentacion: 'CAJA',
        factorLinea: 12,
        lotes: [
          { numeroLote: 'A', piezasPorCaja: 12 },
          { numeroLote: 'B', piezasPorCaja: 12 },
        ],
      }),
    ).not.toThrow();
  });
});
