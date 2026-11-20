import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { XMLParser } from 'fast-xml-parser';
import { Producto } from '../productos/entities/producto.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { OrdenCompra } from '../ordenes-compra/entities/orden-compra.entity';
import { DetalleOrdenCompra } from '../ordenes-compra/entities/detalle-orden-compra.entity';
import { Recepcion } from '../recepciones/entities/recepcion.entity';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { DetalleLoteService } from '../detalle-lote/detalle-lote.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { RecepcionesService } from '../recepciones/recepciones.service';
import { PresentacionesService } from '../productos/presentaciones.service';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { EmpaqueEstado } from '../common/enums/empaque-estado.enum';
import { TipoMovimiento } from '../common/constants';
import {
  CfdiPreviewDto,
  RecepcionConfirmadaDto,
  ConceptoDto,
} from './dto/procesar-recepcion.dto';

@Injectable()
export class CfdiService {
  constructor(
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private loteRepository: Repository<Lote>,
    @InjectRepository(Laboratorio)
    private laboratorioRepository: Repository<Laboratorio>,
    @InjectRepository(OrdenCompra)
    private ordenCompraRepository: Repository<OrdenCompra>,
    @InjectRepository(DetalleOrdenCompra)
    private detalleOrdenCompraRepository: Repository<DetalleOrdenCompra>,
    private inventarioAlmacenService: InventarioAlmacenService,
    private detalleLoteService: DetalleLoteService,
    private proveedoresService: ProveedoresService,
    private recepcionesService: RecepcionesService,
    private presentacionesService: PresentacionesService,
    private preciosLoteService: PreciosLoteService,
    private dataSource: DataSource,
  ) {}

  async parseXmlToPreview(xmlContent: string): Promise<CfdiPreviewDto> {
    try {
      const xml = this.removeXmlDeclaration(xmlContent);
      const preview = this.extractCfdiData(xml);
      return preview;
    } catch (error) {
      throw new BadRequestException(
        'XML inválido o estructura CFDI no reconocida: ' + error.message,
      );
    }
  }

