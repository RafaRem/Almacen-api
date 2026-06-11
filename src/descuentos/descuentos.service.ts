import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Descuento } from './entities/descuento.entity';
import { DescuentoProducto } from './entities/descuento-producto.entity';
import {
  CreateDescuentoDto,
  UpdateDescuentoDto,
} from './dto/create-descuento.dto';
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';
import { StatusId } from '../common/enums/status-id.enum';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private descuentosRepository: Repository<Descuento>,
    @InjectRepository(DescuentoProducto)
    private descuentosProductosRepository: Repository<DescuentoProducto>,
    @InjectRepository(CategoriaCliente)
    private categoriaClienteRepository: Repository<CategoriaCliente>,
  ) {}

  async create(createDto: CreateDescuentoDto): Promise<Descuento> {
    const { productoIds, ...rest } = createDto;
    const descuento = this.descuentosRepository.create(rest);
    const saved = await this.descuentosRepository.save(descuento);
    if (productoIds && productoIds.length > 0) {
      const asignaciones = productoIds.map(productoId => ({
        descuentoId: saved.id,
        productoId,
        statusId: StatusId.ACTIVE,
      }));
      await this.descuentosProductosRepository.save(asignaciones);
    }
    return saved;
  }

  async findAll(): Promise<Descuento[]> {
    return this.descuentosRepository.find();
  }

  async findOne(id: string): Promise<Descuento> {
    const descuento = await this.descuentosRepository.findOne({
      where: { id },
    });
    if (!descuento) {
      throw new NotFoundException(`Descuento with ID ${id} not found`);
    }
    return descuento;
  }

  async findByLaboratorio(laboratorioId: string): Promise<Descuento[]> {
    const descuentos = await this.descuentosRepository.find({
      where: {
        laboratorioId,
        tipo: DescuentoTipo.LABORATORIO,
        statusId: 1,
      },
    });
    const hoy = new Date();
    return descuentos.filter((d) => {
      if (!d.fechaInicio && !d.fechaFin) return true;
      if (d.fechaInicio && d.fechaFin) {
        return new Date(d.fechaInicio) <= hoy && new Date(d.fechaFin) >= hoy;
      }
      return false;
    });
  }

  async update(id: string, updateDto: UpdateDescuentoDto): Promise<Descuento> {
    const { productoIds, ...rest } = updateDto;
    const descuento = await this.findOne(id);
    Object.assign(descuento, rest);
    const saved = await this.descuentosRepository.save(descuento);
    if (productoIds !== undefined) {
      await this.descuentosProductosRepository.delete({ descuentoId: id });
      if (productoIds.length > 0) {
        const asignaciones = productoIds.map(productoId => ({
          descuentoId: id,
          productoId,
          statusId: StatusId.ACTIVE,
        }));
        await this.descuentosProductosRepository.save(asignaciones);
      }
    }
    return saved;
  }

  private static readonly LIMITE_MAXIMO_PORCENTAJE = 30;

  private evaluarDescuento(
    d: Descuento,
    args: {
      productoId: string;
      cantidad: number;
      laboratorioId: string;
      categoriaClienteId?: string;
      fechaCaducidad?: Date;
    },
    productosPorDescuento?: Map<string, Set<string>>,
  ): {
    porcentaje: number;
    monto: number | null;
    tipo: DescuentoTipo;
    motivo: string;
    prioridad: number;
    descuentoId: string;
    acumulable: boolean;
  } | null {
    const { productoId, cantidad, laboratorioId, categoriaClienteId, fechaCaducidad } = args;
    const hoy = new Date();

    const asignados = productosPorDescuento?.get(d.id);
    if (asignados && !asignados.has(productoId)) {
      return null;
    }

    if (d.tipo === DescuentoTipo.VOLUMEN && d.condiciones) {
      const { minCantidad, maxCantidad } = d.condiciones;
      if (
        minCantidad &&
        cantidad >= minCantidad &&
        (!maxCantidad || cantidad <= maxCantidad)
      ) {
        const dentroRangoFechas =
          (!d.fechaInicio && !d.fechaFin) ||
          (d.fechaInicio &&
            d.fechaFin &&
            new Date(d.fechaInicio) <= hoy &&
            new Date(d.fechaFin) >= hoy);
        if (dentroRangoFechas) {
          return {
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por volumen: ${cantidad} piezas`,
            prioridad: d.prioridad,
            descuentoId: d.id,
            acumulable: d.acumulable,
          };
        }
      }
    }

    if (
      d.tipo === DescuentoTipo.LABORATORIO &&
      d.laboratorioId === laboratorioId
    ) {
      const dentroRangoFechas =
        (!d.fechaInicio && !d.fechaFin) ||
        (d.fechaInicio &&
          d.fechaFin &&
          new Date(d.fechaInicio) <= hoy &&
          new Date(d.fechaFin) >= hoy);
      if (dentroRangoFechas) {
        return {
          porcentaje: Number(d.porcentaje),
          monto: d.monto ? Number(d.monto) : null,
          tipo: d.tipo,
          motivo: `Promoción de laboratorio`,
          prioridad: d.prioridad,
          descuentoId: d.id,
          acumulable: d.acumulable,
        };
      }
    }

    if (
      d.tipo === DescuentoTipo.CADUCIDAD &&
      d.condiciones &&
      fechaCaducidad
    ) {
      const { diasPrevios } = d.condiciones;
      const diasHastaCaducidad = Math.floor(
        (fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (
        diasPrevios &&
        diasHastaCaducidad <= diasPrevios &&
        diasHastaCaducidad >= 0
      ) {
        const dentroRangoFechas =
          (!d.fechaInicio && !d.fechaFin) ||
          (d.fechaInicio &&
            d.fechaFin &&
            new Date(d.fechaInicio) <= hoy &&
            new Date(d.fechaFin) >= hoy);
        if (dentroRangoFechas) {
          return {
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por caducidad próxima: ${diasHastaCaducidad} días`,
            prioridad: d.prioridad,
            descuentoId: d.id,
            acumulable: d.acumulable,
          };
        }
      }
    }

    if (d.tipo === DescuentoTipo.CATEGORIA && d.categoriaClienteId) {
      if (categoriaClienteId && d.categoriaClienteId === categoriaClienteId) {
        return {
          porcentaje: Number(d.porcentaje),
          monto: d.monto ? Number(d.monto) : null,
          tipo: d.tipo,
          motivo: `Descuento por categoría de cliente: ${d.nombre || d.categoriaClienteId}`,
          prioridad: d.prioridad,
          descuentoId: d.id,
          acumulable: d.acumulable,
        };
      }
    }

    return null;
  }

  async calcularDescuentosAcumulables(
    productoId: string,
    cantidad: number,
    laboratorioId: string,
    categoriaClienteId?: string,
    fechaCaducidad?: Date,
    precioVentaUnitario?: number,
  ): Promise<{
    descuentosAplicables: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      motivo: string;
      esProducto: boolean;
    }[];
    descuentoProducto: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      precioConDescuento: number;
      motivo: string;
    } | null;
    descuentoCategoria: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      motivo: string;
    } | null;
    descuentoTotal: number;
    precioOriginal: number;
    precioFinal: number;
    porcentajeEfectivo: number;
    excedeLimite: boolean;
  }> {
    const subtotalLinea = (precioVentaUnitario || 0) * cantidad;

    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    const productosPorDescuento = await this.cargarAsignacionesProducto();

    const descuentosEvaluados = todosDescuentos
      .map((d) =>
        this.evaluarDescuento(d, {
          productoId,
          cantidad,
          laboratorioId,
          categoriaClienteId,
          fechaCaducidad,
        }, productosPorDescuento),
      )
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const descuentosProducto = descuentosEvaluados.filter(
      (d) => d.tipo !== DescuentoTipo.CATEGORIA,
    );

    const categoriaDesdeTabla = descuentosEvaluados.find(
      (d) => d.tipo === DescuentoTipo.CATEGORIA,
    );

    const ordenarPorBeneficio = (
      a: typeof descuentosProducto[0],
      b: typeof descuentosProducto[0],
    ) => {
      const beneficioA =
        a.monto && a.monto > 0
          ? a.monto
          : (subtotalLinea * a.porcentaje) / 100;
      const beneficioB =
        b.monto && b.monto > 0
          ? b.monto
          : (subtotalLinea * b.porcentaje) / 100;
      return beneficioB - beneficioA;
    };
    descuentosProducto.sort(ordenarPorBeneficio);

    const calcularMonto = (
      d: { porcentaje: number; monto: number | null },
      base: number,
    ) => {
      if (d.monto && d.monto > 0) return d.monto;
      return (base * d.porcentaje) / 100;
    };

    const mejorProducto = descuentosProducto[0] || null;

    let descuentoCategoria: {
      porcentaje: number;
      monto: number | null;
      tipo: DescuentoTipo;
      motivo: string;
      prioridad: number;
      descuentoId: string | null;
      acumulable: boolean;
    } | null = null;
    if (categoriaDesdeTabla) {
      descuentoCategoria = { ...categoriaDesdeTabla };
    } else if (categoriaClienteId) {
      const categoria = await this.categoriaClienteRepository.findOne({
        where: { id: categoriaClienteId, statusId: StatusId.ACTIVE },
      });
      if (categoria && Number(categoria.descuento) > 0) {
        descuentoCategoria = {
          porcentaje: Number(categoria.descuento),
          monto: null,
          tipo: DescuentoTipo.CATEGORIA,
          motivo: `Descuento por categoría de cliente: ${categoria.nombre}`,
          prioridad: 0,
          descuentoId: null,
          acumulable: true,
        };
      }
    }

    let descuentoProductoInfo: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      precioConDescuento: number;
      motivo: string;
    } | null = null;
    if (mejorProducto) {
      const montoProducto = calcularMonto(mejorProducto, subtotalLinea);
      const montoProductoRounded = Number(montoProducto.toFixed(2));
      descuentoProductoInfo = {
        descuentoId: mejorProducto.descuentoId,
        tipo: mejorProducto.tipo,
        porcentaje: mejorProducto.porcentaje,
        monto: montoProductoRounded,
        precioConDescuento: Number((subtotalLinea - montoProductoRounded).toFixed(2)),
        motivo: mejorProducto.motivo,
      };
    }

    let descuentoCategoriaInfo: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      motivo: string;
    } | null = null;
    if (descuentoCategoria) {
      const baseCategoria = descuentoProductoInfo
        ? descuentoProductoInfo.precioConDescuento
        : subtotalLinea;
      const montoCategoria = calcularMonto(
        descuentoCategoria,
        baseCategoria,
      );
      descuentoCategoriaInfo = {
        descuentoId: descuentoCategoria.descuentoId,
        tipo: descuentoCategoria.tipo,
        porcentaje: descuentoCategoria.porcentaje,
        monto: Number(montoCategoria.toFixed(2)),
        motivo: descuentoCategoria.motivo,
      };
    }

    const totalProducto = descuentoProductoInfo?.monto || 0;
    const totalCategoria = descuentoCategoriaInfo?.monto || 0;
    const descuentoTotalSinCap = totalProducto + totalCategoria;

    const porcentajeEfectivoSinCap =
      subtotalLinea > 0 ? (descuentoTotalSinCap / subtotalLinea) * 100 : 0;
    const excedeLimite =
      porcentajeEfectivoSinCap > DescuentosService.LIMITE_MAXIMO_PORCENTAJE;

    let descuentoTotal = descuentoTotalSinCap;
    let porcentajeEfectivo = porcentajeEfectivoSinCap;
    if (excedeLimite) {
      descuentoTotal = Number(
        (
          (subtotalLinea * DescuentosService.LIMITE_MAXIMO_PORCENTAJE) /
          100
        ).toFixed(2),
      );
      porcentajeEfectivo = DescuentosService.LIMITE_MAXIMO_PORCENTAJE;
    }

    const precioFinal = Number((subtotalLinea - descuentoTotal).toFixed(2));

    const descuentosAplicables: {
      descuentoId: string | null;
      tipo: DescuentoTipo;
      porcentaje: number;
      monto: number;
      motivo: string;
      esProducto: boolean;
    }[] = [];
    if (descuentoProductoInfo) {
      descuentosAplicables.push({
        descuentoId: descuentoProductoInfo.descuentoId,
        tipo: descuentoProductoInfo.tipo,
        porcentaje: descuentoProductoInfo.porcentaje,
        monto: descuentoProductoInfo.monto,
        motivo: descuentoProductoInfo.motivo,
        esProducto: true,
      });
    }
    if (descuentoCategoriaInfo) {
      descuentosAplicables.push({
        descuentoId: null,
        tipo: descuentoCategoriaInfo.tipo,
        porcentaje: descuentoCategoriaInfo.porcentaje,
        monto: descuentoCategoriaInfo.monto,
        motivo: descuentoCategoriaInfo.motivo,
        esProducto: false,
      });
    }

    return {
      descuentosAplicables,
      descuentoProducto: descuentoProductoInfo,
      descuentoCategoria: descuentoCategoriaInfo,
      descuentoTotal,
      precioOriginal: Number(subtotalLinea.toFixed(2)),
      precioFinal,
      porcentajeEfectivo: Number(porcentajeEfectivo.toFixed(2)),
      excedeLimite,
    };
  }

  async remove(id: string): Promise<void> {
    const descuento = await this.findOne(id);
    await this.descuentosRepository.remove(descuento);
  }

  async findProductoIds(id: string): Promise<string[]> {
    const asignaciones = await this.descuentosProductosRepository.find({
      where: { descuentoId: id, statusId: StatusId.ACTIVE },
    });
    return asignaciones.map(a => a.productoId);
  }

  private async cargarAsignacionesProducto(): Promise<Map<string, Set<string>>> {
    const asignaciones = await this.descuentosProductosRepository.find({
      where: { statusId: StatusId.ACTIVE },
    });
    const map = new Map<string, Set<string>>();
    for (const a of asignaciones) {
      if (!map.has(a.descuentoId)) {
        map.set(a.descuentoId, new Set());
      }
      map.get(a.descuentoId)!.add(a.productoId);
    }
    return map;
  }

  async calcularMejorDescuento(
    productoId: string,
    cantidad: number,
    laboratorioId: string,
    categoriaClienteId?: string,
    fechaCaducidad?: Date,
    subtotalLinea?: number,
  ): Promise<{
    mejorDescuento: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      motivo: string;
      precioConDescuento: number;
    };
    preciosAlternativos: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      precioConDescuento: number;
      motivo: string;
    }[];
  }> {
    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    const productosPorDescuento = await this.cargarAsignacionesProducto();

    const descuentos = todosDescuentos
      .map((d) =>
        this.evaluarDescuento(d, {
          productoId,
          cantidad,
          laboratorioId,
          categoriaClienteId,
          fechaCaducidad,
        }, productosPorDescuento),
      )
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map(({ descuentoId, acumulable, ...rest }) => rest);

    if (descuentos.length === 0) {
      return {
        mejorDescuento: {
          tipo: 'NINGUNO',
          porcentaje: 0,
          monto: null,
          motivo: 'No hay descuentos aplicables',
          precioConDescuento: 0,
        },
        preciosAlternativos: [],
      };
    }

    descuentos.sort((a, b) => {
      if (b.porcentaje !== a.porcentaje) {
        return b.porcentaje - a.porcentaje;
      }
      if ((b.monto || 0) !== (a.monto || 0)) {
        return (b.monto || 0) - (a.monto || 0);
      }
      return b.prioridad - a.prioridad;
    });

    const calcularPrecioConDescuento = (
      porcentaje: number,
      monto: number | null,
      subtotal: number,
    ) => {
      if (monto && monto > 0) {
        return Math.max(0, subtotal - monto);
      }
      return Math.max(0, subtotal - (subtotal * porcentaje) / 100);
    };

    const mejor = descuentos[0];
    const alternativas = descuentos.slice(1, 5).map((d) => ({
      tipo: d.tipo,
      porcentaje: d.porcentaje,
      monto: d.monto,
      precioConDescuento: subtotalLinea
        ? calcularPrecioConDescuento(d.porcentaje, d.monto, subtotalLinea)
        : 0,
      motivo: d.motivo,
    }));

    return {
      mejorDescuento: {
        tipo: mejor.tipo,
        porcentaje: mejor.porcentaje,
        monto: mejor.monto,
        motivo: mejor.motivo,
        precioConDescuento: subtotalLinea
          ? calcularPrecioConDescuento(
              mejor.porcentaje,
              mejor.monto,
              subtotalLinea,
            )
          : 0,
      },
      preciosAlternativos: alternativas,
    };
  }

  async previewProductDiscount(
    productoId: string,
    cantidad: number,
    precioUnitario: number,
    iva: number,
    margen: number,
    laboratorioId: string,
    categoriaClienteId?: string,
    fechaCaducidad?: Date,
  ): Promise<{
    tieneDescuento: boolean;
    precioOriginal: number;
    precioConDescuento: number;
    descuento: number;
    descuentoProducto: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
    } | null;
    descuentoCategoria: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
    } | null;
  } | null> {
    const precioNeto = precioUnitario * (1 + iva / 100);
    const cantidadMargen = precioUnitario * (margen / 100);
    const precioVenta = precioNeto + cantidadMargen;

    const calculo = await this.calcularDescuentosAcumulables(
      productoId,
      cantidad,
      laboratorioId,
      categoriaClienteId,
      fechaCaducidad,
      precioVenta,
    );

    if (!calculo.descuentoProducto && !calculo.descuentoCategoria) {
      return null;
    }

    const precioOriginal = precioVenta * cantidad;
    const descuentoTotal = calculo.precioOriginal - calculo.precioFinal;

    return {
      tieneDescuento: true,
      precioOriginal: Math.round(precioOriginal * 100) / 100,
      precioConDescuento: Math.round(calculo.precioFinal * 100) / 100,
      descuento: Math.round(descuentoTotal * 100) / 100,
      descuentoProducto: calculo.descuentoProducto
        ? {
            tipo: calculo.descuentoProducto.tipo,
            porcentaje: calculo.descuentoProducto.porcentaje,
            monto: calculo.descuentoProducto.monto,
          }
        : null,
      descuentoCategoria: calculo.descuentoCategoria
        ? {
            tipo: calculo.descuentoCategoria.tipo,
            porcentaje: calculo.descuentoCategoria.porcentaje,
            monto: calculo.descuentoCategoria.monto,
          }
        : null,
    };
  }
}
