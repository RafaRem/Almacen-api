import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNumber, IsOptional } from 'class-validator';
import { Credito } from './entities/credito.entity';

export class CreateCreditoDto {
  @IsNumber()
  limite: number;

  @IsNumber()
  @IsOptional()
  saldoActual?: number;

  @IsNumber()
  @IsOptional()
  idStatus?: number;

  @IsNumber()
  @IsOptional()
  fechaDeCorte?: number;
}

@Injectable()
export class CreditosService {
  constructor(
    @InjectRepository(Credito)
    private readonly creditoRepository: Repository<Credito>,
  ) {}

  async findByCliente(clienteId: string): Promise<Credito | null> {
    return this.creditoRepository.findOne({
      where: { clienteId },
    });
  }

  async create(
    clienteId: string,
    createDto: CreateCreditoDto,
  ): Promise<Credito> {
    const existente = await this.findByCliente(clienteId);
    if (existente) {
      Object.assign(existente, createDto);
      return this.creditoRepository.save(existente);
    }

    const credito = this.creditoRepository.create({
      ...createDto,
      clienteId,
      saldoActual: createDto.saldoActual ?? 0,
      idStatus: createDto.idStatus ?? 1,
      fechaDeCorte: createDto.fechaDeCorte ?? 15,
    });
    return this.creditoRepository.save(credito);
  }

  async update(
    clienteId: string,
    updateDto: Partial<CreateCreditoDto>,
  ): Promise<Credito> {
    const credito = await this.findByCliente(clienteId);
    if (!credito) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }
    Object.assign(credito, updateDto);
    return this.creditoRepository.save(credito);
  }

  async usarCredito(clienteId: string, monto: number): Promise<Credito> {
    const credito = await this.findByCliente(clienteId);
    if (!credito) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }

    const disponible = Number(credito.limite) - Number(credito.saldoActual);
    if (monto > disponible) {
      throw new Error('El monto excede el crédito disponible');
    }

    credito.saldoActual = Number(credito.saldoActual) + monto;
    return this.creditoRepository.save(credito);
  }

  async getDisponible(clienteId: string): Promise<number> {
    const credito = await this.findByCliente(clienteId);
    if (!credito) return 0;
    return Number(credito.limite) - Number(credito.saldoActual);
  }

  async delete(clienteId: string): Promise<void> {
    const result = await this.creditoRepository.delete({ clienteId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }
  }
}
