import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Domicilio } from './entities/domicilio.entity';

export class CreateDomicilioDto {
  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  numeroExt: string;

  @IsOptional()
  @IsString()
  numeroInt?: string;

  @IsString()
  @IsNotEmpty()
  localidad: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  codigoPostal: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  statusId?: number;
}

@Injectable()
export class DomiciliosService {
  constructor(
    @InjectRepository(Domicilio)
    private readonly domicilioRepository: Repository<Domicilio>,
  ) {}

  async findByCliente(clienteId: string): Promise<Domicilio | null> {
    return this.domicilioRepository.findOne({
      where: { clienteId },
    });
  }

  async create(
    clienteId: string,
    createDomicilioDto: CreateDomicilioDto,
  ): Promise<Domicilio> {
    const existente = await this.findByCliente(clienteId);
    if (existente) {
      Object.assign(existente, createDomicilioDto);
      return this.domicilioRepository.save(existente);
    }

    const domicilio = this.domicilioRepository.create({
      ...createDomicilioDto,
      clienteId,
    });
    return this.domicilioRepository.save(domicilio);
  }

  async update(
    clienteId: string,
    updateDomicilioDto: Partial<CreateDomicilioDto>,
  ): Promise<Domicilio> {
    const domicilio = await this.findByCliente(clienteId);
    if (!domicilio) {
      throw new NotFoundException(
        `Domicilio para cliente ${clienteId} no encontrado`,
      );
    }
    Object.assign(domicilio, updateDomicilioDto);
    return this.domicilioRepository.save(domicilio);
  }

  async delete(clienteId: string): Promise<void> {
    const result = await this.domicilioRepository.delete({ clienteId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Domicilio para cliente ${clienteId} no encontrado`,
      );
    }
  }
}
