import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ChangeLoteDto } from './dto/change-lote.dto';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
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

  async changeLote(
    id: string,
    changeLoteDto: ChangeLoteDto,
  ): Promise<Producto> {
    throw new Error('El campo loteId ya no existe en productos. Use inventario_almacen para gestionar lotes.');
  }

  async remove(id: string): Promise<void> {
    const producto = await this.findOne(id);
    await this.productosRepository.remove(producto);
  }

  async updateStock(id: string, newStock: number): Promise<Producto> {
    throw new Error('El campo stock ya no existe en productos. Use inventario_almacen para gestionar stock.');
  }

  async checkExistence(
    codigosBarras: string[],
  ): Promise<{ codigoBarras: string; existe: boolean; nombre?: string }[]> {
    const productos = await this.productosRepository
      .createQueryBuilder('producto')
      .where('producto.codigoBarras IN (:...codigosBarras)')
      .setParameter('codigosBarras', codigosBarras)
      .select(['producto.codigoBarras', 'producto.nombre'])
      .getMany();

    return codigosBarras.map((codigo) => {
      const existente = productos.find((p) => p.codigoBarras === codigo);
      return {
        codigoBarras: codigo,
        existe: !!existente,
        nombre: existente?.nombre,
      };
    });
  }
}
