import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';
import { CreateLoteDto } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
  ) {}

  async create(createLoteDto: CreateLoteDto): Promise<Lote> {
    const existingLote = await this.lotesRepository.findOne({
      where: { numeroLote: createLoteDto.numeroLote },
    });

    if (existingLote) {
      throw new ConflictException('Lote with this numeroLote already exists');
    }

    const lote = this.lotesRepository.create(createLoteDto);
    return this.lotesRepository.save(lote);
  }

  async findAll(): Promise<Lote[]> {
    return this.lotesRepository.find({ relations: ['laboratorio'] });
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
    return this.lotesRepository.find({
      where: { laboratorioId: productoId },
      relations: ['laboratorio'],
    });
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
