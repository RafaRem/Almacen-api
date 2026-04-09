import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegimenFiscal } from './entities/regimen-fiscal.entity';

@Injectable()
export class RegimenFiscalService {
  constructor(
    @InjectRepository(RegimenFiscal)
    private readonly regimenFiscalRepository: Repository<RegimenFiscal>,
  ) {}

  async findAll(): Promise<RegimenFiscal[]> {
    return this.regimenFiscalRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findOne(id: number): Promise<RegimenFiscal> {
    const regimen = await this.regimenFiscalRepository.findOne({ where: { id } });
    if (!regimen) {
      throw new NotFoundException(`Régimen fiscal con ID ${id} no encontrado`);
    }
    return regimen;
  }

  async findByCode(code: string): Promise<RegimenFiscal> {
    const regimen = await this.regimenFiscalRepository.findOne({ where: { code } });
    if (!regimen) {
      throw new NotFoundException(`Régimen fiscal con código ${code} no encontrado`);
    }
    return regimen;
  }
}