  async procesarRecepcion(
    dto: RecepcionConfirmadaDto,
    userId: string,
  ): Promise<{
    laboratorio: { rfc: string; nombre: string; esNuevo: boolean };
    productosCreados: { nombre: string; codigoBarras: string }[];
    productosExistentes: { nombre: string; codigoBarras: string }[];
    mensaje: string;
    ordenCompraVinculada?: {
      folio: string;
      status: string;
      productosVinculados: number;
      productosNoVinculados: string[];
    };
  }> {
    const xmlContent = dto.xmlContent || '';
    const xml = this.removeXmlDeclaration(xmlContent);
    const cfdiData = this.extractCfdiData(xml);

    if (cfdiData.uuidCfdi) {
      const existente = await this.recepcionesService.findByUuid(
        cfdiData.uuidCfdi,
      );
      if (existente) {
        throw new BadRequestException(
          `El CFDI UUID ${cfdiData.uuidCfdi} ya fue procesado en la recepción ${existente.serie || ''}-${existente.folio || existente.id}`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const labResult = await this.processLaboratorio(cfdiData.emisor, manager);

      let proveedor = await this.proveedoresService.findByRfc(
        cfdiData.emisor.rfc,
      );
      if (!proveedor) {
        proveedor = await this.proveedoresService.create({
          nombre: cfdiData.emisor.nombre,
          rfc: cfdiData.emisor.rfc,
        });
      }

      const recepcionRepo = manager.getRepository(Recepcion);
      const recepcionEntity = recepcionRepo.create({
        serie: cfdiData.serie,
        folio: cfdiData.folio,
        fecha: cfdiData.fecha ? new Date(cfdiData.fecha) : undefined,
        emisorRfc: cfdiData.emisor.rfc,
        emisorNombre: cfdiData.emisor.nombre,
        subtotal: cfdiData.subtotal,
        total: cfdiData.total,
        proveedorId: proveedor.id,
        uuidCfdi: cfdiData.uuidCfdi || undefined,
        xmlContent: dto.xmlContent,
      });
      const recepcion = await recepcionRepo.save(recepcionEntity);

      const { productosCreados, productosExistentes, productoIdMap } =
        await this.processProductos(
          dto.productos || [],
          cfdiData.conceptos,
          userId,
          labResult.laboratorioId,
          cfdiData.serie,
          cfdiData.folio,
          recepcion.id,
          manager,
          cfdiData,
        );

      let ordenCompraVinculada:
        | {
            folio: string;
            status: string;
            productosVinculados: number;
            productosNoVinculados: string[];
          }
        | undefined;
      if (dto.ordenCompraId) {
        const productosVinculacion = (dto.productos || [])
          .filter((producto) => Number(producto.cantidad) > 0)
          .map((producto) => ({
            productoId:
              productoIdMap.get(producto.productoId) || producto.productoId,
            cantidad:
              Number(producto.cantidad) * (Number(producto.piezasPorCaja) || 1),
          }));

        ordenCompraVinculada = await this.vincularConOrdenCompra(
          dto.ordenCompraId,
          productosVinculacion,
          manager,
          cfdiData.emisor.rfc,
          proveedor.id,
        );
      }

      await queryRunner.commitTransaction();

      const mensaje = this.generarMensaje(
        labResult.esNuevo,
        cfdiData.emisor.rfc,
        cfdiData.emisor.nombre,
        productosCreados.length,
        productosExistentes.length,
      );

      return {
        laboratorio: {
          rfc: cfdiData.emisor.rfc,
          nombre: cfdiData.emisor.nombre,
          esNuevo: labResult.esNuevo,
        },
        productosCreados,
        productosExistentes,
        mensaje,
        ordenCompraVinculada,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error?.code === '23505') {
        throw new BadRequestException(
          `El CFDI UUID ${cfdiData.uuidCfdi || ''} ya fue recibido`,
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private removeXmlDeclaration(xml: string): string {
    return xml.replace(/<\?xml[^>]+\?>/g, '').trim();
  }

  private extractCfdiData(xml: string): CfdiPreviewDto & { uuidCfdi?: string } {
    // Normalizar formato SAT:
    // 1. Eliminar BOM si está presente
    let normalized = xml;
    if (normalized.charCodeAt(0) === 0xfeff) {
      normalized = normalized.slice(1);
    }
    // 2. Eliminar todos los newlines (pueden romper el parsing)
    normalized = normalized.replace(/[\n\r]+/g, ' ');
    // 3. Convertir formato SAT a XML estándar:
    //    SAT usa ="" para abrir atributos y "" para cerrar/representar comillas dentro
    //    Step A: ="" → =" (mantiene el =, solo elimina el "" redundante del opening)
    normalized = normalized.replace(/=""/g, '="');
    //    Step B: "" → " (convierte el closing pair o comillas literales a comilla simple)
    normalized = normalized.replace(/""/g, '"');

    const getValue = (pattern: RegExp): string => {
      const match = normalized.match(pattern);
      return match ? match[1] : '';
    };

    const serie = getValue(/Serie="([^"]+)"/);
    const folio = getValue(/Folio="([^"]+)"/);
    const fecha = getValue(/Fecha="([^"]+)"/);
    const subtotal = parseFloat(getValue(/SubTotal="([^"]+)"/)) || 0;
    const total = parseFloat(getValue(/\sTotal="([^"]+)"/)) || 0;

    const emisorRfc = getValue(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
    const emisorNombre = getValue(/<cfdi:Emisor[^>]*Nombre="([^"]+)"/);

    const uuidCfdi = getValue(/<tfd:TimbreFiscalDigital[^>]*UUID="([^"]+)"/i);

    const emisor = {
      rfc: emisorRfc,
      nombre: emisorNombre,
    };

    let objetoImp = '00';

    const conceptoMatches =
      normalized.match(/<cfdi:Concepto[^>]*>[\s\S]*?<\/cfdi:Concepto>/g) || [];

    const conceptos: ConceptoDto[] = conceptoMatches.map((conceptoXml) => {
      const cantidad =
        parseFloat(this.getXmlValue(conceptoXml, /Cantidad="([^"]+)"/)) || 0;
      const noIdentificacion =
        this.getXmlValue(conceptoXml, /NoIdentificacion="([^"]+)"/) || '';
      const descripcion =
        this.getXmlValue(conceptoXml, /Descripcion="([^"]+)"/) || '';
      const valorUnitario =
        parseFloat(this.getXmlValue(conceptoXml, /ValorUnitario="([^"]+)"/)) ||
        0;
      const claveProdServ =
        this.getXmlValue(conceptoXml, /ClaveProdServ="([^"]+)"/) || '';
      const claveUnidad =
        this.getXmlValue(conceptoXml, /ClaveUnidad="([^"]+)"/) || '';
      const unidad =
        this.getXmlValue(conceptoXml, /(?:^|\s)Unidad="([^"]+)"/) || '';

