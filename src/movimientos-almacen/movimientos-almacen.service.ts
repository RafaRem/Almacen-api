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

  async findByLote(loteId: string): Promise<any> {
    const movimientos = await this.movimientosRepository.find({
      where: { loteId },
      relations: ['producto', 'lote', 'usuario'],
      order: { fecha: 'DESC' },
    });

    if (movimientos.length === 0) {
      throw new NotFoundException(`No se encontraron movimientos para el lote ${loteId}`);
    }

    const numeroLote = movimientos[0].lote?.numeroLote;

    const historial = movimientos.map(m => ({
      fecha: m.fecha,
      tipo: this.determinarTipo(m),
      almacenOrigen: m.almacenOrigen,
      almacenDestino: m.almacenDestino,
      cantidad: m.cantidad,
      observaciones: m.observaciones,
      usuario: m.usuario?.name || m.usuario?.email || 'Sistema',
      producto: m.producto ? {
        id: m.producto.id,
        nombre: m.producto.nombre,
        codigoBarras: m.producto.codigoBarras,
      } : null,
    }));

    return {
      loteId,
      numeroLote,
      historial,
    };
  }

  private determinarTipo(movimiento: MovimientoAlmacen): string {
    if (movimiento.almacenOrigen === null && movimiento.almacenDestino === 1) {
      return 'ENTRADA';
    }
    if (movimiento.almacenDestino === 2 && movimiento.almacenOrigen === 1) {
      return 'TRANSFERENCIA_BODEGA_VENTAS';
    }
    if (movimiento.almacenDestino === 3) {
      return 'SALIDA_MERMAS';
    }
    if (movimiento.almacenDestino === 4) {
      return 'SALIDA_CADUCADOS';
    }
    if (movimiento.almacenDestino === 5) {
      return 'SALIDA_DONACION';
    }
    if (movimiento.almacenDestino === 6) {
      return 'SALIDA_DESTRUCCION';
    }
    return 'TRANSFERENCIA';
  }
}