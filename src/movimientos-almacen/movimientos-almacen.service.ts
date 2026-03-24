import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoAlmacen } from './entities/movimiento-almacen.entity';
import { CreateMovimientoAlmacenDto } from './dto/create-movimiento-almacen.dto';

@Injectable()
export class MovimientosAlmacenService {
  constructor(
    @InjectRepository(MovimientoAlmacen)
    private movimientosRepository: Repository<MovimientoAlmacen>,
  ) {}

  async create(createMovimientoDto: CreateMovimientoAlmacenDto, userId: string): Promise<MovimientoAlmacen> {
    const movimiento = this.movimientosRepository.create({
      ...createMovimientoDto,
      userId,
    });
    return this.movimientosRepository.save(movimiento);
  }

  async findAll(): Promise<MovimientoAlmacen[]> {
    return this.movimientosRepository.find({
      relations: ['producto', 'lote', 'usuario'],
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MovimientoAlmacen> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { id },
      relations: ['producto', 'lote', 'usuario'],
    });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento with ID ${id} not found`);
    }
    return movimiento;
  }

  async findByProducto(productoId: string): Promise<MovimientoAlmacen[]> {
    return this.movimientosRepository.find({
      where: { productoId },
      relations: ['producto', 'lote', 'usuario'],
      order: { fecha: 'DESC' },
    });
  }

  async findByAlmacen(tipo: number): Promise<MovimientoAlmacen[]> {
    return this.movimientosRepository.find({
      where: [{ almacenOrigen: tipo }, { almacenDestino: tipo }],
      relations: ['producto', 'lote', 'usuario'],
      order: { fecha: 'DESC' },
    });
  }
}