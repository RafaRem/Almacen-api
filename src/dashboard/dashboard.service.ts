import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { Venta } from '../ventas/entities/venta.entity'
import { Cliente } from '../clientes/entities/cliente.entity'
import { Producto } from '../productos/entities/producto.entity'
import { Proveedor } from '../proveedores/entities/proveedor.entity'
import { User } from '../users/entities/user.entity'
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity'
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum'

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name)

  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Proveedor)
    private proveedoresRepository: Repository<Proveedor>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
  ) {}

  async getSummary(user: User) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const esAdmin = user.tipo === 'admin'
    const userId = esAdmin ? undefined : user.id

    const [ventasHoy, clientesActivos, productosTotales, proveedores, stockBajo, ventasRecientes, tendenciaVentas] =
      await Promise.all([
        this.getVentasHoy(hoy, userId),
        this.clientesRepository.count({ where: { statusId: 1 } }),
        this.productosRepository.count({ where: { statusId: 1 } }),
        this.proveedoresRepository.count({ where: { statusId: 1 } }),
        this.getStockBajo(),
        this.getVentasRecientes(userId),
        this.getTendenciaVentas(7, userId),
      ])

    return {
      ventasHoy,
      clientesActivos,
      productosTotales,
      proveedores,
      stockBajo,
      ventasRecientes,
      tendenciaVentas,
    }
  }

  private async getVentasHoy(hoy: Date, userId?: string) {
    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const where: any = {
      createdAt: Between(hoy, manana),
      statusId: 1,
    }
    if (userId) where.usuarioId = userId

    const ventas = await this.ventasRepository.find({ where })

    const total = ventas.reduce((sum, v) => sum + Number(v.total), 0)
    return { count: ventas.length, total }
  }

  private async getStockBajo(): Promise<number> {
    const results = await this.inventarioRepository
      .createQueryBuilder('inv')
      .leftJoin('inv.producto', 'producto')
      .select(['SUM(inv.cantidadActual) AS stockTotal'])
      .where('inv.almacenTipo = :almacenTipo', { almacenTipo: AlmacenTipo.VENTAS })
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .groupBy('inv.productoId')
      .addGroupBy('producto.stockMinimo')
      .having('SUM(inv.cantidadActual) <= COALESCE("producto"."stockMinimo", 10)')
      .getRawMany()

    return results.length
  }

  private async getVentasRecientes(userId?: string) {
    const where: any = { statusId: 1 }
    if (userId) where.usuarioId = userId

    const ventas = await this.ventasRepository.find({
      relations: ['cliente', 'usuario'],
      where,
      order: { createdAt: 'DESC' },
      take: 5,
    })

    return ventas.map((v) => ({
      id: v.id,
      folio: v.folio,
      fecha: v.createdAt,
      cliente: v.cliente
        ? `${v.cliente.nombre} ${v.cliente.apellidoPaterno || ''} ${v.cliente.apellidoMaterno || ''}`.trim()
        : 'Mostrador',
      total: Number(v.total),
      vendedor: v.usuario?.username || 'N/A',
    }))
  }

  private async getTendenciaVentas(dias: number, userId?: string) {
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    const inicio = new Date(hoy)
    inicio.setDate(inicio.getDate() - dias + 1)
    inicio.setHours(0, 0, 0, 0)

    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .select([
        "DATE(venta.createdAt) AS fecha",
        'SUM(venta.total) AS total',
        'COUNT(venta.id) AS cantidad',
      ])
      .where('venta.createdAt BETWEEN :inicio AND :hoy', { inicio, hoy })
      .andWhere('venta.statusId = :statusId', { statusId: 1 })

    if (userId) {
      query.andWhere('venta.usuarioId = :userId', { userId })
    }

    const results = await query
      .groupBy('DATE(venta.createdAt)')
      .orderBy('fecha', 'ASC')
      .getRawMany()

    const map = new Map<string, { total: number; cantidad: number }>()
    for (const r of results) {
      const fecha = r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : String(r.fecha)
      map.set(fecha, { total: Number(r.total), cantidad: Number(r.cantidad) })
    }

    const tendencia: { fecha: string; total: number; cantidad: number }[] = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const data = map.get(key) || { total: 0, cantidad: 0 }
      tendencia.push({ fecha: key, total: data.total, cantidad: data.cantidad })
    }

    return tendencia
  }
}
