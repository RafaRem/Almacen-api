import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

@Injectable()
export class InventarioAlmacenService {
  constructor(
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
  ) {}

  async findAll(): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      relations: ['producto', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAlmacen(almacenTipo: AlmacenTipo): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      where: { almacenTipo },
      relations: ['producto', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProducto(productoId: string): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStockPorAlmacen(almacenTipo: AlmacenTipo): Promise<any[]> {
    const inventarios = await this.inventarioRepository.find({
      where: { almacenTipo },
      relations: ['producto', 'lote'],
    });

    const agrupado = new Map<string, any>();
    
    for (const inv of inventarios) {
      const key = inv.productoId;
      if (agrupado.has(key)) {
        agrupado.get(key).cantidadActual += Number(inv.cantidadActual);
        agrupado.get(key).lotes.push({
          loteId: inv.loteId,
          numeroLote: inv.lote?.numeroLote,
          precio: inv.lote?.precio,
          fechaCaducidad: inv.lote?.fechaCaducidad,
          cantidad: Number(inv.cantidadActual),
        });
      } else {
        agrupado.set(key, {
          productoId: inv.productoId,
          producto: inv.producto,
          cantidadActual: Number(inv.cantidadActual),
          lote: inv.lote,
          loteId: inv.loteId,
          ivaPersonalizado: inv.ivaPersonalizado,
          lotes: [{
            loteId: inv.loteId,
            numeroLote: inv.lote?.numeroLote,
            precio: inv.lote?.precio,
            fechaCaducidad: inv.lote?.fechaCaducidad,
            cantidad: Number(inv.cantidadActual),
          }],
        });
      }
    }

    return Array.from(agrupado.values());
  }

  async agregarStock(
    productoId: string,
    loteId: string,
    almacenTipo: AlmacenTipo,
    cantidad: number,
  ): Promise<InventarioAlmacen> {
    console.log('[agregarStock] Recibido:', { productoId, loteId, almacenTipo, cantidad });
    
    let inventario = await this.inventarioRepository.findOne({
      where: { productoId, loteId, almacenTipo },
    });

    console.log('[agregarStock] Inventario encontrado:', inventario);

    if (inventario) {
      const nuevaCantidad = Number(inventario.cantidadActual) + cantidad;
      console.log('[agregarStock] Sumando al existente:', { existente: inventario.cantidadActual, cantidad, nuevaCantidad });
      inventario.cantidadActual = nuevaCantidad;
    } else {
      console.log('[agregarStock] Creando nuevo registro');
      inventario = this.inventarioRepository.create({
        productoId,
        loteId,
        almacenTipo,
        cantidadActual: cantidad,
      });
    }

    const resultado = await this.inventarioRepository.save(inventario);
    console.log('[agregarStock] Guardado:', resultado);
    return resultado;
  }

  async reducirStockFIFO(
    productoId: string,
    cantidad: number,
    almacenTipoOrigen: AlmacenTipo,
    almacenTipoDestino?: AlmacenTipo | null,
  ): Promise<{ 
    успешно: boolean; 
    mensaje: string;
    lotesUtilizados: { loteId: string; numeroLote: string; cantidad: number; precio: number }[];
  }> {
    const inventarios = await this.inventarioRepository.find({
      where: { productoId, almacenTipo: almacenTipoOrigen },
      relations: ['lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    let totalDisponible = 0;
    for (const inv of inventarios) {
      totalDisponible += Number(inv.cantidadActual);
    }

    if (totalDisponible < cantidad) {
      return {
        успешно: false,
        mensaje: `Stock insuficiente. Disponible: ${totalDisponible}, Solicitado: ${cantidad}`,
        lotesUtilizados: [],
      };
    }

    const lotesUtilizados: { loteId: string; numeroLote: string; cantidad: number; precio: number }[] = [];
    let restante = cantidad;

    for (const inv of inventarios) {
      if (restante <= 0) break;

      const disponible = Number(inv.cantidadActual);
      const aTransferir = Math.min(disponible, restante);

      inv.cantidadActual -= aTransferir;
      await this.inventarioRepository.save(inv);

      if (almacenTipoDestino) {
        await this.agregarStock(productoId, inv.loteId, almacenTipoDestino, aTransferir);
      }

      lotesUtilizados.push({
        loteId: inv.loteId,
        numeroLote: inv.lote?.numeroLote || 'N/A',
        cantidad: aTransferir,
        precio: Number(inv.lote?.precio) || 0,
      });

      restante -= aTransferir;
    }

    const operacion = almacenTipoDestino ? `Transferido ${cantidad}` : `Vendido ${cantidad}`;

    return {
      успешно: true,
      mensaje: `${operacion} unidades usando FEPU`,
      lotesUtilizados,
    };
  }

  async moverStock(
    productoId: string,
    loteId: string,
    cantidad: number,
    almacenTipoOrigen: AlmacenTipo,
    almacenTipoDestino: AlmacenTipo,
  ): Promise<InventarioAlmacen> {
    console.log('[moverStock] === INICIO ===');
    console.log('[moverStock] Recibido:', { productoId, loteId, cantidad, almacenTipoOrigen, almacenTipoDestino });
    console.log('[moverStock] Tipos:', { 
      cantidadType: typeof cantidad, 
      almacenTipoOrigenType: typeof almacenTipoOrigen,
      almacenTipoDestinoType: typeof almacenTipoDestino 
    });
    
    const inventarioOrigen = await this.inventarioRepository.findOne({
      where: { productoId, loteId, almacenTipo: almacenTipoOrigen },
    });

    console.log('[moverStock] Inventario origen encontrado:', inventarioOrigen);
    console.log('[moverStock] inventarioOrigen.cantidadActual:', inventarioOrigen?.cantidadActual, 'tipo:', typeof inventarioOrigen?.cantidadActual);

    if (!inventarioOrigen) {
      console.log('[moverStock] ERROR: No se encontró inventario en origen');
      console.log('[moverStock] Query buscada:', { productoId, loteId, almacenTipo: almacenTipoOrigen });
      throw new BadRequestException('No se encontró inventario en el almacén de origen');
    }

    const stockActual = Number(inventarioOrigen.cantidadActual);
    console.log('[moverStock] Stock actual (parseado):', stockActual);
    
    if (stockActual < cantidad) {
      console.log('[moverStock] ERROR: Stock insuficiente', { disponible: stockActual, solicitado: cantidad });
      throw new BadRequestException(`Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`);
    }

    const nuevaCantidadOrigen = stockActual - cantidad;
    inventarioOrigen.cantidadActual = nuevaCantidadOrigen;
    console.log('[moverStock] Nueva cantidad origen:', nuevaCantidadOrigen);
    
    const savedOrigen = await this.inventarioRepository.save(inventarioOrigen);
    console.log('[moverStock] Guardado origen:', savedOrigen);

    console.log('[moverStock] Llamando agregarStock al destino:', { productoId, loteId, cantidad, almacenTipoDestino });
    const resultado = await this.agregarStock(productoId, loteId, almacenTipoDestino, cantidad);
    console.log('[moverStock] Resultado agregarStock:', resultado);
    console.log('[moverStock] === FIN ===');

    return resultado;
  }

  async moverStockBatch(
    items: { productoId: string; loteId: string; cantidad: number }[],
    almacenTipoOrigen: AlmacenTipo,
    almacenTipoDestino: AlmacenTipo,
  ): Promise<{ success: boolean; moved: number; errors: string[] }> {
    console.log('[moverStockBatch] Recibido:', { items, almacenTipoOrigen, almacenTipoDestino });
    const errors: string[] = [];
    let moved = 0;

    for (const item of items) {
      try {
        await this.moverStock(
          item.productoId,
          item.loteId,
          item.cantidad,
          almacenTipoOrigen,
          almacenTipoDestino,
        );
        moved++;
      } catch (error) {
        console.log('[moverStockBatch] ERROR en item:', item, error.message);
        errors.push(`Producto ${item.productoId} (Lote ${item.loteId}): ${error.message}`);
      }
    }

    console.log('[moverStockBatch] Resultado:', { moved, errors, success: errors.length === 0 });

    return {
      success: errors.length === 0,
      moved,
      errors,
    };
  }

  async getStockTotal(productoId: string, almacenTipo?: AlmacenTipo): Promise<number> {
    const where: any = { productoId };
    if (almacenTipo !== undefined) {
      where.almacenTipo = almacenTipo;
    }

    const inventarios = await this.inventarioRepository.find({ where });
    return inventarios.reduce((sum, inv) => sum + Number(inv.cantidadActual), 0);
  }

  async updateIvaPersonalizado(id: string, ivaPersonalizado: number): Promise<InventarioAlmacen> {
    const inventario = await this.inventarioRepository.findOne({ where: { id } });
    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }
    inventario.ivaPersonalizado = ivaPersonalizado;
    return this.inventarioRepository.save(inventario);
  }

  async debugFindByProductAndLote(productoId: string, loteId: string, almacenTipo: AlmacenTipo): Promise<any> {
    console.log('[debug] Query directa a BD:', { productoId, loteId, almacenTipo });
    console.log('[debug] almacenTipo es numero?', typeof almacenTipo, almacenTipo);
    
    const inventarios = await this.inventarioRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
    });
    
    console.log('[debug] Todos los inventarios para productoId:', inventarios);
    
    const filtrado = inventarios.filter(inv => 
      inv.loteId === loteId && inv.almacenTipo === almacenTipo
    );
    
    console.log('[debug] Filtrado por loteId y almacenTipo:', filtrado);
    
    return {
      productoId,
      loteId,
      almacenTipo,
      todosLosInventariosProducto: inventarios.map(inv => ({
        id: inv.id,
        loteId: inv.loteId,
        almacenTipo: inv.almacenTipo,
        cantidadActual: inv.cantidadActual,
        loteIdExactMatch: inv.loteId === loteId,
        almacenTipoExactMatch: inv.almacenTipo === almacenTipo
      })),
      filtrado
    };
  }

  async getCapasPorProducto(productoId: string): Promise<any> {
    const inventarios = await this.inventarioRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    if (inventarios.length === 0) {
      throw new NotFoundException('No se encontró inventario para este producto');
    }

    const producto = inventarios[0].producto;
    let totalStock = 0;
    let costoTotal = 0;

    const capas = inventarios.map(inv => {
      const cantidad = Number(inv.cantidadActual);
      const precio = Number(inv.lote?.precio) || 0;
      totalStock += cantidad;
      costoTotal += cantidad * precio;

      return {
        id: inv.id,
        loteId: inv.loteId,
        numeroLote: inv.lote?.numeroLote,
        fechaCaducidad: inv.lote?.fechaCaducidad,
        precio: precio,
        almacenTipo: inv.almacenTipo,
        cantidadActual: cantidad,
        costoTotal: cantidad * precio,
      };
    });

    return {
      productoId,
      producto: {
        id: producto?.id,
        nombre: producto?.nombre,
        codigoBarras: producto?.codigoBarras,
      },
      totalStock,
      costoTotal,
      capas,
    };
  }

  async verifyInventory(): Promise<any> {
    const productos = await this.productoRepository.find();
    const resultados: any[] = [];
    let consistentes = 0;
    let inconsistentes = 0;

    for (const producto of productos) {
      const inventarios = await this.inventarioRepository.find({
        where: { productoId: producto.id },
      });

      const stockInventario = inventarios.reduce(
        (sum, inv) => sum + Number(inv.cantidadActual),
        0,
      );
      const stockProducto = producto.stock || 0;
      const diferencia = stockInventario - stockProducto;

      const esConsistente = diferencia === 0;
      if (esConsistente) {
        consistentes++;
      } else {
        inconsistentes++;
      }

      resultados.push({
        productoId: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        stockProducto,
        stockInventario,
        diferencia,
        estado: esConsistente ? 'CONSISTENTE' : 'INCONSISTENTE',
        numeroCapas: inventarios.length,
      });
    }

    return {
      productos: resultados,
      resumen: {
        total: productos.length,
        consistentes,
        inconsistentes,
      },
    };
  }

  async syncInventory(): Promise<any> {
    const productos = await this.productoRepository.find();
    const correcciones: any[] = [];

    for (const producto of productos) {
      const inventarios = await this.inventarioRepository.find({
        where: { productoId: producto.id },
      });

      const stockInventario = inventarios.reduce(
        (sum, inv) => sum + Number(inv.cantidadActual),
        0,
      );

      if (producto.stock !== stockInventario) {
        const stockAnterior = producto.stock || 0;
        producto.stock = stockInventario;
        await this.productoRepository.save(producto);

        correcciones.push({
          productoId: producto.id,
          nombre: producto.nombre,
          stockAnterior,
          stockNuevo: stockInventario,
          diferencia: stockInventario - stockAnterior,
        });
      }
    }

    return {
      mensaje: 'Sincronización completada',
      correccionesRealizadas: correcciones.length,
      detalles: correcciones,
    };
  }

  async getProximosAVencer(dias: number = 60, almacenTipo?: AlmacenTipo): Promise<any> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const where: any = {};
    if (almacenTipo !== undefined) {
      where.almacenTipo = almacenTipo;
    }

    const inventarios = await this.inventarioRepository.find({
      where,
      relations: ['producto', 'lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    const productosFiltrados = inventarios.filter(inv => {
      if (!inv.lote?.fechaCaducidad) return false;
      const fechaCaducidad = new Date(inv.lote.fechaCaducidad);
      return fechaCaducidad <= fechaLimite && inv.cantidadActual > 0;
    });

    let vencidos = 0;
    let proximos = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const productos = productosFiltrados.map(inv => {
      const fechaCaducidad = new Date(inv.lote.fechaCaducidad);
      const diffTime = fechaCaducidad.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const estado = diasRestantes < 0 ? 'VENCIDO' : 'PROXIMO';
      if (estado === 'VENCIDO') vencidos++;
      else proximos++;

      const almacenTipoMap: Record<number, string> = {
        1: 'BODEGA',
        2: 'VENTAS',
        3: 'MERMAS',
        4: 'CADUCADOS',
        5: 'DONADOS',
        6: 'DESTRUCCION',
      };

      return {
        productoId: inv.productoId,
        nombre: inv.producto?.nombre || 'Sin nombre',
        loteId: inv.loteId,
        numeroLote: inv.lote?.numeroLote || 'N/A',
        fechaCaducidad: inv.lote?.fechaCaducidad,
        diasRestantes,
        cantidadActual: Number(inv.cantidadActual),
        almacenTipo: inv.almacenTipo,
        almacenNombre: almacenTipoMap[inv.almacenTipo] || 'DESCONOCIDO',
        estado,
      };
    });

    return {
      total: productos.length,
      vencidos,
      proximos,
      diasUmbral: dias,
      productos,
    };
  }
}
