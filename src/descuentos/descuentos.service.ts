import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Descuento } from './entities/descuento.entity';
import {
  CreateDescuentoDto,
  UpdateDescuentoDto,
} from './dto/create-descuento.dto';
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento)
    private descuentosRepository: Repository<Descuento>,
  ) {}

  async create(createDto: CreateDescuentoDto): Promise<Descuento> {
    const descuento = this.descuentosRepository.create(createDto);
    return this.descuentosRepository.save(descuento);
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
    const hoy = new Date();
    return this.descuentosRepository.find({
      where: {
        laboratorioId,
        tipo: DescuentoTipo.LABORATORIO,
        statusId: 1,
        fechaInicio: LessThanOrEqual(hoy),
        fechaFin: MoreThanOrEqual(hoy),
      },
    });
  }

  async update(id: string, updateDto: UpdateDescuentoDto): Promise<Descuento> {
    const descuento = await this.findOne(id);
    Object.assign(descuento, updateDto);
    return this.descuentosRepository.save(descuento);
  }

  async remove(id: string): Promise<void> {
    const descuento = await this.findOne(id);
    await this.descuentosRepository.remove(descuento);
  }

  async calcularDescuentosAcumulables(
    productoId: string,
    cantidad: number,
    precioVenta: number,
    laboratorioId: string,
    categoriaClienteId?: string,
    fechaCaducidad?: Date,
  ): Promise<{
    descuentoProducto: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      motivo: string;
      precioConDescuento: number;
    } | null;
    descuentoCategoria: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      motivo: string;
    } | null;
    descuentoTotal: number;
    precioOriginal: number;
    precioFinal: number;
    excedeLimite: boolean;
  }> {
    const precioOriginal = precioVenta * cantidad;
    const maximoDescuento = precioOriginal * 0.30;

    const descuentosProducto: {
      porcentaje: number;
      monto: number | null;
      tipo: DescuentoTipo;
      motivo: string;
      prioridad: number;
      acumulable: boolean;
    }[] = [];

    const descuentosCategoria: {
      porcentaje: number;
      monto: number | null;
      tipo: DescuentoTipo;
      motivo: string;
      prioridad: number;
      acumulable: boolean;
    }[] = [];

    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    console.log('[calcularDescuentosAcumulables] Todos los descuentos encontrados:', todosDescuentos.map(d => ({ tipo: d.tipo, porcentaje: d.porcentaje, prioridad: d.prioridad, condiciones: d.condiciones })));

    for (const d of todosDescuentos) {
      if (d.tipo === DescuentoTipo.VOLUMEN && d.condiciones) {
        const { minCantidad, maxCantidad } = d.condiciones;
        console.log('[calcularDescuentosAcumulables] VOLUMEN check:', { minCantidad, cantidadRecibida: cantidad, cantidadSuficiente: cantidad >= minCantidad });
        if (
          minCantidad &&
          cantidad >= minCantidad &&
          (!maxCantidad || cantidad <= maxCantidad)
        ) {
          descuentosProducto.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por volumen: ${cantidad} piezas`,
            prioridad: d.prioridad,
            acumulable: d.acumulable || false,
          });
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
            d.fechaInicio <= new Date() &&
            d.fechaFin >= new Date());
        if (dentroRangoFechas) {
          descuentosProducto.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Promoción de laboratorio`,
            prioridad: d.prioridad,
            acumulable: d.acumulable || false,
          });
        }
      }

      if (
        d.tipo === DescuentoTipo.CATEGORIA &&
        d.categoriaClienteId === categoriaClienteId
      ) {
        descuentosCategoria.push({
          porcentaje: Number(d.porcentaje),
          monto: d.monto ? Number(d.monto) : null,
          tipo: d.tipo,
          motivo: `Descuento por categoría de cliente`,
          prioridad: d.prioridad,
          acumulable: true,
        });
      }

      if (
        d.tipo === DescuentoTipo.CADUCIDAD &&
        d.condiciones &&
        fechaCaducidad
      ) {
        const { diasPrevios } = d.condiciones;
        const hoy = new Date();
        const diasHastaCaducidad = Math.floor(
          (fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (
          diasPrevios &&
          diasHastaCaducidad <= diasPrevios &&
          diasHastaCaducidad >= 0
        ) {
          descuentosProducto.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por caducidad próxima: ${diasHastaCaducidad} días`,
            prioridad: d.prioridad,
            acumulable: d.acumulable || false,
          });
        }
      }
    }

    const calcularMontoDescuento = (
      porcentaje: number,
      monto: number | null,
      base: number,
    ) => {
      if (monto && monto > 0) {
        return Math.min(monto, base);
      }
      return (base * porcentaje) / 100;
    };

    let descuentoProducto: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      motivo: string;
      precioConDescuento: number;
    } | null = null;

    if (descuentosProducto.length > 0) {
      descuentosProducto.sort((a, b) => {
        if (a.prioridad !== b.prioridad) {
          return a.prioridad - b.prioridad;
        }
        if (b.porcentaje !== a.porcentaje) {
          return b.porcentaje - a.porcentaje;
        }
        if ((b.monto || 0) !== (a.monto || 0)) {
          return (b.monto || 0) - (a.monto || 0);
        }
        return 0;
      });

      console.log('[calcularDescuentosAcumulables] Descuentos producto ordenados:', descuentosProducto.map(d => ({ tipo: d.tipo, porcentaje: d.porcentaje, prioridad: d.prioridad })));

      const mejor = descuentosProducto[0];
      const montoDescuento = calcularMontoDescuento(
        mejor.porcentaje,
        mejor.monto,
        precioOriginal,
      );
      const precioConDescuento = precioOriginal - montoDescuento;

      descuentoProducto = {
        tipo: mejor.tipo,
        porcentaje: mejor.porcentaje,
        monto: mejor.monto,
        motivo: mejor.motivo,
        precioConDescuento: Math.round(precioConDescuento * 100) / 100,
      };
    }

    let descuentoCategoria: {
      tipo: string;
      porcentaje: number;
      monto: number | null;
      motivo: string;
    } | null = null;

    if (descuentosCategoria.length > 0) {
      descuentosCategoria.sort((a, b) => {
        if (b.porcentaje !== a.porcentaje) {
          return b.porcentaje - a.porcentaje;
        }
        if ((b.monto || 0) !== (a.monto || 0)) {
          return (b.monto || 0) - (a.monto || 0);
        }
        return b.prioridad - a.prioridad;
      });

      const mejor = descuentosCategoria[0];
      descuentoCategoria = {
        tipo: mejor.tipo,
        porcentaje: mejor.porcentaje,
        monto: mejor.monto,
        motivo: mejor.motivo,
      };
    }

    let descuentoTotal = 0;
    let precioFinal = precioOriginal;

    if (descuentoProducto) {
      const montoProducto = precioOriginal - descuentoProducto.precioConDescuento;
      descuentoTotal += montoProducto;
    }

    if (descuentoCategoria) {
      const montoCategoria = calcularMontoDescuento(
        descuentoCategoria.porcentaje,
        descuentoCategoria.monto,
        precioOriginal - descuentoTotal,
      );
      descuentoTotal += montoCategoria;
    }

    if (descuentoTotal > maximoDescuento) {
      descuentoTotal = maximoDescuento;
    }

    precioFinal = precioOriginal - descuentoTotal;
    const excedeLimite = descuentoTotal >= maximoDescuento;

    return {
      descuentoProducto,
      descuentoCategoria,
      descuentoTotal: Math.round(descuentoTotal * 100) / 100,
      precioOriginal: Math.round(precioOriginal * 100) / 100,
      precioFinal: Math.round(precioFinal * 100) / 100,
      excedeLimite,
    };
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
    const descuentos: {
      porcentaje: number;
      monto: number | null;
      tipo: DescuentoTipo;
      motivo: string;
      prioridad: number;
    }[] = [];

    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    for (const d of todosDescuentos) {
      if (d.tipo === DescuentoTipo.VOLUMEN && d.condiciones) {
        const { minCantidad, maxCantidad } = d.condiciones;
        if (
          minCantidad &&
          cantidad >= minCantidad &&
          (!maxCantidad || cantidad <= maxCantidad)
        ) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por volumen: ${cantidad} piezas`,
            prioridad: d.prioridad,
          });
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
            d.fechaInicio <= new Date() &&
            d.fechaFin >= new Date());
        if (dentroRangoFechas) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Promoción de laboratorio`,
            prioridad: d.prioridad,
          });
        }
      }

      if (
        d.tipo === DescuentoTipo.CATEGORIA &&
        d.categoriaClienteId === categoriaClienteId
      ) {
        descuentos.push({
          porcentaje: Number(d.porcentaje),
          monto: d.monto ? Number(d.monto) : null,
          tipo: d.tipo,
          motivo: `Descuento por categoría de cliente`,
          prioridad: d.prioridad,
        });
      }

      if (
        d.tipo === DescuentoTipo.CADUCIDAD &&
        d.condiciones &&
        fechaCaducidad
      ) {
        const { diasPrevios } = d.condiciones;
        const hoy = new Date();
        const diasHastaCaducidad = Math.floor(
          (fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (
          diasPrevios &&
          diasHastaCaducidad <= diasPrevios &&
          diasHastaCaducidad >= 0
        ) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por caducidad próxima: ${diasHastaCaducidad} días`,
            prioridad: d.prioridad,
          });
        }
      }
    }

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
      precioVenta,
      laboratorioId,
      categoriaClienteId,
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
