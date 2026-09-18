import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CorteCaja, CorteCajaStatus } from './entities/corte-caja.entity';
import { CorteCajaVenta } from './entities/corte-caja-venta.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { ResumenCorteCajaDto, VentaDelCorteDto } from './dto/corte-caja.dto';

@Injectable()
export class CorteCajaService {
  private readonly logger = new Logger(CorteCajaService.name);

  constructor(
    @InjectRepository(CorteCaja)
    private readonly corteCajaRepository: Repository<CorteCaja>,
    @InjectRepository(CorteCajaVenta)
    private readonly corteCajaVentaRepository: Repository<CorteCajaVenta>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    private readonly dataSource: DataSource,
  ) {}

  async getCorteActivo(usuarioId: string): Promise<CorteCaja | null> {
    return this.corteCajaRepository.findOne({
      where: {
        usuarioId,
        status: CorteCajaStatus.ABIERTA,
      },
      order: { fechaApertura: 'DESC' },
    });
  }

  async aperturarCaja(usuarioId: string): Promise<CorteCaja> {
    const existente = await this.getCorteActivo(usuarioId);
    if (existente) {
      throw new BadRequestException('Ya existe un corte de caja abierto para este usuario');
    }

    const corte = this.corteCajaRepository.create({
      usuarioId,
      fechaApertura: new Date(),
      status: CorteCajaStatus.ABIERTA,
    });

    return this.corteCajaRepository.save(corte);
  }

  async cerrarCaja(corteId: string, usuarioId: string): Promise<CorteCaja> {
    const corte = await this.corteCajaRepository.findOne({
      where: { id: corteId },
    });

    if (!corte) {
      throw new NotFoundException('Corte de caja no encontrado');
    }

    if (corte.usuarioId !== usuarioId) {
      throw new BadRequestException('Este corte no pertenece al usuario');
    }

    if (corte.status === CorteCajaStatus.CERRADA) {
      throw new BadRequestException('Este corte ya está cerrado');
    }

    corte.fechaCierre = new Date();
    corte.status = CorteCajaStatus.CERRADA;

    return this.corteCajaRepository.save(corte);
  }

  async getVentasDelCorte(corteId: string): Promise<VentaDelCorteDto[]> {
    const ventas = await this.ventaRepository
      .createQueryBuilder('v')
      .leftJoin('corte_caja_venta', 'ccv', 'ccv.venta_id = v.id AND ccv.corte_caja_id = :corteId', { corteId })
      .leftJoin('clientes', 'cl', 'cl.id = v.clienteid')
      .select([
        'v.id as id',
        'v.folio as folio',
        'v.total as total',
        'v.metodopago as metodopago',
        'v.createdat as createdat',
        "COALESCE(CONCAT(cl.nombre, ' ', cl.\"apellidoPaterno\", ' ', cl.\"apellidoMaterno\"), 'Cliente General') as \"clienteNombre\"",
      ])
      .where('ccv.id IS NOT NULL')
      .orderBy('v.createdat', 'DESC')
      .getRawMany();

    return ventas.map((v) => ({
      id: v.id,
      folio: v.folio,
      total: Number(v.total),
      metodopago: v.metodopago,
      createdat: v.createdat,
      clienteNombre: v.clienteNombre,
    }));
  }

  async getResumenCorte(corteId: string): Promise<ResumenCorteCajaDto> {
    const ventas = await this.getVentasDelCorte(corteId);

    const desgloseMetodosPago: Record<string, { total: number; cantidad: number }> = {};

    for (const venta of ventas) {
      if (!desgloseMetodosPago[venta.metodopago]) {
        desgloseMetodosPago[venta.metodopago] = { total: 0, cantidad: 0 };
      }
      desgloseMetodosPago[venta.metodopago].total += venta.total;
      desgloseMetodosPago[venta.metodopago].cantidad += 1;
    }

    return {
      totalVentas: ventas.reduce((sum, v) => sum + v.total, 0),
      cantidadVentas: ventas.length,
      desgloseMetodosPago: Object.entries(desgloseMetodosPago).map(([metodoPago, data]) => ({
        metodoPago,
        total: data.total,
        cantidad: data.cantidad,
      })),
    };
  }

  async vincularVentaACorte(
    ventaId: string,
    usuarioId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const corteCajaRepo = manager
      ? manager.getRepository(CorteCaja)
      : this.corteCajaRepository;

    const ventaRepo = manager
      ? manager.getRepository(CorteCajaVenta)
      : this.corteCajaVentaRepository;

    const corte = await corteCajaRepo.findOne({
      where: { usuarioId, status: CorteCajaStatus.ABIERTA },
      order: { fechaApertura: 'DESC' },
    });

    if (!corte) {
      this.logger.warn(`No hay corte de caja activo para usuario ${usuarioId}, venta ${ventaId} no vinculada`);
      return;
    }

    const existente = await ventaRepo.findOne({
      where: { ventaId },
    });

    if (existente) {
      return;
    }

    const link = ventaRepo.create({
      corteCajaId: corte.id,
      ventaId,
    });

    await ventaRepo.save(link);
  }

  async getHistorialCortes(
    usuarioId: string,
    limit = 10,
    filtroUsuarioId?: string,
  ): Promise<CorteCaja[]> {
    const where: any = {};
    if (filtroUsuarioId) {
      where.usuarioId = filtroUsuarioId;
    } else {
      where.usuarioId = usuarioId;
    }
    return this.corteCajaRepository.find({
      where,
      order: { fechaApertura: 'DESC' },
      take: limit,
    });
  }
}
