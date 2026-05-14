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
        'detalle.preciounitario AS precio_unitario',
        'detalle.subtotal AS subtotal',
        'venta.folio AS folio_venta',
        'venta.createdat AS fecha_venta',
        'cliente.nombre AS cliente_nombre',
        'producto.nombre AS producto_nombre',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 });

    if (filters?.clienteNombre) {
      queryBuilder.andWhere('LOWER(cliente.nombre) LIKE LOWER(:clienteNombre)', {
        clienteNombre: `%${filters.clienteNombre}%`,
      });
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
      nombreCliente: r.cliente_nombre || 'Mostrador',
      folioVenta: r.folio_venta,
      fechaVenta: r.fecha_venta,
      producto: r.producto_nombre,
      cantidad: parseInt(r.cantidad, 10),
      precioVenta: parseFloat(r.precio_unitario),
      total: parseFloat(r.precio_unitario) * parseInt(r.cantidad, 10),
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
        'detalle.id AS detalle_id',
        'producto.id AS producto_id',
        'producto.nombre AS producto_nombre',
        'lote.numeroLote AS numero_lote',
        'SUM(detalle.cantidad) AS total_cantidad_vendida',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 })
      .groupBy('detalle.id, producto.id, producto.nombre, lote.numeroLote');

    if (filters?.productoNombre) {
      queryBuilder.andWhere('LOWER(producto.nombre) LIKE LOWER(:productoNombre)', {
        productoNombre: `%${filters.productoNombre}%`,
      });
    }

    if (filters?.folioVenta) {
      queryBuilder.andWhere('venta.folio = :folioVenta', {
        folioVenta: parseInt(filters.folioVenta, 10),
      });
    }

    const resultados = await queryBuilder
      .orderBy('producto.nombre', 'ASC')
      .getRawMany();

    return resultados.map((r) => ({
      productoId: r.producto_id,
      nombreProducto: r.producto_nombre,
      numeroLote: r.numero_lote,
      totalCantidadVendida: parseInt(r.total_cantidad_vendida, 10),
    }));
  }

  async getKardexDetalleProducto(productoId: string): Promise<any> {
    const producto = await this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where('producto.id = :id', { id: productoId })
      .getOne();

    if (!producto) {
      return null;
    }

    const inventario = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.lote', 'lote')
      .where('inventario.productoId = :productoId', { productoId })
      .andWhere('inventario.almacenTipo = :almacenTipo', { almacenTipo: AlmacenTipo.VENTAS })
      .getOne();

    const trazabilidadRaw = await this.detallesRepository
      .createQueryBuilder('detalle')
      .leftJoin('detalle.venta', 'venta')
      .leftJoin('venta.cliente', 'cliente')
      .leftJoin('detalle.lote', 'lote')
      .select([
        'venta.folio AS folio_venta',
        'venta.createdat AS fecha_venta',
        'cliente.nombre AS cliente_nombre',
        'detalle.cantidad AS cantidad',
        'lote.numeroLote AS numero_lote',
        'inventario.precioUnitarioLote AS precio_unitario_lote',
        'inventario.precioVenta AS precio_venta',
        'detalle.subtotal AS subtotal',
      ])
      .leftJoin('inventario_almacen', 'inventario',
        'inventario.productoid = detalle.productoid AND inventario.loteid = detalle.loteid AND inventario.almacenTipo = :tipo',
        { tipo: AlmacenTipo.VENTAS })
      .where('detalle.productoId = :productoId', { productoId })
      .andWhere('venta.statusId = :statusId', { statusId: 1 })
      .orderBy('venta.createdAt', 'DESC')
      .getRawMany();

    const trazabilidad = trazabilidadRaw.map((v) => ({
      folioVenta: v.folio_venta,
      fechaVenta: v.fecha_venta,
      clienteNombre: v.cliente_nombre || 'Mostrador',
      numeroLote: v.numero_lote,
      cantidad: parseInt(v.cantidad, 10),
      precioUnitarioLote: parseFloat(v.precio_unitario_lote || 0),
      precioVenta: parseFloat(v.precio_venta || 0),
      total: parseFloat(v.precio_venta || 0) * parseInt(v.cantidad, 10),
    }));

    return {
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        laboratorio: producto.laboratorio?.nombre || 'N/A',
        stockMinimo: producto.stockMinimo,
        stockMaximo: producto.stockMaximo,
        stockActual: producto.stock,
      },
      precioUnitarioLote: inventario?.precioUnitarioLote || 0,
      precioVenta: inventario?.precioVenta || 0,
      trazabilidad,
    };
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