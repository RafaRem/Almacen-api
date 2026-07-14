import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Between,
  ILike,
} from 'typeorm';
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

export interface ResumenClientesFilters {
  fechaFrom: string;
  fechaTo: string;
  clienteNombre?: string;
  categoriaClienteId?: string;
  rfc?: string;
  diasInactividad?: number;
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
      .leftJoin('detalle.lote', 'lote')
      .select([
        'detalle.cantidad AS cantidad',
        'detalle.preciounitario AS precio_unitario',
        'detalle.subtotal AS subtotal',
        'detalle.importebruto AS importe_bruto',
        'venta.folio AS folio_venta',
        'venta.createdat AS fecha_venta',
        'cliente.nombre AS cliente_nombre',
        'cliente.apellidoPaterno AS cliente_apellido_paterno',
        'cliente.apellidoMaterno AS cliente_apellido_materno',
        'producto.nombre AS producto_nombre',
        'lote.id AS lote_id',
        'detalle.productoId AS producto_id',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 });
    if (filters?.clienteNombre) {
      const term = `%${filters.clienteNombre}%`;
      if (filters.clienteNombre === 'VENTA MOSTRADOR') {
        queryBuilder.andWhere('cliente.id IS NULL');
      } else {
        queryBuilder.andWhere(
          `LOWER(CONCAT_WS(' ', cliente.nombre, cliente.apellidoPaterno, cliente.apellidoMaterno)) LIKE LOWER(:clienteNombre)`,
          { clienteNombre: term },
        );
      }
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

    if (resultados.length === 0) return [];

    const productoIds = [
      ...new Set(resultados.map((r) => r.producto_id).filter(Boolean)),
    ];

    const costosMap = new Map<
      string,
      { precioUnitarioLote: number; ivaCfdi: number }
    >();

    if (productoIds.length > 0) {
      const costos = await this.inventarioRepository
        .createQueryBuilder('ia')
        .select([
          'ia.productoId AS producto_id',
          'ia.loteId AS lote_id',
          'ia.precioUnitarioLote AS precio_unitario_lote',
          'ia.ivaCfdi AS iva_cfdi',
        ])
        .where('ia.almacenTipo = :alm', { alm: AlmacenTipo.VENTAS })
        .andWhere('ia.productoId IN (:...pids)', { pids: productoIds })
        .getRawMany();

      for (const c of costos) {
        costosMap.set(`${c.lote_id}::${c.producto_id}`, {
          precioUnitarioLote: parseFloat(c.precio_unitario_lote) || 0,
          ivaCfdi: parseFloat(c.iva_cfdi) || 0,
        });
      }
    }

    return resultados.map((r) => {
      const partes = [
        r.cliente_nombre,
        r.cliente_apellido_paterno,
        r.cliente_apellido_materno,
      ].filter(Boolean);
      const nombreCliente =
        partes.length > 0 ? partes.join(' ').trim() : 'Mostrador';
      const cantidad = parseInt(r.cantidad, 10) || 0;
      const subtotal = parseFloat(r.subtotal) || 0;
      const costoInfo = costosMap.get(`${r.lote_id}::${r.producto_id}`) || {
        precioUnitarioLote: 0,
        ivaCfdi: 0,
      };
      const ivaTasa = costoInfo.ivaCfdi;
      const costoUnitario = costoInfo.precioUnitarioLote;

      const precioNetoPorUnidad = cantidad > 0 ? subtotal / cantidad : 0;
      const precioSinIva =
        ivaTasa > 0
          ? precioNetoPorUnidad / (1 + ivaTasa / 100)
          : precioNetoPorUnidad;
      const utilidadLinea = (precioSinIva - costoUnitario) * cantidad;
      const margenPorcentaje =
        costoUnitario > 0
          ? ((precioSinIva - costoUnitario) / costoUnitario) * 100
          : 0;
      const ivaUnitario = precioNetoPorUnidad - precioSinIva;

      return {
        nombreCliente,
        folioVenta: r.folio_venta,
        fechaVenta: r.fecha_venta,
        producto: r.producto_nombre,
        cantidad,
        precioVenta: precioNetoPorUnidad,
        total: subtotal,
        costoUnitario,
        utilidad: Number(utilidadLinea.toFixed(2)),
        margenPorcentaje: Number(margenPorcentaje.toFixed(2)),
        ivaUnitario: Number(ivaUnitario.toFixed(2)),
      };
    });
  }

