import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laboratorio } from './entities/laboratorio.entity';
import { CreateLaboratorioDto } from './dto/create-laboratorio.dto';
import { UpdateLaboratorioDto } from './dto/update-laboratorio.dto';

@Injectable()
export class LaboratoriosService {
  constructor(
    @InjectRepository(Laboratorio)
    private laboratoriosRepository: Repository<Laboratorio>,
  ) {}

  async create(
    createLaboratorioDto: CreateLaboratorioDto,
  ): Promise<Laboratorio> {
    const existingLaboratorio = await this.laboratoriosRepository.findOne({
      where: { nombre: createLaboratorioDto.nombre },
    });

    if (existingLaboratorio) {
      throw new ConflictException('Laboratorio with this name already exists');
    }

    const laboratorio =
      this.laboratoriosRepository.create(createLaboratorioDto);
    return this.laboratoriosRepository.save(laboratorio);
  }

  async findAll(): Promise<Laboratorio[]> {
    return this.laboratoriosRepository.find();
  }

  async findOne(id: string): Promise<Laboratorio> {
    const laboratorio = await this.laboratoriosRepository.findOne({
      where: { id },
    });
    if (!laboratorio) {
      throw new NotFoundException(`Laboratorio with ID ${id} not found`);
    }
    return laboratorio;
  }

  async update(
    id: string,
    updateLaboratorioDto: UpdateLaboratorioDto,
  ): Promise<Laboratorio> {
    const laboratorio = await this.findOne(id);
    Object.assign(laboratorio, updateLaboratorioDto);
    return this.laboratoriosRepository.save(laboratorio);
  }

  async remove(id: string): Promise<void> {
    const laboratorio = await this.findOne(id);
    await this.laboratoriosRepository.remove(laboratorio);
  }
}
