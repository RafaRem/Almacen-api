import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Telefono } from './entities/telefono.entity';
import type { TelefonoTipo } from './entities/telefono.entity';

export class CreateTelefonoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['telefono', 'celular'])
  tipo: TelefonoTipo;

  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsOptional()
  statusId?: number;
}

@Injectable()
export class TelefonosService {
  constructor(
    @InjectRepository(Telefono)
    private readonly telefonoRepository: Repository<Telefono>,
  ) {}

  async findByCliente(clienteId: string): Promise<Telefono[]> {
    return this.telefonoRepository.find({
      where: { clienteId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    clienteId: string,
    createTelefonoDto: CreateTelefonoDto,
  ): Promise<Telefono> {
    const telefono = this.telefonoRepository.create({
      ...createTelefonoDto,
      clienteId,
    });
    return this.telefonoRepository.save(telefono);
  }

  async createMany(
    clienteId: string,
    telefonos: CreateTelefonoDto[],
  ): Promise<Telefono[]> {
    const created = telefonos.map((tel) =>
      this.telefonoRepository.create({
        ...tel,
        clienteId,
      }),
    );
    return this.telefonoRepository.save(created);
  }

  async update(
    id: string,
    updateTelefonoDto: Partial<CreateTelefonoDto>,
  ): Promise<Telefono> {
    const telefono = await this.telefonoRepository.findOne({ where: { id } });
    if (!telefono) {
      throw new NotFoundException(`Teléfono con ID ${id} no encontrado`);
    }
    Object.assign(telefono, updateTelefonoDto);
    return this.telefonoRepository.save(telefono);
  }

  async delete(id: string): Promise<void> {
    const result = await this.telefonoRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Teléfono con ID ${id} no encontrado`);
    }
  }

  async deleteByCliente(clienteId: string): Promise<void> {
    await this.telefonoRepository.delete({ clienteId });
  }
}
