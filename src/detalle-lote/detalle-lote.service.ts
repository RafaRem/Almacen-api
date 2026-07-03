import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetalleLote } from './entities/detalle-lote.entity';

@Injectable()
export class DetalleLoteService {
  constructor(
    @InjectRepository(DetalleLote)
    private detalleLoteRepository: Repository<DetalleLote>,
  ) {}

  async findAll(): Promise<DetalleLote[]> {
    return this.detalleLoteRepository.find({
      relations: ['producto', 'lote'],
    });
  }

  async findOne(id: string): Promise<DetalleLote | null> {
    return this.detalleLoteRepository.findOne({
      where: { id },
      relations: ['producto', 'lote'],
    });
  }

  async findByProducto(productoId: string): Promise<DetalleLote[]> {
    return this.detalleLoteRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
    });
  }

  async findByLote(loteId: string): Promise<DetalleLote[]> {
    return this.detalleLoteRepository.find({
      where: { loteId },
      relations: ['producto', 'lote'],
    });
  }

  async create(data: Partial<DetalleLote>): Promise<DetalleLote> {
    const detalleLote = this.detalleLoteRepository.create(data);
    return this.detalleLoteRepository.save(detalleLote);
  }

  async update(
    id: string,
    data: Partial<DetalleLote>,
  ): Promise<DetalleLote | null> {
    await this.detalleLoteRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.detalleLoteRepository.delete(id);
  }
}
