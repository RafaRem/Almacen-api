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
  ): Promise<{ mejorDescuento: number; tipo: string; motivo: string }> {
    const descuentos: { porcentaje: number; tipo: DescuentoTipo; motivo: string; prioridad: number }[] = [];

    const todosDescuentos = await this.descuentosRepository.find({
      where: { statusId: 1 },
    });

    for (const d of todosDescuentos) {
      if (d.tipo === DescuentoTipo.VOLUMEN && d.condiciones) {
        const { minPiezas, maxPiezas } = d.condiciones;
        if (cantidad >= minPiezas && (!maxPiezas || cantidad <= maxPiezas)) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            tipo: d.tipo,
            motivo: `Descuento por volumen: ${cantidad} piezas`,
            prioridad: d.prioridad,
          });
        }
      }

      if (d.tipo === DescuentoTipo.LABORATORIO && d.laboratorioId === laboratorioId) {
        if (!d.fechaInicio || !d.fechaFin) {
          descuentos.push({
            porcentaje: Number(d.porcentaje),
            tipo: d.tipo,
            motivo: `Promoción de laboratorio`,
            prioridad: d.prioridad,
          });
        } else {
          const hoy = new Date();
          if (d.fechaInicio <= hoy && d.fechaFin >= hoy) {
            descuentos.push({
              porcentaje: Number(d.porcentaje),
              tipo: d.tipo,
              motivo: `Promoción de laboratorio activa`,
              prioridad: d.prioridad,
            });
          }
        }
      }

      if (d.tipo === DescuentoTipo.CATEGORIA && d.categoriaClienteId === categoriaClienteId) {
        descuentos.push({
          porcentaje: Number(d.porcentaje),
          tipo: d.tipo,
          motivo: `Descuento por categoría de cliente`,
          prioridad: d.prioridad,
        });
      }
    }

    if (descuentos.length === 0) {
      return { mejorDescuento: 0, tipo: 'NINGUNO', motivo: 'No hay descuentos aplicables' };
    }

    descuentos.sort((a, b) => {
      if (b.porcentaje !== a.porcentaje) {
        return b.porcentaje - a.porcentaje;
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