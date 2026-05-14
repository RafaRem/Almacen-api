import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between, ILike } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

export interface VentasPorClienteFilters {
  clienteNombre?: string;
  fechaFrom?: string;
  fechaTo?: string;
}

export interface KardexInventarioFilters {
  productoNombre?: string;
  clienteNombre?: string;
  folioVenta?: string;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    @InjectRepository(DocumentoCliente)
    private documentosRepository: Repository<DocumentoCliente>,
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepository: Repository<DetalleVenta>,
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
  ) {}

  async getVentasPorCliente(filters?: VentasPorClienteFilters): Promise<any[]> {
    const queryBuilder = this.detallesRepository
      .createQueryBuilder('detalle')
      .leftJoin('detalle.venta', 'venta')
      .leftJoin('venta.cliente', 'cliente')
      .leftJoin('detalle.producto', 'producto')
      .select([
        'detalle.cantidad AS cantidad',
        'detalle.preciounitario AS precioUnitario',
        'detalle.subtotal AS subtotal',
        'venta.folio AS folioVenta',
        'venta.createdAt AS fechaVenta',
        'cliente.nombre AS clienteNombre',
        'producto.nombre AS productoNombre',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 });

    if (filters?.clienteNombre) {
      queryBuilder.andWhere(
        '(LOWER(cliente.nombre) LIKE LOWER(:clienteNombre) OR cliente.nombre IS NULL)',
        { clienteNombre: `%${filters.clienteNombre}%` },
      );
    }

    if (filters?.fechaFrom) {
      queryBuilder.andWhere('DATE(venta.createdAt) >= :fechaFrom', {
        fechaFrom: filters.fechaFrom,
      });
    }

    if (filters?.fechaTo) {
      queryBuilder.andWhere('DATE(venta.createdAt) <= :fechaTo', {
        fechaTo: filters.fechaTo,
      });
    }

    const resultados = await queryBuilder
      .orderBy('venta.createdAt', 'DESC')
      .getRawMany();

    return resultados.map((r) => ({
      nombreCliente: r.clienteNombre || 'Mostrador',
      folioVenta: r.folioVenta,
      fechaVenta: r.fechaVenta,
      producto: r.productoNombre,
      cantidad: parseInt(r.cantidad, 10),
      precioVenta: parseFloat(r.precioUnitario),
      total: parseFloat(r.precioUnitario) * parseInt(r.cantidad, 10),
    }));
  }

  async getKardexInventario(filters?: KardexInventarioFilters): Promise<any[]> {
    const queryBuilder = this.detallesRepository
      .createQueryBuilder('detalle')
      .leftJoin('detalle.venta', 'venta')
      .leftJoin('venta.cliente', 'cliente')
      .leftJoin('detalle.producto', 'producto')
      .leftJoin('detalle.lote', 'lote')
      .select([
        'venta.folio AS folioVenta',
        'venta.createdAt AS fechaVenta',
        'cliente.nombre AS clienteNombre',
        'producto.nombre AS productoNombre',
        'lote.numeroLote AS numeroLote',
        'detalle.cantidad AS cantidadVenta',
        'detalle.subtotal AS subtotal',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 });

    if (filters?.productoNombre) {
      queryBuilder.andWhere('LOWER(producto.nombre) LIKE LOWER(:productoNombre)', {
        productoNombre: `%${filters.productoNombre}%`,
      });
    }

    if (filters?.clienteNombre) {
      queryBuilder.andWhere(
        '(LOWER(cliente.nombre) LIKE LOWER(:clienteNombre) OR cliente.nombre IS NULL)',
        { clienteNombre: `%${filters.clienteNombre}%` },
      );
    }

    if (filters?.folioVenta) {
      queryBuilder.andWhere('venta.folio = :folioVenta', {
        folioVenta: parseInt(filters.folioVenta, 10),
      });
    }

    const resultados = await queryBuilder
      .orderBy('venta.createdAt', 'DESC')
      .getRawMany();

    return resultados.map((r) => ({
      folioVenta: r.folioVenta,
      nombreCliente: r.clienteNombre || 'Mostrador',
      nombreProducto: r.productoNombre,
      numeroLote: r.numeroLote,
      cantidadVenta: parseInt(r.cantidadVenta, 10),
      fecha_venta: r.fechaVenta,
      subtotal: parseFloat(r.subtotal),
    }));
  }

  async getProductosProximosCaducar(meses: number = 6): Promise<any[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setMonth(hoy.getMonth() + meses);

    return this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.producto', 'producto')
      .leftJoinAndSelect('inventario.lote', 'lote')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where('inventario.almacenTipo = :almacenTipo', {
        almacenTipo: AlmacenTipo.VENTAS,
      })
      .andWhere('lote.fechaCaducidad BETWEEN :hoy AND :fechaLimite', {
        hoy,
        fechaLimite,
      })
      .andWhere('lote.statusId = :statusId', { statusId: 1 })
      .andWhere('inventario.cantidadActual > 0')
      .orderBy('lote.fechaCaducidad', 'ASC')
      .getMany();
  }

  async getAlertasVigencia(dias: number = 30): Promise<DocumentoCliente[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + dias);

    return this.documentosRepository.find({
      where: {
        vigencia: Between(hoy, fechaLimite),
        statusId: 1,
      },
      order: { vigencia: 'ASC' },
    });
  }

  async getStockMinimo(): Promise<Producto[]> {
    return this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .leftJoinAndSelect('producto.lote', 'lote')
      .where('producto.stock <= producto.stockMinimo')
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .orderBy('producto.stock', 'ASC')
      .getMany();
  }

  async getProductosCaducados(): Promise<any[]> {
    const hoy = new Date();

    return this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.producto', 'producto')
      .leftJoinAndSelect('inventario.lote', 'lote')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where('inventario.almacenTipo = :almacenTipo', {
        almacenTipo: AlmacenTipo.VENTAS,
      })
      .andWhere('lote.fechaCaducidad <= :hoy', { hoy })
      .andWhere('lote.statusId = :statusId', { statusId: 1 })
      .orderBy('lote.fechaCaducidad', 'ASC')
      .getMany();
  }
}