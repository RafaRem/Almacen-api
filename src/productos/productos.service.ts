import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { PresentacionesService } from './presentaciones.service';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import { EmpaqueEstado } from '../common/enums/empaque-estado.enum';
import { PresentacionTipo } from '../common/enums/presentacion-tipo.enum';
import { CreateProductoDto } from './dto/create-producto.dto';
import { CreateProductoConStockDto } from './dto/create-producto-con-stock.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    private inventarioService: InventarioAlmacenService,
    private presentacionesService: PresentacionesService,
    private preciosLoteService: PreciosLoteService,
  ) {}

  async create(createProductoDto: CreateProductoDto): Promise<Producto> {
    const existingProducto = await this.productosRepository.findOne({
      where: { codigoBarras: createProductoDto.codigoBarras },
    });

    if (existingProducto) {
      throw new ConflictException(
        'Producto with this codigoBarras already exists',
      );
    }

    const producto = this.productosRepository.create(createProductoDto);
    return this.productosRepository.save(producto);
  }

  async createConStock(
    dto: CreateProductoConStockDto,
    userId?: string,
  ): Promise<Producto> {
    const existingProducto = await this.productosRepository.findOne({
      where: { codigoBarras: dto.codigoBarras },
    });

    if (existingProducto) {
      throw new ConflictException(
        'Producto with this codigoBarras already exists',
      );
    }

    const fechaCaducidad = dto.fechaCaducidad
      ? new Date(dto.fechaCaducidad)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const factorNumero =
      dto.piezasPorCaja == null ? 1 : Number(dto.piezasPorCaja);
    if (!Number.isInteger(factorNumero) || factorNumero < 1) {
      throw new BadRequestException(
        'Las piezas por caja deben ser un entero mayor o igual a 1',
      );
    }
    const tieneCaja = factorNumero > 1;
    if (!tieneCaja && dto.precioVentaCaja != null) {
      throw new BadRequestException(
        'Define un factor mayor a 1 para asignar precio de caja',
      );
    }

    const round2 = (value: number) =>
      Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    const precioPiezaBase =
      dto.precioVentaPieza == null ? null : Number(dto.precioVentaPieza);
    const precioCajaBase =
      dto.precioVentaCaja == null ? null : Number(dto.precioVentaCaja);
    if (
      (precioPiezaBase != null &&
        (!Number.isFinite(precioPiezaBase) || precioPiezaBase < 0)) ||
      (precioCajaBase != null &&
        (!Number.isFinite(precioCajaBase) || precioCajaBase < 0))
    ) {
      throw new BadRequestException('Precio de venta inválido');
    }
    const precioVentaPieza =
      precioPiezaBase ??
      (tieneCaja && precioCajaBase != null
        ? round2(precioCajaBase / factorNumero)
        : null);
    const precioVentaCaja = tieneCaja
      ? (precioCajaBase ??
        (precioPiezaBase != null
          ? round2(precioPiezaBase * factorNumero)
          : null))
      : null;

    return this.productosRepository.manager.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const loteRepo = manager.getRepository(Lote);

      const producto = productoRepo.create({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        codigoBarras: dto.codigoBarras,
        laboratorioId: dto.laboratorioId,
        stockMinimo: dto.stockMinimo ?? 10,
        stockMaximo: dto.stockMaximo ?? 100,
        margenRecomendado: dto.margenRecomendado ?? null,
        piezasPorCajaDefault: factorNumero,
        empaqueEstado: tieneCaja
          ? EmpaqueEstado.CONVERTIDO
          : EmpaqueEstado.FACTOR_ASIGNADO,
        claveProdServ: dto.claveProdServ?.trim() || '',
        claveUnidad: dto.claveUnidad?.trim().toUpperCase() || 'H87',
        impuestoAplicado: Number(dto.ivaCfdi) > 0 ? '01' : '00',
        statusId: dto.statusId ?? 1,
      });
      const savedProducto = await productoRepo.save(producto);

      const lote = loteRepo.create({
        numeroLote: dto.numeroLote,
        fechaCaducidad,
        laboratorioId: dto.laboratorioId,
        piezasPorCaja: tieneCaja ? factorNumero : null,
        empaqueConvertido: tieneCaja,
      });
      const savedLote = await loteRepo.save(lote);

      const inventario = await this.inventarioService.agregarStock(
        savedProducto.id,
        savedLote.id,
        AlmacenTipo.VENTAS,
        dto.cantidad,
        dto.ivaCfdi ?? 0,
        dto.precioUnitarioLote,
        manager,
        'ENTRADA_INICIAL',
        userId,
        precioVentaPieza ?? undefined,
      );

      if (precioVentaCaja != null) {
        inventario.precioVentaCaja = precioVentaCaja;
        await manager.getRepository(InventarioAlmacen).save(inventario);
      }

      const presentaciones =
        await this.presentacionesService.ensurePresentations(
          savedProducto.id,
          factorNumero,
          manager,
        );
      const piezaPresentacion = presentaciones.find(
        (presentacion) => presentacion.tipo === PresentacionTipo.PIEZA,
      );
      const cajaPresentacion = presentaciones.find(
        (presentacion) => presentacion.tipo === PresentacionTipo.CAJA,
      );

      if (piezaPresentacion && precioVentaPieza != null) {
        await this.preciosLoteService.setPrecio(
          {
            productoId: savedProducto.id,
            loteId: savedLote.id,
            presentacionId: piezaPresentacion.id,
            precio: precioVentaPieza,
            motivo: 'Precio inicial de venta por pieza',
          },
          manager,
        );
      }
      if (cajaPresentacion && precioVentaCaja != null) {
        await this.preciosLoteService.setPrecio(
          {
            productoId: savedProducto.id,
            loteId: savedLote.id,
            presentacionId: cajaPresentacion.id,
            precio: precioVentaCaja,
            motivo: 'Precio inicial de venta por caja',
          },
          manager,
        );
      }

      return savedProducto;
    });
  }

  async findAll(): Promise<Producto[]> {
    return this.productosRepository.find({
      relations: ['laboratorio'],
    });
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id },
      relations: ['laboratorio', 'presentaciones'],
    });
    if (!producto) {
      throw new NotFoundException(`Producto with ID ${id} not found`);
    }
    return producto;
  }

  async findByCodigoBarras(codigo: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { codigoBarras: codigo },
      relations: ['laboratorio'],
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto with codigoBarras ${codigo} not found`,
      );
    }
    return producto;
  }

  async findByNombre(nombre: string): Promise<Producto[]> {
    return this.productosRepository.find({
      where: { nombre: Like(`%${nombre}%`) },
      relations: ['laboratorio'],
    });
  }

  async update(
    id: string,
    updateProductoDto: UpdateProductoDto,
  ): Promise<Producto> {
    const producto = await this.findOne(id);

    if (
      updateProductoDto.codigoBarras &&
      updateProductoDto.codigoBarras !== producto.codigoBarras
    ) {
      const existingProducto = await this.productosRepository.findOne({
        where: { codigoBarras: updateProductoDto.codigoBarras },
      });
      if (existingProducto) {
        throw new ConflictException(
          'Producto with this codigoBarras already exists',
        );
      }
    }

    const margenAnterior = producto.margenRecomendado;

    Object.assign(producto, updateProductoDto);
    if (updateProductoDto.claveProdServ !== undefined) {
      producto.claveProdServ = updateProductoDto.claveProdServ?.trim() || '';
    }
    if (updateProductoDto.claveUnidad !== undefined) {
      producto.claveUnidad =
        updateProductoDto.claveUnidad?.trim().toUpperCase() || '';
    }
    const savedProducto = await this.productosRepository.save(producto);

    if (
      updateProductoDto.margenRecomendado !== undefined &&
      updateProductoDto.margenRecomendado !== margenAnterior
    ) {
      const inventarios = await this.inventarioService.findByProducto(id);
      for (const inv of inventarios) {
        await this.inventarioService.actualizarPrecioVenta(inv);
      }
    }

    return savedProducto;
  }

  async remove(id: string): Promise<void> {
    const producto = await this.findOne(id);
    await this.productosRepository.remove(producto);
  }

  async updateStock(id: string, newStock: number): Promise<Producto> {
    throw new Error(
      'El campo stock ya no existe en productos. Use inventario_almacen para gestionar stock.',
    );
  }

  async checkExistence(codigosBarras: string[]): Promise<
    {
      codigoBarras: string;
      existe: boolean;
      nombre?: string;
      margenRecomendado?: number | null;
      piezasPorCajaDefault?: number | null;
      tieneInventario: boolean;
    }[]
  > {
    const productos = await this.productosRepository
      .createQueryBuilder('producto')
      .where('producto.codigoBarras IN (:...codigosBarras)')
      .setParameter('codigosBarras', codigosBarras)
      .select([
        'producto.codigoBarras',
        'producto.nombre',
        'producto.id',
        'producto.margenRecomendado',
        'producto.piezasPorCajaDefault',
      ])
      .getMany();

    const inventorySet = new Set<string>();
    if (productos.length > 0) {
      const ids = productos.map((p) => p.id);
      const inventoryRows = await this.productosRepository.manager
        .createQueryBuilder()
        .select('inv."productoId"')
        .from('inventario_almacen', 'inv')
        .where('inv."productoId" IN (:...ids)', { ids })
        .groupBy('inv."productoId"')
        .getRawMany();
      inventoryRows.forEach((r) => inventorySet.add(r.productoId));
    }

    return codigosBarras.map((codigo) => {
      const existente = productos.find((p) => p.codigoBarras === codigo);
      return {
        codigoBarras: codigo,
        existe: !!existente,
        nombre: existente?.nombre,
        margenRecomendado: existente?.margenRecomendado ?? null,
        piezasPorCajaDefault: existente?.piezasPorCajaDefault ?? null,
        tieneInventario: existente ? inventorySet.has(existente.id) : false,
      };
    });
  }
}
