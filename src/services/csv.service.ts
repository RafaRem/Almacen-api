import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import * as Papa from 'papaparse';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { Recepcion } from '../recepciones/entities/recepcion.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { TipoMovimiento } from '../common/constants';
import { DetalleLoteService } from '../detalle-lote/detalle-lote.service';

export interface CsvFilaValidada {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  claveUnidad: string;
  claveProdServ?: string;
  laboratorioId?: string;
  proveedor?: string;
  impuestoAplicado: string;
}

export interface CsvProcesamientoResultado {
  success: boolean;
  mensaje: string;
  estadisticas: {
    totalFilas: number;
    validas: number;
    invalidas: number;
    productosCreados: number;
    productosActualizados: number;
    productosDuplicadosEnCsv: number;
    lotesCreados: number;
    inventarioEntradas: number;
    distribucionImpuestos: { '00': number; '01': number };
  };
  errores: { fila: number; mensaje: string }[];
  advertencia?: string;
}

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(Laboratorio)
    private readonly laboratorioRepository: Repository<Laboratorio>,
    @InjectRepository(Recepcion)
    private readonly recepcionRepository: Repository<Recepcion>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
    private readonly inventarioService: InventarioAlmacenService,
    private readonly detalleLoteService: DetalleLoteService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Analiza un archivo CSV y devuelve una preview con validación
   */
  async parseCsv(file: any): Promise<{
    totalFilas: number;
    filasValidadas: CsvFilaValidada[];
    errores: { fila: number; mensaje: string }[];
    distribucionImpuestos: { '00': number; '01': number };
  }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No se recibió archivo');
    }

    const content = file.buffer.toString('utf-8');
    const results: any = Papa.parse(content, {
      header: true,
      dynamicTitle: true,
      skipEmptyLines: true,
    });

    const errores: { fila: number; mensaje: string }[] = [];
    const filasValidadas: CsvFilaValidada[] = [];
    const distribucionImpuestos: { '00': number; '01': number } = { '00': 0, '01': 0 };
    const seenCodigos = new Set<string>();

    // Helper para acceso case-insensitive a headers CSV
    const getVal = (row: any, key: string): string => {
      const k = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      return k ? (row[k] || '').toString().trim() : '';
    };

    for (let i = 0; i < results.data.length; i++) {
      const fila = results.data[i];
      const filaNum = i + 2;

      const noIdentificacion = getVal(fila, 'NoIdentificacion');
      const descripcion = getVal(fila, 'Descripcion');
      const cantidadStr = getVal(fila, 'Cantidad');
      const valorUnitarioStr = getVal(fila, 'ValorUnitario');

      if (!noIdentificacion) {
        errores.push({ fila: filaNum, mensaje: `Fila ${filaNum}: NoIdentificacion obligatorio` });
        continue;
      }

      if (seenCodigos.has(noIdentificacion)) {
        errores.push({
          fila: filaNum,
          mensaje: `Fila ${filaNum}: NoIdentificacion duplicado en CSV (${noIdentificacion})`,
        });
        continue;
      }

      if (!descripcion) {
        errores.push({ fila: filaNum, mensaje: `Fila ${filaNum}: Descripcion obligatorio` });
        continue;
      }

      const cantidad = Number(cantidadStr.replace(/[,$]/g, ''));
      if (!cantidadStr || isNaN(cantidad) || cantidad <= 0) {
        errores.push({ fila: filaNum, mensaje: `Fila ${filaNum}: Cantidad inválida (debe ser > 0)` });
        continue;
      }

      const precio = Number(valorUnitarioStr.replace(/[$,]/g, ''));
      if (!valorUnitarioStr || isNaN(precio)) {
        errores.push({ fila: filaNum, mensaje: `Fila ${filaNum}: ValorUnitario inválido` });
        continue;
      }

      const impuestoAplicado = this.mapearImpuesto(getVal(fila, 'ObjetoImp'));
      distribucionImpuestos[impuestoAplicado]++;

      seenCodigos.add(noIdentificacion);

      filasValidadas.push({
        productoId: noIdentificacion,
        nombre: descripcion,
        cantidad,
        precio,
        claveUnidad: this.mapearUnidad(getVal(fila, 'Unidad')),
        claveProdServ: getVal(fila, 'ClaveProdServ') || undefined,
        laboratorioId: getVal(fila, 'Departamento') || undefined,
        proveedor: getVal(fila, 'Proveedor') || undefined,
        impuestoAplicado,
      });
    }

    return {
      totalFilas: results.data.length,
      filasValidadas,
      errores,
      distribucionImpuestos,
    };
  }

  /**
   * Procesa un archivo CSV: persiste productos, lotes, inventario con trazabilidad.
   */
  async procesarCsv(
    file: any,
    userId: string,
    productosFrontend: any[] = []  // Opcional: datos del frontend (lote, caducidad, stock, etc.)
  ): Promise<CsvProcesamientoResultado> {
    const preview = await this.parseCsv(file);

    const distribucionImpuestos = { ...preview.distribucionImpuestos };
    const estadisticas: CsvProcesamientoResultado['estadisticas'] = {
      totalFilas: preview.totalFilas,
      validas: preview.filasValidadas.length,
      invalidas: preview.errores.length,
      productosCreados: 0,
      productosActualizados: 0,
      productosDuplicadosEnCsv: 0,
      lotesCreados: 0,
      inventarioEntradas: 0,
      distribucionImpuestos,
    };

    if (preview.errores.length > 0 && preview.filasValidadas.length === 0) {
      return {
        success: false,
        mensaje: `CSV con ${preview.errores.length} errores. Ninguna fila válida.`,
        estadisticas,
        errores: preview.errores,
      };
    }

    const codigosBarras = preview.filasValidadas.map((f) => f.productoId);
    const productosExistentes = await this.productoRepository.find({
      where: { codigoBarras: In(codigosBarras) },
    });
    const productosExistentesMap = new Map(
      productosExistentes.map((p) => [p.codigoBarras, p]),
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let recepcionId: string | undefined;

    try {
      const manager = queryRunner.manager;
      const productoRepo = manager.getRepository(Producto);
      const loteRepo = manager.getRepository(Lote);
      const labRepo = manager.getRepository(Laboratorio);
      const recepcionRepo = manager.getRepository(Recepcion);

      // Resolver el proveedor principal del CSV (primer fila con proveedor)
      const primerProveedorNombre = preview.filasValidadas.find((f) => f.proveedor?.trim())?.proveedor;
      const proveedorPrincipal = await this.resolverProveedor(primerProveedorNombre, manager);

      const recepcion = recepcionRepo.create({
        serie: 'CSV',
        folio: `CSV-${Date.now()}`,
        fecha: new Date(),
        emisorRfc: 'CSV-IMPORT',
        emisorNombre: 'Importación CSV',
        subtotal: preview.filasValidadas.reduce((s, f) => s + f.precio * f.cantidad, 0),
        total: preview.filasValidadas.reduce((s, f) => s + f.precio * f.cantidad, 0),
        proveedorId: proveedorPrincipal?.id || undefined,
        uuidCfdi: undefined,
        xmlContent: '',
      });
      const recepcionGuardada = await recepcionRepo.save(recepcion);
      recepcionId = recepcionGuardada.id;

      // Crear mapa de productos del frontend para acceso rápido
      const productosFrontendMap = new Map(
        productosFrontend.map((p) => [p.productoId, p])
      );

      for (const fila of preview.filasValidadas) {
        const frontendData = productosFrontendMap.get(fila.productoId);

        // Resolver laboratorio por fila (default "Importación CSV" si no trae Departamento)
        const laboratorioIdFila = await this.resolverLaboratorio(fila.laboratorioId, manager);
        // Resolver proveedor por fila (null si no trae Proveedor)
        const proveedorFila = await this.resolverProveedor(fila.proveedor, manager);
        
        let producto: Producto | null = productosExistentesMap.get(fila.productoId) || null;

        if (producto) {
          const updateData: Partial<Producto> = {
            impuestoAplicado: fila.impuestoAplicado,
            nombre: fila.nombre,
            claveUnidad: fila.claveUnidad,
            claveProdServ: fila.claveProdServ || producto.claveProdServ,
          };
          // Asociar proveedor solo si el producto no tiene uno asignado y el CSV trae uno
          if (!producto.proveedorPreferidoId && proveedorFila) {
            updateData.proveedorPreferidoId = proveedorFila.id;
          }
          await productoRepo.update(producto.id, updateData);
          const actualizado = await productoRepo.findOne({ where: { id: producto.id } });
          if (!actualizado) throw new Error('Producto desapareció durante update');
          producto = actualizado;
          estadisticas.productosActualizados++;
        } else {
          const nuevoProducto = productoRepo.create({
            codigoBarras: fila.productoId,
            nombre: fila.nombre,
            descripcion: fila.nombre,
            claveUnidad: fila.claveUnidad,
            claveProdServ: fila.claveProdServ,
            laboratorioId: laboratorioIdFila,
            proveedorPreferidoId: proveedorFila?.id || undefined,
            stockMinimo: frontendData?.stockMinimo ?? 10,
            stockMaximo: frontendData?.stockMaximo ?? 100,
            statusId: 1,
            impuestoAplicado: fila.impuestoAplicado,
          });
          producto = await productoRepo.save(nuevoProducto);
          estadisticas.productosCreados++;
        }

        const numeroLote = frontendData?.numeroLote ?? `CSV-${recepcionId}-${fila.productoId}`;
        let lote: Lote | null = await loteRepo.findOne({ where: { numeroLote } });

        if (!lote) {
          const fechaCaducidad = frontendData?.fechaCaducidad
            ? new Date(frontendData.fechaCaducidad)
            : (() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 1);
                return d;
              })();
          const nuevoLote = loteRepo.create({
            numeroLote,
            fechaCaducidad,
            laboratorioId: laboratorioIdFila,
            recepcionId,
            statusId: 1,
          });
          lote = await loteRepo.save(nuevoLote);
          estadisticas.lotesCreados++;
        } else if (frontendData?.fechaCaducidad && lote.fechaCaducidad !== new Date(frontendData.fechaCaducidad)) {
          lote.fechaCaducidad = new Date(frontendData.fechaCaducidad);
          await loteRepo.save(lote);
        }

        const ivaCfdi = fila.impuestoAplicado === '01' ? 16 : 0;

        const inventario = await this.inventarioService.agregarStock(
          producto.id,
          lote.id,
          AlmacenTipo.RECEPCION,
          fila.cantidad,
          ivaCfdi,
          fila.precio,
          manager,
          TipoMovimiento.ENTRADA_BODEGA,
          userId,
        );

        await this.detalleLoteService.create(
          {
            productoId: producto.id,
            loteId: lote.id,
            cantidad: fila.cantidad,
            precioUnitario: fila.precio,
            ivaCfdi,
            movimientoId: inventario.ultimoMovimientoId || undefined,
            almacenTipo: AlmacenTipo.RECEPCION,
          },
          manager,
        );

        estadisticas.inventarioEntradas++;
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `CSV procesado: ${estadisticas.productosCreados} creados, ${estadisticas.productosActualizados} actualizados, ${estadisticas.inventarioEntradas} entradas de inventario`,
      );

      const mensaje = `CSV procesado: ${estadisticas.productosCreados} productos creados, ${estadisticas.productosActualizados} actualizados, ${estadisticas.inventarioEntradas} entradas de inventario`;

      return {
        success: true,
        mensaje,
        estadisticas,
        errores: preview.errores,
        advertencia:
          preview.errores.length > 0
            ? `${preview.errores.length} filas omitidas por errores`
            : undefined,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error procesando CSV: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Error al procesar CSV: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private mapearImpuesto(objetoImp: any): '00' | '01' {
    const val = String(objetoImp || '').trim();
    if (val === '16' || val === '01') return '01';
    if (val === '0' || val === '00' || val === '') return '00';
    return '00';
  }

  private async resolverLaboratorio(
    nombre: string | undefined,
    manager: EntityManager,
  ): Promise<string> {
    const labRepo = manager.getRepository(Laboratorio);
    const nombreLab = nombre?.trim() || 'Importación CSV';

    let laboratorio = await labRepo.findOne({
      where: { nombre: nombreLab },
    });
    if (!laboratorio) {
      laboratorio = labRepo.create({
        nombre: nombreLab,
        statusId: 1,
      });
      laboratorio = await labRepo.save(laboratorio);
      this.logger.log(`Nuevo laboratorio creado desde CSV: ${nombreLab}`);
    }
    return laboratorio.id;
  }

  private async resolverProveedor(
    nombre: string | undefined,
    manager: EntityManager,
  ): Promise<Proveedor | null> {
    if (!nombre?.trim()) return null;
    const repo = manager.getRepository(Proveedor);
    const nombreProv = nombre.trim();

    let proveedor = await repo.findOne({ where: { nombre: nombreProv } });
    if (!proveedor) {
      proveedor = repo.create({ nombre: nombreProv, statusId: 1 });
      proveedor = await repo.save(proveedor);
      this.logger.log(`Nuevo proveedor creado desde CSV: ${nombreProv}`);
    }
    return proveedor;
  }

  private mapearUnidad(unidad: any): string {
    if (!unidad) return 'H87';
    const u = String(unidad).trim().toUpperCase();
    const map: Record<string, string> = {
      UNIDAD: 'H87',
      H87: 'H87',
      KGM: 'KGM',
      KG: 'KGM',
      LTR: 'LTR',
      LT: 'LTR',
      PZAS: 'PZAS',
      PZA: 'PZAS',
      GR: 'GR',
      ML: 'ML',
    };
    return map[u] || 'H87';
  }
}
