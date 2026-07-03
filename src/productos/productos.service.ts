import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
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
        statusId: dto.statusId ?? 1,
      });
      const savedProducto = await productoRepo.save(producto);

      const lote = loteRepo.create({
        numeroLote: dto.numeroLote,
        fechaCaducidad,
        laboratorioId: dto.laboratorioId,
      });
      const savedLote = await loteRepo.save(lote);

      await this.inventarioService.agregarStock(
        savedProducto.id,
        savedLote.id,
        AlmacenTipo.VENTAS,
        dto.cantidad,
        dto.ivaCfdi ?? 0,
        dto.precioUnitarioLote,
        manager,
        'ENTRADA_INICIAL',
        userId,
      );

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
      relations: ['laboratorio'],
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
      tieneInventario: boolean;
    }[]
  > {
    const productos = await this.productosRepository
      .createQueryBuilder('producto')
      .where('producto.codigoBarras IN (:...codigosBarras)')
      .setParameter('codigosBarras', codigosBarras)
      .select(['producto.codigoBarras', 'producto.nombre', 'producto.id'])
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
        tieneInventario: existente ? inventorySet.has(existente.id) : false,
      };
    });
  }
}
