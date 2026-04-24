import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Descuento } from './entities/descuento.entity';
import { CreateDescuentoDto, UpdateDescuentoDto } from './dto/create-descuento.dto';
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
    const descuento = await this.descuentosRepository.findOne({ where: { id } });
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

  async calcularMejorDescuento(
    productoId: string,
    cantidad: number,
    laboratorioId: string,
    categoriaClienteId?: string,
    fechaCaducidad?: Date,
  ): Promise<{ mejorDescuento: number; tipo: string; motivo: string }> {
    const descuentos: { porcentaje: number; monto: number | null; tipo: DescuentoTipo; motivo: string; prioridad: number }[] = [];

    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    for (const d of todosDescuentos) {
      if (d.tipo === DescuentoTipo.VOLUMEN && d.condiciones) {
        const { minCantidad, maxCantidad } = d.condiciones;
        if (minCantidad && cantidad >= minCantidad && (!maxCantidad || cantidad <= maxCantidad)) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            monto: d.monto ? Number(d.monto) : null,
            tipo: d.tipo,
            motivo: `Descuento por volumen: ${cantidad} piezas`,
            prioridad: d.prioridad,
          });
        }
      }

      if (d.tipo === DescuentoTipo.LABORATORIO && d.laboratorioId === laboratorioId) {
        const dentroRangoFechas = (!d.fechaInicio && !d.fechaFin) ||
          (d.fechaInicio && d.fechaFin && d.fechaInicio <= new Date() && d.fechaFin >= new Date());
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

      if (d.tipo === DescuentoTipo.CATEGORIA && d.categoriaClienteId === categoriaClienteId) {
        descuentos.push({
          porcentaje: Number(d.porcentaje),
          monto: d.monto ? Number(d.monto) : null,
          tipo: d.tipo,
          motivo: `Descuento por categoría de cliente`,
          prioridad: d.prioridad,
        });
      }

      if (d.tipo === DescuentoTipo.CADUCIDAD && d.condiciones && fechaCaducidad) {
        const { diasPrevios } = d.condiciones;
        const hoy = new Date();
        const diasHastaCaducidad = Math.floor((fechaCaducidad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diasPrevios && diasHastaCaducidad <= diasPrevios && diasHastaCaducidad >= 0) {
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
      return { mejorDescuento: 0, tipo: 'NINGUNO', motivo: 'No hay descuentos aplicables' };
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

    const mejor = descuentos[0];
    return {
      mejorDescuento: mejor.porcentaje,
      tipo: mejor.tipo,
      motivo: mejor.motivo,
    };
  }
}