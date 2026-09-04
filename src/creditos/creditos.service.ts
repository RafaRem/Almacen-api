import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IsNumber, IsOptional } from 'class-validator';
import { Credito } from './entities/credito.entity';
import {
  MovimientoCredito,
  TipoMovimientoCredito,
} from './entities/movimiento-credito.entity';

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
    @InjectRepository(MovimientoCredito)
    private readonly movimientoRepository: Repository<MovimientoCredito>,
  ) {}

  async findByCliente(clienteId: string): Promise<Credito | null> {
    return this.creditoRepository.findOne({
      where: { clienteId },
    });
  }

  async create(
    clienteId: string,
    createDto: CreateCreditoDto,
    usuarioId?: string,
  ): Promise<Credito> {
    const existente = await this.findByCliente(clienteId);
    if (existente) {
      const anterior = {
        limite: Number(existente.limite),
        saldoActual: Number(existente.saldoActual),
      };
      Object.assign(existente, createDto);
      const saved = await this.creditoRepository.save(existente);
      await this.registrarMovimiento(
        clienteId,
        usuarioId,
        TipoMovimientoCredito.ACTUALIZACION,
        {
          limiteAnterior: anterior.limite,
          limiteNuevo: Number(saved.limite),
          saldoActualAnterior: anterior.saldoActual,
          saldoActualNuevo: Number(saved.saldoActual),
        },
      );
      return saved;
    }

    const credito = this.creditoRepository.create({
      ...createDto,
      clienteId,
      saldoActual: createDto.saldoActual ?? 0,
      idStatus: createDto.idStatus ?? 1,
      fechaDeCorte: createDto.fechaDeCorte ?? 15,
    });
    const saved = await this.creditoRepository.save(credito);
    await this.registrarMovimiento(
      clienteId,
      usuarioId,
      TipoMovimientoCredito.CREACION,
      {
        limiteNuevo: Number(saved.limite),
        saldoActualNuevo: Number(saved.saldoActual),
      },
    );
    return saved;
  }

  async update(
    clienteId: string,
    updateDto: Partial<CreateCreditoDto>,
    usuarioId?: string,
  ): Promise<Credito> {
    const credito = await this.findByCliente(clienteId);
    if (!credito) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }

    const anterior = {
      limite: Number(credito.limite),
      saldoActual: Number(credito.saldoActual),
    };
    Object.assign(credito, updateDto);
    const saved = await this.creditoRepository.save(credito);
    await this.registrarMovimiento(
      clienteId,
      usuarioId,
      TipoMovimientoCredito.ACTUALIZACION,
      {
        limiteAnterior: anterior.limite,
        limiteNuevo: Number(saved.limite),
        saldoActualAnterior: anterior.saldoActual,
        saldoActualNuevo: Number(saved.saldoActual),
      },
    );
    return saved;
  }

  async usarCredito(
    clienteId: string,
    monto: number,
    usuarioId?: string,
    manager?: EntityManager,
  ): Promise<Credito> {
    const disponible = await this.getDisponible(clienteId);
    console.log(`[usarCredito] Cliente: ${clienteId}, Monto: ${monto}, Disponible: ${disponible}`);
    if (monto > disponible) {
      throw new Error('El monto excede el crédito disponible');
    }

    const repo = manager ? manager.getRepository(Credito) : this.creditoRepository;
    const movimientoRepo = manager
      ? manager.getRepository(MovimientoCredito)
      : this.movimientoRepository;

    const credito = await (manager
      ? repo.findOne({ where: { clienteId } })
      : this.findByCliente(clienteId));
    console.log(`[usarCredito] Crédito encontrado:`, credito ? `ID: ${credito.id}` : 'NULL');
    if (!credito) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }

    const saldoAnterior = Number(credito.saldoActual);
    credito.saldoActual = saldoAnterior + monto;
    const saved = await repo.save(credito);
    console.log(`[usarCredito] Crédito actualizado. Nuevo saldo: ${saved.saldoActual}`);

    const movimiento = movimientoRepo.create({
      clienteId,
      usuarioId: usuarioId || null,
      tipo: TipoMovimientoCredito.USO,
      saldoActualAnterior: saldoAnterior,
      saldoActualNuevo: Number(saved.saldoActual),
      observaciones: `Uso de crédito por $${monto.toFixed(2)}`,
    });
    await movimientoRepo.save(movimiento);
    console.log(`[usarCredito] Movimiento de crédito guardado`);
    return saved;
  }

  async getDisponible(clienteId: string): Promise<number> {
    const credito = await this.findByCliente(clienteId);
    console.log(`[getDisponible] Cliente: ${clienteId}, Crédito encontrado:`, credito ? `ID: ${credito.id}, Limite: ${credito.limite}, Saldo: ${credito.saldoActual}, AFavor: ${credito.creditoAFavor}` : 'NULL');
    if (!credito) return 0;
    return Number(credito.limite) - Number(credito.saldoActual) + Number(credito.creditoAFavor || 0);
  }

  async getMovimientos(clienteId: string): Promise<MovimientoCredito[]> {
    return this.movimientoRepository.find({
      where: { clienteId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async delete(clienteId: string): Promise<void> {
    const result = await this.creditoRepository.delete({ clienteId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Crédito para cliente ${clienteId} no encontrado`,
      );
    }
  }

  private async registrarMovimiento(
    clienteId: string,
    usuarioId: string | undefined,
    tipo: TipoMovimientoCredito,
    datos: {
      limiteAnterior?: number;
      limiteNuevo?: number;
      saldoActualAnterior?: number;
      saldoActualNuevo?: number;
      observaciones?: string;
    },
  ): Promise<void> {
    const movimiento = this.movimientoRepository.create({
      clienteId,
      usuarioId: usuarioId || 'SYSTEM',
      tipo,
      limiteAnterior: datos.limiteAnterior,
      limiteNuevo: datos.limiteNuevo,
      saldoActualAnterior: datos.saldoActualAnterior,
      saldoActualNuevo: datos.saldoActualNuevo,
      observaciones: datos.observaciones,
    });
    await this.movimientoRepository.save(movimiento);
  }
}