      const tasaMatch = conceptoXml.match(/TasaOCuota="([^"]+)"/);
      const tasaOcuota = tasaMatch ? parseFloat(tasaMatch[1]) : 0;
      const objImp = conceptoXml.match(/ObjetoImp="([^"]+)"/)?.[1] || '00';
      objetoImp = objImp;

      const tasaIva =
        objImp === '02' || objImp === '03'
          ? Math.round((Number(tasaOcuota) || 0) * 10000) / 100
          : 0;
      const ivaCfdi = tasaIva;

      return {
        cantidad,
        noIdentificacion,
        descripcion,
        valorUnitario,
        claveProdServ,
        claveUnidad,
        unidad,
        ivaCfdi,
        objetoImp: objImp,
        tasaIva,
      };
    });

    return {
      serie,
      folio,
      fecha,
      subtotal,
      total,
      emisor,
      conceptos,
      uuidCfdi,
      objetoImp,
    };
  }

  private getXmlValue(xml: string, pattern: RegExp): string {
    const match = xml.match(pattern);
    return match ? match[1] : '';
  }

  private async processLaboratorio(
    emisor: { rfc: string; nombre: string },
    manager?: EntityManager,
  ): Promise<{ laboratorioId: string; esNuevo: boolean }> {
    const repo = manager
      ? manager.getRepository(Laboratorio)
      : this.laboratorioRepository;

    let laboratorio = await repo.findOne({
      where: { rfc: emisor.rfc },
    });

    const esNuevo = !laboratorio;

    if (!laboratorio) {
      const nuevoLaboratorio = repo.create({
        nombre: emisor.nombre,
        rfc: emisor.rfc,
        statusId: 1,
      });
      laboratorio = await repo.save(nuevoLaboratorio);
    }

    return { laboratorioId: laboratorio.id, esNuevo };
  }

  private async processProductos(
    productosDto: {
      productoId: string;
      esNuevo: boolean;
      cantidad: number;
      numeroLote?: string;
      fechaCaducidad?: string;
      stockMinimo?: number;
      stockMaximo?: number;
      precioVenta?: number;
      precioVentaCaja?: number;
      precioVentaPieza?: number;
      margenRecomendado?: number;
      piezasPorCaja?: number;
    }[],
    conceptos: ConceptoDto[],
    userId: string,
    laboratorioId: string,
    serie: string,
    folio: string,
    recepcionId: string,
    manager: EntityManager,
    cfdiData: { objetoImp?: string; [key: string]: any },
  ): Promise<{
    productosCreados: { nombre: string; codigoBarras: string }[];
    productosExistentes: { nombre: string; codigoBarras: string }[];
    productoIdMap: Map<string, string>;
  }> {
    const productosCreados: { nombre: string; codigoBarras: string }[] = [];
    const productosExistentes: { nombre: string; codigoBarras: string }[] = [];
    const productoIdMap = new Map<string, string>();
    const productoRepo = manager.getRepository(Producto);

    for (const prodDto of productosDto) {
      const concepto = conceptos.find(
        (c) => c.noIdentificacion === prodDto.productoId,
      );
      const unidad = (concepto?.unidad || '').toUpperCase();
      const claveUnidad = (concepto?.claveUnidad || '').toUpperCase();
      const esCaja =
        ['CJA', 'XBX', 'XPK', 'XBG', 'XSA', 'XCA', 'XBA'].includes(unidad) ||
        ['XBX', 'CJA', 'XPK', 'XBG', 'XSA', 'XCA', 'XBA'].includes(claveUnidad);
      const factor = esCaja
        ? Number(prodDto.piezasPorCaja) ||
          this.presentacionesService.inferFactor(concepto?.descripcion) ||
          0
        : 1;
      if (esCaja && factor < 2) {
        throw new BadRequestException(
          `Indica las piezas por caja para ${concepto?.descripcion || prodDto.productoId}`,
        );
      }
      const cantidadBase = Number(prodDto.cantidad) * factor;
      const costoPieza = Number(concepto?.valorUnitario || 0) / factor;
      const precioPieza =
        prodDto.precioVentaPieza != null
          ? Number(prodDto.precioVentaPieza)
          : prodDto.precioVenta != null
            ? Number(prodDto.precioVenta)
            : null;
      const precioCaja = esCaja
        ? prodDto.precioVentaCaja != null
          ? Number(prodDto.precioVentaCaja)
          : precioPieza != null
            ? precioPieza * factor
            : null
        : null;

      const lote = await this.crearOLocalizarLote(
        prodDto.numeroLote ||
          `LOTE-${serie || 'X'}-${folio || '0'}-${prodDto.productoId}`,
        prodDto.fechaCaducidad,
        laboratorioId,
        recepcionId,
        manager,
      );

      let producto: Producto | null = null;

      producto = await productoRepo.findOne({
        where: { codigoBarras: prodDto.productoId },
      });

      const margenCalculado = this.calcularMargen(
        precioPieza ?? undefined,
        costoPieza,
      );
      const margenRecomendado =
        margenCalculado ??
        (prodDto.margenRecomendado != null
          ? Number(prodDto.margenRecomendado)
          : null);

      if (!producto) {
        producto = await this.crearNuevoProducto(
          concepto,
          prodDto,
          laboratorioId,
          manager,
          concepto?.objetoImp || cfdiData.objetoImp || '00',
          margenRecomendado,
        );
        productosCreados.push({
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
        });
      } else {
        if (esCaja) {
          await this.presentacionesService.validarRecepcionCaja(
            producto,
            factor,
            manager,
          );
        }
        // Actualizar impuestoAplicado en producto existente
        await productoRepo.update(producto.id, {
          impuestoAplicado: concepto?.objetoImp || cfdiData.objetoImp || '00',
          ...(esCaja
            ? {
                piezasPorCajaDefault: factor,
                empaqueEstado: EmpaqueEstado.CONVERTIDO,
                claveUnidad: 'H87',
              }
            : {}),
          ...(margenRecomendado != null ? { margenRecomendado } : {}),
        });
        productosExistentes.push({
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
        });
      }

      productoIdMap.set(prodDto.productoId, producto.id);

      let presentacionesRecepcion: ProductoPresentacion[] = [];
      if (esCaja) {
        lote.piezasPorCaja = factor;
        lote.empaqueConvertido = true;
        await manager.save(Lote, lote);
        producto.piezasPorCajaDefault = factor;
        producto.empaqueEstado = EmpaqueEstado.CONVERTIDO;
        producto.claveUnidad = 'H87';
        await productoRepo.save(producto);
        presentacionesRecepcion =
          await this.presentacionesService.ensurePresentations(
            producto.id,
            factor,
            manager,
          );
      }

      if (!esCaja) {
        const factorLote = Number(lote.piezasPorCaja) || 0;
        if (factorLote > 1) {
          throw new BadRequestException(
            `El lote ${lote.numeroLote} ya está configurado como caja; usa otro lote para recibir piezas`,
          );
        }
        lote.piezasPorCaja = 1;
        lote.empaqueConvertido = true;
        await manager.save(Lote, lote);
      }

      const inventario = await this.inventarioAlmacenService.agregarStock(
        producto.id,
        lote.id,
        AlmacenTipo.RECEPCION,
        cantidadBase,
        concepto?.ivaCfdi,
        costoPieza,
        manager,
        TipoMovimiento.ENTRADA_BODEGA,
        userId,
        precioPieza ?? undefined,
        esCaja
          ? `Recepción caja: ${prodDto.cantidad} × ${factor} = ${cantidadBase} piezas`
          : `Recepción pieza: ${cantidadBase} piezas`,
      );

      const presentaciones = presentacionesRecepcion.length
        ? presentacionesRecepcion
        : await this.presentacionesService.findByProducto(producto.id);
      const piezaPresentacion = presentaciones.find((p) => p.tipo === 'PIEZA');
      const cajaPresentacion = presentaciones.find((p) => p.tipo === 'CAJA');
      if (piezaPresentacion) {
        if (precioPieza != null && precioPieza > 0) {
          await this.preciosLoteService.setPrecio(
            {
              productoId: producto.id,
              loteId: lote.id,
              presentacionId: piezaPresentacion.id,
              precio: precioPieza,
              usuarioId: userId,
              motivo: 'Precio individual asignado en recepción',
            },
            manager,
          );
        } else {
          await this.preciosLoteService.clearPrecio(
            lote.id,
            piezaPresentacion.id,
            userId,
            'Precio individual pendiente en recepción',
            manager,
          );
        }
      }
      if (esCaja && cajaPresentacion) {
        if (precioCaja != null && precioCaja > 0) {
          await this.preciosLoteService.setPrecio(
            {
              productoId: producto.id,
              loteId: lote.id,
              presentacionId: cajaPresentacion.id,
              precio: precioCaja,
              usuarioId: userId,
              motivo: 'Precio de caja asignado en recepción',
            },
            manager,
          );
        } else {
          await this.preciosLoteService.clearPrecio(
            lote.id,
            cajaPresentacion.id,
            userId,
            'Precio de caja pendiente en recepción',
            manager,
          );
        }
        inventario.precioVentaCaja = precioCaja;
        await manager.getRepository(InventarioAlmacen).save(inventario);
      }

      await this.detalleLoteService.create(
        {
          productoId: producto.id,
          loteId: lote.id,
          cantidad: cantidadBase,
          precioUnitario: costoPieza,
          ivaCfdi: concepto?.ivaCfdi || null,
          movimientoId: inventario.ultimoMovimientoId || undefined,
          almacenTipo: AlmacenTipo.RECEPCION,
        },
        manager,
      );
    }

    return { productosCreados, productosExistentes, productoIdMap };
  }

  private calcularMargen(precioVenta?: number, costo?: number): number | null {
    const precio = Number(precioVenta);
    const costoUnitario = Number(costo);
    if (
      !Number.isFinite(precio) ||
      !Number.isFinite(costoUnitario) ||
      precio <= 0 ||
      costoUnitario <= 0
    ) {
      return null;
    }
    return Math.round((precio / costoUnitario - 1) * 10000) / 100;
  }

  private async crearNuevoProducto(
    concepto: ConceptoDto | undefined,
    prodDto: { productoId: string; stockMinimo?: number; stockMaximo?: number },
    laboratorioId: string,
    manager: EntityManager,
    impuestoAplicado: string = '00',
    margenRecomendado?: number | null,
  ): Promise<Producto> {
    const repo = manager.getRepository(Producto);
    const productoData: Partial<Producto> = {
      nombre: concepto?.descripcion || prodDto.productoId,
      codigoBarras: prodDto.productoId,
      descripcion: concepto?.descripcion || '',
      stockMinimo: prodDto.stockMinimo || 10,
      stockMaximo: prodDto.stockMaximo || 100,
      margenRecomendado: margenRecomendado ?? null,
      claveProdServ: concepto?.claveProdServ || undefined,
      claveUnidad: concepto?.claveUnidad || undefined,
      laboratorioId: laboratorioId,
      statusId: 1,
      impuestoAplicado: impuestoAplicado || '00',
    };
    const producto = repo.create(productoData);
    return repo.save(producto);
  }

  private async crearOLocalizarLote(
    numeroLote: string,
    fechaCaducidad: string | undefined,
    laboratorioId: string,
    recepcionId?: string,
    manager?: EntityManager,
  ): Promise<Lote> {
    const repo = manager ? manager.getRepository(Lote) : this.loteRepository;

    const loteExistente = await repo.findOne({
      where: { numeroLote, laboratorioId },
      lock: manager ? { mode: 'pessimistic_write' } : undefined,
    });

    if (loteExistente) {
      if (fechaCaducidad) {
        loteExistente.fechaCaducidad = new Date(fechaCaducidad);
        await repo.save(loteExistente);
      }
      return loteExistente;
    }

    const nuevoLote = repo.create({
      numeroLote: numeroLote,
      fechaCaducidad: fechaCaducidad
        ? new Date(fechaCaducidad)
        : (() => {
            throw new BadRequestException(
              'fechaCaducidad es requerida para crear el lote',
            );
          })(),
      laboratorioId: laboratorioId,
      recepcionId: recepcionId || undefined,
      statusId: 1,
    });
    return repo.save(nuevoLote);
  }

  private generarMensaje(
    esNuevoLaboratorio: boolean,
    laboratorioRfc: string,
    laboratorioNombre: string,
    cantidadProductosCreados: number,
    cantidadProductosExistentes: number,
  ): string {
    let mensaje = `Recepción procesada. `;

    if (esNuevoLaboratorio) {
      mensaje += `Nuevo laboratorio creado: ${laboratorioNombre} (${laboratorioRfc}). `;
    }

    if (cantidadProductosCreados > 0) {
      mensaje += `${cantidadProductosCreados} productos creados. `;
    }

    if (cantidadProductosExistentes > 0) {
      mensaje += `${cantidadProductosExistentes} productos ya existían. `;
    }

    return mensaje.trim();
  }

  private async vincularConOrdenCompra(
    ordenCompraId: string,
    productos: { productoId: string; cantidad: number }[],
    manager: EntityManager,
    emisorRfc: string,
    proveedorId: string,
  ): Promise<{
    folio: string;
    status: string;
    productosVinculados: number;
    productosNoVinculados: string[];
  }> {
    const ordenRepo = manager.getRepository(OrdenCompra);
    const detalleRepo = manager.getRepository(DetalleOrdenCompra);

    const orden = await ordenRepo.findOne({
      where: { id: ordenCompraId },
      relations: ['detalles'],
      lock: { mode: 'pessimistic_write' },
    });

    if (!orden) {
      throw new NotFoundException(
        `Orden de compra ${ordenCompraId} no encontrada`,
      );
    }

    if (orden.status === 'COMPLETADA') {
      throw new BadRequestException('La orden de compra ya está completada');
    }
    if (orden.status === 'CERRADA_PARCIAL') {
      throw new BadRequestException(
        'La orden de compra está cerrada con recepción parcial',
      );
    }
    if (orden.status === 'CANCELADA') {
      throw new BadRequestException('La orden de compra está cancelada');
    }

    if (orden.proveedorId !== proveedorId) {
      throw new BadRequestException(
        `El proveedor del CFDI no coincide con el proveedor de la orden de compra. ` +
          `OC: ${orden.proveedorId || 'N/A'}, CFDI: ${proveedorId}`,
      );
    }

    const detallesMap = new Map(orden.detalles.map((d) => [d.productoId, d]));

    let productosVinculados = 0;
    const productosNoVinculados: string[] = [];
    for (const producto of productos) {
      const detalle = detallesMap.get(producto.productoId);
      if (!detalle) {
        productosNoVinculados.push(producto.productoId);
        continue;
      }

      const nuevaRecibida = detalle.cantidadRecibida + producto.cantidad;
      if (nuevaRecibida > detalle.cantidad) {
        throw new BadRequestException(
          `Cantidad recibida (${nuevaRecibida}) excede la cantidad ordenada (${detalle.cantidad}) para el detalle del producto`,
        );
      }

      await detalleRepo.update(detalle.id, {
        cantidadRecibida: nuevaRecibida,
      });
      productosVinculados++;
    }

    const ordenActualizada = await ordenRepo.findOne({
      where: { id: ordenCompraId },
      relations: ['detalles'],
      lock: { mode: 'pessimistic_write' },
    });

    if (!ordenActualizada) {
      throw new NotFoundException(
        `Orden de compra ${ordenCompraId} no encontrada al actualizar`,
      );
    }

    const todosCompletados = ordenActualizada.detalles.every(
      (d) => d.cantidadRecibida >= d.cantidad,
    );

    const statusActual = ordenActualizada.status;
    if (todosCompletados) {
      ordenActualizada.status = 'COMPLETADA';
      await ordenRepo.save(ordenActualizada);
    } else if (ordenActualizada.status === 'BORRADOR') {
      ordenActualizada.status = 'PENDIENTE';
      await ordenRepo.save(ordenActualizada);
    }

    return {
      folio: orden.folio,
      status: todosCompletados
        ? 'COMPLETADA'
        : statusActual === 'BORRADOR'
          ? 'PENDIENTE'
          : statusActual,
      productosVinculados,
      productosNoVinculados,
    };
  }

  async validarXml(
    xmlContent: string,
  ): Promise<{ valido: boolean; errores: string[] }> {
    const errores: string[] = [];

    if (!xmlContent || xmlContent.trim() === '') {
      errores.push('El archivo XML está vacío');
      return { valido: false, errores };
    }

    if (!xmlContent.includes('cfdi:Comprobante')) {
      errores.push('No es un archivo CFDI válido');
    }

    if (!xmlContent.includes('cfdi:Conceptos')) {
      errores.push('El CFDI no contiene conceptos (productos)');
    }

    try {
      const emisorMatch = xmlContent.match(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
      if (!emisorMatch) {
        errores.push('No se encontró el RFC del emisor');
      }
    } catch {
      errores.push('Error al parsear datos del emisor');
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }
}
