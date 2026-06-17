import { DescuentoTipo } from '../../common/enums/descuento-tipo.enum';

export interface DescuentoEvaluadoBasico {
  descuentoId: string | null;
  tipo: DescuentoTipo;
  porcentaje: number;
  monto: number;
  motivo: string;
}

export interface DescuentoProductoResult extends DescuentoEvaluadoBasico {
  precioConDescuento: number;
}

export interface DescuentoAcumulableResult {
  descuentosAplicables: (DescuentoEvaluadoBasico & { esProducto: boolean })[];
  descuentoProducto: DescuentoProductoResult | null;
  descuentoCategoria: DescuentoEvaluadoBasico | null;
  descuentoTotal: number;
  precioOriginal: number;
  precioFinal: number;
  porcentajeEfectivo: number;
  excedeLimite: boolean;
}

export interface PreviewProductoDescuento {
  productoId: string;
  descuento: number;
  descuentoProducto: number;
  descuentoCategoria: number;
  motivo: string;
  mejorDescuento: {
    descuentoId: string | null;
    tipo: string;
    porcentaje: number;
    monto: number;
    precioConDescuento: number;
    motivo: string;
  };
  descuentoCategoriaInfo: {
    descuentoId: string | null;
    tipo: string;
    porcentaje: number;
    monto: number;
    motivo: string;
  } | null;
  preciosAlternativos: {
    tipo: string;
    porcentaje: number;
    monto: number | null;
    precioConDescuento: number;
    motivo: string;
  }[];
}

export interface PreviewDescuentoResult {
  subtotal: number;
  descuentoAplicado: number;
  iva: number;
  total: number;
  descuentoPorProducto: PreviewProductoDescuento[];
}

export interface DescuentoInfoEntry {
  productoId: string;
  descuentoId: string | null;
  tipo: string;
  porcentaje: number;
  monto: number;
  motivo: string;
}