  async getResumenClientes(filters: ResumenClientesFilters): Promise<any> {
    if (!filters.fechaFrom || !filters.fechaTo) {
      throw new BadRequestException('fechaFrom y fechaTo son requeridos');
    }

    const qb = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoin('venta.cliente', 'cliente')
      .leftJoin('cliente.categoriaCliente', 'categoria')
      .select([
        'cliente.id AS cliente_id',
        "CONCAT(cliente.nombre, ' ', COALESCE(cliente.apellidoPaterno, ''), ' ', COALESCE(cliente.apellidoMaterno, '')) AS cliente_nombre",
        'cliente.rfc AS rfc',
        'categoria.nombre AS categoria_nombre',
        'COUNT(venta.id) AS cantidad_compras',
        'COALESCE(SUM(venta.total), 0) AS total_vendido',
        'COALESCE(SUM(venta.total) / NULLIF(COUNT(venta.id), 0), 0) AS ticket_promedio',
      ])
      .where('venta.statusId = :statusActivo', { statusActivo: 1 })
      .andWhere('venta.createdAt BETWEEN :fechaFrom AND :fechaTo', {
        fechaFrom: new Date(filters.fechaFrom + 'T00:00:00.000Z'),
        fechaTo: new Date(filters.fechaTo + 'T23:59:59.999Z'),
      })
      .groupBy(
        'cliente.id, cliente.nombre, cliente.apellidoPaterno, cliente.apellidoMaterno, cliente.rfc, categoria.nombre',
      );

    if (filters.clienteNombre) {
      const term = filters.clienteNombre.toLowerCase();
      qb.andWhere(
        `(LOWER(CONCAT(cliente.nombre, ' ', COALESCE(cliente.apellidoPaterno, ''), ' ', COALESCE(cliente.apellidoMaterno, ''))) LIKE :nombre OR (:esMostrador = true AND venta.clienteId IS NULL))`,
        {
          nombre: `%${term}%`,
          esMostrador: term === 'mostrador',
        },
      );
    }
    if (filters.rfc) {
      qb.andWhere('LOWER(cliente.rfc) LIKE :rfc', {
        rfc: `%${filters.rfc.toLowerCase()}%`,
      });
    }
    if (filters.categoriaClienteId) {
      qb.andWhere('cliente.categoriaClienteId = :catId', {
        catId: filters.categoriaClienteId,
      });
    }

    const resumen = await qb.orderBy('total_vendido', 'DESC').getRawMany();

    const MOSTRADOR_ID = '00000000-0000-0000-0000-000000000000';
    for (const row of resumen) {
      if (!row.cliente_id) {
        row.cliente_id = MOSTRADOR_ID;
        row.cliente_nombre = 'VENTA MOSTRADOR';
        row.rfc = 'XAXX010101000';
        row.categoria_nombre = 'Mostrador';
      }
    }

    if (resumen.length > 0) {
      const clientIds = resumen
        .filter((r) => r.cliente_id !== MOSTRADOR_ID)
        .map((r) => r.cliente_id);

      const ultimasCompras: any[] = [];

      if (clientIds.length > 0) {
        const comprasConId = await this.ventasRepository
          .createQueryBuilder('venta')
          .select([
            'venta.clienteId AS cliente_id',
            'MAX(venta.createdAt) AS ultima_compra',
          ])
          .where('venta.clienteId IN (:...clientIds)', { clientIds })
          .andWhere('venta.statusId = :statusActivo', { statusActivo: 1 })
          .groupBy('venta.clienteId')
          .getRawMany();
        ultimasCompras.push(...comprasConId);
      }

      const compraMostrador = await this.ventasRepository
        .createQueryBuilder('venta')
        .select(['MAX(venta.createdAt) AS ultima_compra'])
        .where('venta.clienteId IS NULL')
        .andWhere('venta.statusId = :statusActivo', { statusActivo: 1 })
        .getRawOne();

      if (compraMostrador?.ultima_compra) {
        ultimasCompras.push({
          cliente_id: MOSTRADOR_ID,
          ultima_compra: compraMostrador.ultima_compra,
        });
      }

      const ultimaCompraMap = new Map(
        ultimasCompras.map((u) => [u.cliente_id, u.ultima_compra]),
      );

      const ahora = new Date();
      for (const row of resumen) {
        const uc = ultimaCompraMap.get(row.cliente_id);
        row.ultima_compra = uc || null;
        row.dias_sin_comprar = uc
          ? Math.floor(
              (ahora.getTime() - new Date(uc).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;
      }
    }

    const totalCompras = resumen.reduce(
      (s, r) => s + Number(r.cantidad_compras),
      0,
    );
    const ventaTotal = resumen.reduce((s, r) => s + Number(r.total_vendido), 0);
    const clienteMayorCompra = resumen.reduce(
      (best, r) =>
        Number(r.total_vendido) > Number(best?.total_vendido || 0) ? r : best,
      null,
    );
    const clienteMasFrecuente = resumen.reduce(
      (best, r) =>
        Number(r.cantidad_compras) > Number(best?.cantidad_compras || 0)
          ? r
          : best,
      null,
    );
    const diasInact = filters.diasInactividad ?? 90;
    const clientesInactivos = resumen.filter(
      (r) => r.dias_sin_comprar !== null && r.dias_sin_comprar > diasInact,
    ).length;

    return {
      data: resumen.map((r) => ({
        clienteId: r.cliente_id,
        clienteNombre: r.cliente_nombre,
        rfc: r.rfc || 'N/A',
        categoriaNombre: r.categoria_nombre || 'Sin categoría',
        cantidadCompras: Number(r.cantidad_compras),
        totalVendido: Number(r.total_vendido),
        ticketPromedio: Number(r.ticket_promedio),
        ultimaCompra: r.ultima_compra,
        diasSinComprar: r.dias_sin_comprar,
      })),
      indicadores: {
        clientesConCompras: resumen.length,
        totalCompras,
        ventaTotal,
        ticketPromedioGlobal: totalCompras > 0 ? ventaTotal / totalCompras : 0,
        clienteMayorCompra: clienteMayorCompra
          ? {
              nombre: clienteMayorCompra.cliente_nombre,
              totalVendido: Number(clienteMayorCompra.total_vendido),
            }
          : null,
        clienteMasFrecuente: clienteMasFrecuente
          ? {
              nombre: clienteMasFrecuente.cliente_nombre,
              cantidadCompras: Number(clienteMasFrecuente.cantidad_compras),
            }
          : null,
        clientesInactivos,
        diasInactividad: diasInact,
      },
    };
  }

  async getKardexInventario(filters?: KardexInventarioFilters): Promise<any[]> {
    const queryBuilder = this.detallesRepository
      .createQueryBuilder('detalle')
      .leftJoin('detalle.venta', 'venta')
      .leftJoin('detalle.producto', 'producto')
      .leftJoin('detalle.lote', 'lote')
      .select([
        'producto.id AS producto_id',
        'producto.nombre AS producto_nombre',
        'lote.numeroLote AS numero_lote',
        'SUM(detalle.cantidad) AS total_cantidad_vendida',
      ])
      .where('venta.statusId = :statusId', { statusId: 1 })
      .groupBy('producto.id, producto.nombre, lote.numeroLote');
    if (filters?.productoNombre) {
      queryBuilder.andWhere(
        'LOWER(producto.nombre) LIKE LOWER(:productoNombre)',
        {
          productoNombre: `%${filters.productoNombre}%`,
        },
      );
    }
    if (filters?.folioVenta) {
      const folioNum = parseInt(filters.folioVenta, 10);
      if (!isNaN(folioNum)) {
        queryBuilder.andWhere('venta.folio = :folioVenta', {
          folioVenta: folioNum,
        });
      }
    }
    const resultados = await queryBuilder
      .orderBy('producto.nombre', 'ASC')
      .getRawMany();
    return resultados.map((r) => ({
      productoId: r.producto_id,
      nombreProducto: r.producto_nombre,
      numeroLote: r.numero_lote,
      totalCantidadVendida: parseInt(r.total_cantidad_vendida, 10) || 0,
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
    const inventarios = await this.inventarioRepository
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.lote', 'lote')
      .where('inventario.productoId = :productoId', { productoId })
      .andWhere('inventario.almacenTipo = :almacenTipo', {
        almacenTipo: AlmacenTipo.VENTAS,
      })
      .getMany();

    const stockTotal = inventarios.reduce(
      (sum, inv) => sum + Number(inv.cantidadActual || 0),
      0,
    );

    const precioMap = new Map<
      string,
      { precioUnitarioLote: number; precioVenta: number; ivaCfdi: number }
    >();
    for (const inv of inventarios) {
      precioMap.set(inv.loteId, {
        precioUnitarioLote: inv.precioUnitarioLote || 0,
        precioVenta: inv.precioVenta || 0,
        ivaCfdi: (inv as any).ivaCfdi || (inv as any).ivaPersonalizado || 0,
      });
    }

    const primerInventario = inventarios.length > 0 ? inventarios[0] : null;

    const detalles = await this.detallesRepository
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.venta', 'venta')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('detalle.lote', 'lote')
      .where('detalle.productoId = :productoId', { productoId })
      .andWhere('venta.statusId = :statusId', { statusId: 1 })
      .orderBy('venta.createdAt', 'DESC')
      .getMany();
    const trazabilidad = detalles.map((d) => {
      const precios = precioMap.get(d.loteId) ||
        precioMap.get(d.lote?.id) || {
          precioUnitarioLote: 0,
          ivaCfdi: 0,
        };
      const cantidad = d.cantidad || 0;
      const subtotal = Number(d.subtotal) || 0;
      const costoUnitario = precios.precioUnitarioLote;
      const ivaTasa = precios.ivaCfdi || 0;

      const precioNetoPorUnidad = cantidad > 0 ? subtotal / cantidad : 0;
      const precioSinIva =
        ivaTasa > 0
          ? precioNetoPorUnidad / (1 + ivaTasa / 100)
          : precioNetoPorUnidad;
      const utilidadLinea = (precioSinIva - costoUnitario) * cantidad;
      const margenLinea =
        costoUnitario > 0
          ? ((precioSinIva - costoUnitario) / costoUnitario) * 100
          : 0;
      const ivaUnitario = precioNetoPorUnidad - precioSinIva;

      return {
        folioVenta: d.venta?.folio,
        fechaVenta: d.venta?.createdAt,
        clienteNombre: d.venta?.cliente?.nombre || 'Mostrador',
        numeroLote: d.lote?.numeroLote,
        cantidad,
        precioUnitarioLote: costoUnitario,
        precioVenta: precioNetoPorUnidad,
        total: subtotal,
        utilidad: Number(utilidadLinea.toFixed(2)),
        margenPorcentaje: Number(margenLinea.toFixed(2)),
        ivaUnitario: Number(ivaUnitario.toFixed(2)),
      };
    });
    return {
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        laboratorio: producto.laboratorio?.nombre || 'N/A',
        stockMinimo: producto.stockMinimo,
        stockMaximo: producto.stockMaximo,
        stockActual: stockTotal,
      },
      precioUnitarioLote: primerInventario?.precioUnitarioLote || 0,
      precioVenta: primerInventario?.precioVenta || 0,
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

  async getAlertasVigencia(dias: number = 30): Promise<any[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + dias);
    const docs = await this.documentosRepository.find({
      relations: ['cliente'],
      where: {
        vigencia: Between(hoy, fechaLimite),
        statusId: 1,
      },
      order: { vigencia: 'ASC' },
    });
    return docs.map((d) => ({
      ...d,
      clienteNombre: d.cliente
        ? `${d.cliente.nombre} ${d.cliente.apellidoPaterno || ''} ${d.cliente.apellidoMaterno || ''}`.trim()
        : 'Mostrador',
      cliente: undefined,
    }));
  }

  async getStockMinimo(): Promise<any[]> {
    const results = await this.inventarioRepository
      .createQueryBuilder('inv')
      .leftJoin('inv.producto', 'producto')
      .leftJoin('inv.lote', 'lote')
      .leftJoin('producto.laboratorio', 'laboratorio')
      .select([
        'producto.id AS "id"',
        'producto.nombre AS "nombre"',
        'producto.codigoBarras AS "codigoBarras"',
        'producto.stockMinimo AS "stockMinimo"',
        'producto.stockMaximo AS "stockMaximo"',
        'laboratorio.nombre AS laboratorio',
        'SUM(inv.cantidadActual) AS "stockTotal"',
      ])
      .where('inv.almacenTipo = :almacenTipo', {
        almacenTipo: AlmacenTipo.VENTAS,
      })
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .groupBy(
        '"producto"."id", "producto"."nombre", "producto"."codigoBarras", "producto"."stockMinimo", "producto"."stockMaximo", "laboratorio"."nombre"',
      )
      .having('SUM(inv.cantidadActual) <= "producto"."stockMinimo"')
      .orderBy('"stockTotal"', 'ASC')
      .getRawMany();
    return results.map((r) => ({
      ...r,
      stockTotal: parseInt(r.stockTotal, 10) || 0,
    }));
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
