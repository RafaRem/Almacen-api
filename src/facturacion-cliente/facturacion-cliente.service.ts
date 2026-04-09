import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';
import { FacturacionCliente } from './entities/facturacion-cliente.entity';

export class CreateFacturacionClienteDto {
  @IsString()
  @IsNotEmpty()
  rfc: string;

  @IsString()
  @IsOptional()
  razonSocial?: string;

  @IsEmail()
  @IsOptional()
  correo?: string;

  @IsNumber()
  @IsOptional()
  regimenFiscalId?: number;

  @IsString()
  @IsOptional()
  usoCfdi?: string;

  @IsNumber()
  @IsOptional()
  statusId?: number;
}

@Injectable()
export class FacturacionClienteService {
  constructor(
    @InjectRepository(FacturacionCliente)
    private readonly facturacionRepository: Repository<FacturacionCliente>,
  ) {}

  async findByCliente(clienteId: string): Promise<FacturacionCliente | null> {
    return this.facturacionRepository.findOne({
      where: { clienteId },
      relations: ['regimenFiscal'],
    });
  }

  async create(clienteId: string, createDto: CreateFacturacionClienteDto): Promise<FacturacionCliente> {
    const existente = await this.findByCliente(clienteId);
    if (existente) {
      Object.assign(existente, createDto);
      return this.facturacionRepository.save(existente);
    }

    const facturacion = this.facturacionRepository.create({
      ...createDto,
      clienteId,
    });
    return this.facturacionRepository.save(facturacion);
  }

  async update(clienteId: string, updateDto: Partial<CreateFacturacionClienteDto>): Promise<FacturacionCliente> {
    const facturacion = await this.findByCliente(clienteId);
    if (!facturacion) {
      throw new NotFoundException(`Facturación para cliente ${clienteId} no encontrada`);
    }
    Object.assign(facturacion, updateDto);
    return this.facturacionRepository.save(facturacion);
  }

  async delete(clienteId: string): Promise<void> {
    const result = await this.facturacionRepository.delete({ clienteId });
    if (result.affected === 0) {
      throw new NotFoundException(`Facturación para cliente ${clienteId} no encontrada`);
    }
  }

  async findOne(id: string): Promise<FacturacionCliente | null> {
    return this.facturacionRepository.findOne({
      where: { id },
      relations: ['regimenFiscal'],
    });
  }
}