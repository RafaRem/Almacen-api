import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

@Injectable()
export class InventarioAlmacenService {
  constructor(
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
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
    almacenTipoDestino: AlmacenTipo,
  ): Promise<{ успешно: boolean; mensaje: string }> {
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
      };
    }

    let restante = cantidad;
    for (const inv of inventarios) {
      if (restante <= 0) break;

      const disponible = Number(inv.cantidadActual);
      const aTransferir = Math.min(disponible, restante);

      inv.cantidadActual -= aTransferir;
      await this.inventarioRepository.save(inv);

      await this.agregarStock(productoId, inv.loteId, almacenTipoDestino, aTransferir);

      restante -= aTransferir;
    }

    return {
      успешно: true,
      mensaje: `Transferido ${cantidad} unidades usando FIFO`,
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
}
