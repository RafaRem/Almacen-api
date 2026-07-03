import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
  ) {}

  async create(createLoteDto: CreateLoteDto): Promise<Lote> {
    const existingLote = await this.lotesRepository.findOne({
      where: { numeroLote: createLoteDto.numeroLote },
    });

    if (existingLote) {
      throw new ConflictException('Lote with this numeroLote already exists');
    }

    if (createLoteDto.fechaCaducidad) {
      const fecha = new Date(createLoteDto.fechaCaducidad);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha <= hoy) {
        throw new BadRequestException(
          'La fecha de caducidad debe ser posterior a hoy',
        );
      }
    }

    const lote = this.lotesRepository.create(createLoteDto);
    return this.lotesRepository.save(lote);
  }

  async findAll(): Promise<Lote[]> {
    return this.lotesRepository.find({
      relations: [
        'laboratorio',
        'inventarioAlmacen',
        'inventarioAlmacen.producto',
      ],
    });
  }

  async findOne(id: string): Promise<Lote> {
    const lote = await this.lotesRepository.findOne({
      where: { id },
      relations: ['laboratorio'],
    });
    if (!lote) {
      throw new NotFoundException(`Lote with ID ${id} not found`);
    }
    return lote;
  }

  async findByProducto(productoId: string): Promise<Lote[]> {
    const inventarios = await this.inventarioRepository.find({
      where: { productoId },
      relations: ['lote', 'lote.laboratorio'],
    });
    return inventarios.map((inv) => inv.lote).filter(Boolean);
  }

  async update(id: string, updateLoteDto: UpdateLoteDto): Promise<Lote> {
    const lote = await this.findOne(id);
    Object.assign(lote, updateLoteDto);
    return this.lotesRepository.save(lote);
  }

  async remove(id: string): Promise<void> {
    const lote = await this.findOne(id);
    await this.lotesRepository.remove(lote);
  }
}
